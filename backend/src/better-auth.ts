import { createHash, randomUUID } from "node:crypto";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import type { OAuth2Tokens } from "better-auth/oauth2";
import { genericOAuth, type GenericOAuthConfig } from "better-auth/plugins";
import { ProxyAgent } from "undici";
import { config } from "./config";
import { getDatabase } from "./db";
import {
  DB_ACCOUNT_COLLECTION_NAME,
  DB_SESSION_COLLECTION_NAME,
  DB_USER_COLLECTION_NAME,
  DB_VERIFICATION_COLLECTION_NAME,
  getDbAccounts,
} from "./database/collections/auth";
import { hashPassword, verifyPassword } from "./password";

const CREDENTIAL_ISSUER = "local:credential";

type TokenPayload = {
  code?: unknown;
  msg?: unknown;
  error?: unknown;
  error_description?: unknown;
  access_token?: unknown;
  refresh_token?: unknown;
  expires_in?: unknown;
  refresh_token_expires_in?: unknown;
  scope?: unknown;
  id_token?: unknown;
};

type FeishuProfilePayload = {
  code?: unknown;
  msg?: unknown;
  data?: {
    union_id?: unknown;
    open_id?: unknown;
    name?: unknown;
    en_name?: unknown;
    avatar_url?: unknown;
  };
};

type GoogleProfilePayload = {
  sub?: unknown;
  email?: unknown;
  email_verified?: unknown;
  name?: unknown;
  picture?: unknown;
};

const googleProxyAgent = config.GOOGLE_PROXY_URL
  ? new ProxyAgent(config.GOOGLE_PROXY_URL)
  : undefined;

function providerFetch(
  url: string,
  init: RequestInit,
  dispatcher?: ProxyAgent,
): Promise<Response> {
  if (!dispatcher) return fetch(url, init);
  return fetch(url, {
    ...init,
    dispatcher,
  } as RequestInit & { dispatcher: ProxyAgent });
}

function tokenExpiry(seconds: unknown): Date | undefined {
  return typeof seconds === "number" && Number.isFinite(seconds)
    ? new Date(Date.now() + seconds * 1000)
    : undefined;
}

function mapTokens(payload: TokenPayload): OAuth2Tokens {
  if (typeof payload.access_token !== "string" || !payload.access_token)
    throw new Error("OAuth provider did not return an access token");
  return {
    accessToken: payload.access_token,
    refreshToken:
      typeof payload.refresh_token === "string"
        ? payload.refresh_token
        : undefined,
    accessTokenExpiresAt: tokenExpiry(payload.expires_in),
    refreshTokenExpiresAt: tokenExpiry(payload.refresh_token_expires_in),
    scopes:
      typeof payload.scope === "string"
        ? payload.scope.split(/\s+/).filter(Boolean)
        : undefined,
    idToken:
      typeof payload.id_token === "string" ? payload.id_token : undefined,
    raw: payload,
  };
}

async function getGoogleToken({
  code,
  codeVerifier,
}: {
  code: string;
  redirectURI: string;
  codeVerifier?: string;
}): Promise<OAuth2Tokens> {
  const response = await providerFetch(
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.GOOGLE_CLIENT_ID,
        client_secret: config.GOOGLE_CLIENT_SECRET,
        redirect_uri: config.GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
        ...(codeVerifier ? { code_verifier: codeVerifier } : {}),
      }),
      signal: AbortSignal.timeout(10000),
    },
    googleProxyAgent,
  );
  const payload = (await response
    .json()
    .catch(() => null)) as TokenPayload | null;
  if (!response.ok || !payload)
    throw new Error(
      typeof payload?.error_description === "string"
        ? payload.error_description
        : "Google token exchange failed",
    );
  return mapTokens(payload);
}

async function getGoogleUserInfo(tokens: OAuth2Tokens) {
  if (!tokens.accessToken) return null;
  const response = await providerFetch(
    "https://openidconnect.googleapis.com/v1/userinfo",
    {
      headers: { authorization: `Bearer ${tokens.accessToken}` },
      signal: AbortSignal.timeout(10000),
    },
    googleProxyAgent,
  );
  const profile = (await response
    .json()
    .catch(() => null)) as GoogleProfilePayload | null;
  if (
    !response.ok ||
    !profile ||
    typeof profile.sub !== "string" ||
    typeof profile.email !== "string" ||
    profile.email_verified !== true
  )
    return null;
  return {
    id: profile.sub,
    email: profile.email.toLowerCase(),
    emailVerified: true,
    name:
      typeof profile.name === "string" && profile.name.trim()
        ? profile.name.trim()
        : profile.email.split("@")[0],
    image: typeof profile.picture === "string" ? profile.picture : undefined,
  };
}

async function getFeishuToken({
  code,
  redirectURI,
  codeVerifier,
}: {
  code: string;
  redirectURI: string;
  codeVerifier?: string;
}): Promise<OAuth2Tokens> {
  const response = await providerFetch(
    "https://open.feishu.cn/open-apis/authen/v2/oauth/token",
    {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: config.FEISHU_CLIENT_ID,
        client_secret: config.FEISHU_CLIENT_SECRET,
        code,
        redirect_uri: redirectURI,
        ...(codeVerifier ? { code_verifier: codeVerifier } : {}),
      }),
      signal: AbortSignal.timeout(10000),
    },
  );
  const payload = (await response
    .json()
    .catch(() => null)) as TokenPayload | null;
  if (
    !response.ok ||
    !payload ||
    (typeof payload.code === "number" && payload.code !== 0)
  )
    throw new Error(
      typeof payload?.msg === "string"
        ? payload.msg
        : "Feishu token exchange failed",
    );
  return mapTokens(payload);
}

async function getFeishuUserInfo(tokens: OAuth2Tokens) {
  if (!tokens.accessToken) return null;
  const response = await providerFetch(
    "https://open.feishu.cn/open-apis/authen/v1/user_info",
    {
      headers: { authorization: `Bearer ${tokens.accessToken}` },
      signal: AbortSignal.timeout(10000),
    },
  );
  const payload = (await response
    .json()
    .catch(() => null)) as FeishuProfilePayload | null;
  const profile = payload?.data;
  const providerUserId =
    typeof profile?.open_id === "string" ? profile.open_id : "";
  if (
    !response.ok ||
    !profile ||
    (typeof payload?.code === "number" && payload.code !== 0) ||
    !providerUserId
  )
    return null;

  // Store apps cannot rely on receiving a verified tenant email. A provider-scoped
  // address gives Better Auth a stable unique key without trusting that field.
  const identityHash = createHash("sha256")
    .update(providerUserId)
    .digest("hex")
    .slice(0, 32);
  return {
    id: providerUserId,
    email: `feishu-${identityHash}@bookmark-nav.local`,
    emailVerified: true,
    name:
      typeof profile.name === "string" && profile.name.trim()
        ? profile.name.trim()
        : typeof profile.en_name === "string" && profile.en_name.trim()
          ? profile.en_name.trim()
          : "飞书用户",
    image:
      typeof profile.avatar_url === "string" ? profile.avatar_url : undefined,
    union_id: profile.union_id,
    open_id: profile.open_id,
  };
}

function oauthProviders(): GenericOAuthConfig[] {
  const providers: GenericOAuthConfig[] = [];
  if (config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET) {
    providers.push({
      providerId: "google",
      name: "Google",
      clientId: config.GOOGLE_CLIENT_ID,
      clientSecret: config.GOOGLE_CLIENT_SECRET,
      authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      redirectURI: config.GOOGLE_REDIRECT_URI,
      accountIssuer: "https://accounts.google.com",
      accountSubject: ({ profile }) => String(profile.id || profile.sub || ""),
      scopes: ["openid", "email", "profile"],
      prompt: "select_account",
      pkce: true,
      getToken: getGoogleToken,
      getUserInfo: getGoogleUserInfo,
    });
  }
  if (
    config.FEISHU_LOGIN_ENABLED &&
    config.FEISHU_CLIENT_ID &&
    config.FEISHU_CLIENT_SECRET
  ) {
    providers.push({
      providerId: "feishu",
      name: "飞书",
      clientId: config.FEISHU_CLIENT_ID,
      clientSecret: config.FEISHU_CLIENT_SECRET,
      authorizationUrl:
        "https://accounts.feishu.cn/open-apis/authen/v1/authorize",
      tokenUrl: "https://open.feishu.cn/open-apis/authen/v2/oauth/token",
      userInfoUrl: "https://open.feishu.cn/open-apis/authen/v1/user_info",
      accountIssuer: "https://accounts.feishu.cn",
      accountSubject: ({ profile }) => String(profile.open_id || ""),
      pkce: true,
      getToken: getFeishuToken,
      getUserInfo: getFeishuUserInfo,
    });
  }
  return providers;
}

export function getAuthProviderAvailability(): {
  google: boolean;
  feishu: boolean;
} {
  return {
    google: Boolean(config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET),
    feishu: Boolean(
      config.FEISHU_LOGIN_ENABLED &&
        config.FEISHU_CLIENT_ID &&
        config.FEISHU_CLIENT_SECRET,
    ),
  };
}

async function createBetterAuth() {
  const database = await getDatabase();
  const providers = oauthProviders();
  return betterAuth({
    appName: "bookmark-nav",
    baseURL: config.BETTER_AUTH_URL,
    secret: config.BETTER_AUTH_SECRET,
    trustedOrigins: [new URL(config.BETTER_AUTH_URL).origin],
    database: mongodbAdapter(database, { transaction: false }),
    user: { modelName: DB_USER_COLLECTION_NAME },
    session: {
      modelName: DB_SESSION_COLLECTION_NAME,
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    account: {
      modelName: DB_ACCOUNT_COLLECTION_NAME,
      encryptOAuthTokens: true,
      accountLinking: {
        enabled: true,
        trustedProviders: ["google"],
      },
    },
    verification: { modelName: DB_VERIFICATION_COLLECTION_NAME },
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      password: {
        hash: async (password) => {
          const hashed = await hashPassword(password);
          if (!hashed.ok) throw new Error(hashed.error.message);
          return hashed.value;
        },
        verify: ({ hash, password }) => verifyPassword(password, hash),
      },
    },
    advanced: {
      cookiePrefix: "bookmark_nav",
      database: {
        generateId: () => randomUUID(),
      },
    },
    plugins: providers.length ? [genericOAuth({ config: providers })] : [],
  });
}

let authPromise: ReturnType<typeof createBetterAuth> | undefined;

export function getBetterAuth(): ReturnType<typeof createBetterAuth> {
  authPromise ??= createBetterAuth();
  return authPromise;
}

export async function setBetterAuthPassword(
  authUserId: string,
  passwordHash: string,
): Promise<void> {
  const now = new Date();
  await (
    await getDbAccounts()
  ).updateOne(
    {
      issuer: CREDENTIAL_ISSUER,
      accountId: authUserId,
    },
    {
      $set: {
        userId: authUserId,
        providerId: "credential",
        password: passwordHash,
        updatedAt: now,
      },
      $setOnInsert: {
        _id: randomUUID(),
        issuer: CREDENTIAL_ISSUER,
        accountId: authUserId,
        createdAt: now,
      },
    },
    { upsert: true },
  );
}
