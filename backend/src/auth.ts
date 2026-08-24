import { jwtVerify, SignJWT } from "jose";
import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import {
  failure,
  fromPromise,
  success,
  type ApiKeyCreatedResponse,
  type ApiKeyResponse,
  type AccountUpdateInput,
  type Result,
  type UserResponse,
} from "@loomark/shared";
import { z } from "zod";
import type { WithId } from "mongodb";
import { ProxyAgent } from "undici";
import { config } from "./config";
import {
  getApiKeysCollection,
  type ApiKeyDocument,
} from "./database/collections/api-keys";
import {
  getUsersCollection,
  userDocumentSchema,
  type UserDocument,
} from "./database/collections/users";

const secret = new TextEncoder().encode(config.AUTH_SECRET);
const sessionPayload = z.object({
  userId: z.string(),
  email: z.string().email(),
});
const googleProxyAgent = config.GOOGLE_PROXY_URL
  ? new ProxyAgent(config.GOOGLE_PROXY_URL)
  : undefined;

function fetchGoogle(url: string, init: RequestInit): Promise<Response> {
  if (!googleProxyAgent) return fetch(url, init);
  return fetch(url, {
    ...init,
    dispatcher: googleProxyAgent,
  } as RequestInit & { dispatcher: ProxyAgent });
}

export type SessionError = { code: "SESSION_INVALID"; message: string };
export type AuthenticationError = {
  code:
    | "INVALID_CREDENTIALS"
    | "PASSWORD_MISMATCH"
    | "ACCOUNT_NOT_FOUND"
    | "PASSWORD_REQUIRED"
    | "DEMO_ACCOUNT_READ_ONLY"
    | "PASSWORD_HASH_FAILED";
  message: string;
};
export type GoogleAuthenticationError = {
  code:
    | "GOOGLE_NOT_CONFIGURED"
    | "GOOGLE_TOKEN_EXCHANGE_FAILED"
    | "GOOGLE_PROFILE_INVALID"
    | "ACCOUNT_CREATION_FAILED";
  message: string;
};
export type ApiKeyError = {
  code: "API_KEY_INVALID" | "ACCOUNT_NOT_FOUND";
  message: string;
};

export function createSession(user: UserResponse): Promise<string> {
  return new SignJWT({ userId: user.id, email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export function verifySession(
  token?: string,
): Promise<Result<{ userId: string; email: string }, SessionError>> {
  if (!token)
    return Promise.resolve(
      failure({ code: "SESSION_INVALID", message: "Session token is missing" }),
    );
  return fromPromise(
    jwtVerify(token, secret),
    (): SessionError => ({
      code: "SESSION_INVALID",
      message: "Session token is invalid",
    }),
  ).then((verified) => {
    if (!verified.ok) return verified;
    const parsed = sessionPayload.safeParse(verified.value.payload);
    return parsed.success
      ? success(parsed.data)
      : failure({
          code: "SESSION_INVALID",
          message: "Session payload is invalid",
        });
  });
}

function publicUser(user: UserDocument): UserResponse {
  const passwordConfigured = !user.passwordHash.startsWith("google:");
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    passwordConfigured,
    passwordChangeRequired: !passwordConfigured,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function parseUser(
  document: WithId<UserDocument>,
): Result<UserDocument, AuthenticationError> {
  const { _id: _, ...value } = document;
  const parsed = userDocumentSchema.safeParse(value);
  return parsed.success
    ? success(parsed.data)
    : failure({ code: "ACCOUNT_NOT_FOUND", message: "账号数据无效" });
}

function derivePassword(
  password: string,
  salt: string,
): Promise<Result<Buffer, AuthenticationError>> {
  return new Promise((resolve) => {
    scrypt(password, salt, 64, (error, derivedKey) => {
      if (error)
        resolve(
          failure({ code: "PASSWORD_HASH_FAILED", message: "无法处理密码" }),
        );
      else resolve(success(derivedKey));
    });
  });
}

async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [algorithm, salt, expectedHex] = stored.split(":");
  if (
    algorithm !== "scrypt" ||
    !salt ||
    !expectedHex ||
    !/^[0-9a-f]+$/i.test(expectedHex)
  )
    return false;
  const derived = await derivePassword(password, salt);
  if (!derived.ok) return false;
  const expected = Buffer.from(expectedHex, "hex");
  return (
    expected.length === derived.value.length &&
    timingSafeEqual(expected, derived.value)
  );
}

async function hashPassword(
  password: string,
): Promise<Result<string, AuthenticationError>> {
  const salt = randomBytes(16).toString("hex");
  const derived = await derivePassword(password, salt);
  return derived.ok
    ? success(`scrypt:${salt}:${derived.value.toString("hex")}`)
    : derived;
}

export async function authenticateUser(
  email: string,
  password: string,
): Promise<Result<UserResponse, AuthenticationError>> {
  const document = await (
    await getUsersCollection()
  ).findOne({ email: email.toLowerCase() });
  if (!document)
    return failure({
      code: "INVALID_CREDENTIALS",
      message: "邮箱或密码不正确",
    });
  const parsed = parseUser(document);
  if (
    !parsed.ok ||
    !(await verifyPassword(password, parsed.value.passwordHash))
  )
    return failure({
      code: "INVALID_CREDENTIALS",
      message: "邮箱或密码不正确",
    });
  return success(publicUser(parsed.value));
}

type GoogleTokenResponse = {
  access_token?: unknown;
  error?: unknown;
  error_description?: unknown;
};
type GoogleProfile = {
  email?: unknown;
  email_verified?: unknown;
  name?: unknown;
};

export async function authenticateGoogle(
  code: string,
): Promise<
  Result<{ user: UserResponse; token: string }, GoogleAuthenticationError>
> {
  if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) {
    return failure({
      code: "GOOGLE_NOT_CONFIGURED",
      message: "Google 登录尚未配置",
    });
  }
  let tokenResponse: Response;
  try {
    tokenResponse = await fetchGoogle("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.GOOGLE_CLIENT_ID,
        client_secret: config.GOOGLE_CLIENT_SECRET,
        redirect_uri: config.GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
      signal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    console.error("[google oauth] token request failed", {
      reason: error instanceof Error ? error.name : "unknown",
    });
    return failure({
      code: "GOOGLE_TOKEN_EXCHANGE_FAILED",
      message: "无法完成 Google 登录",
    });
  }
  const tokenBody = (await tokenResponse
    .json()
    .catch(() => null)) as GoogleTokenResponse | null;
  if (!tokenResponse.ok) {
    console.error("[google oauth] token exchange rejected", {
      status: tokenResponse.status,
      googleError:
        typeof tokenBody?.error === "string" ? tokenBody.error : "unknown",
      description:
        typeof tokenBody?.error_description === "string"
          ? tokenBody.error_description
          : undefined,
    });
    return failure({
      code: "GOOGLE_TOKEN_EXCHANGE_FAILED",
      message: "无法完成 Google 登录",
    });
  }
  if (
    !tokenBody ||
    typeof tokenBody.access_token !== "string" ||
    !tokenBody.access_token
  ) {
    console.error("[google oauth] token response missing access token", {
      status: tokenResponse.status,
    });
    return failure({
      code: "GOOGLE_TOKEN_EXCHANGE_FAILED",
      message: "Google 返回的授权无效",
    });
  }
  let profileResponse: Response;
  try {
    profileResponse = await fetchGoogle(
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: { authorization: `Bearer ${tokenBody.access_token}` },
        signal: AbortSignal.timeout(10000),
      },
    );
  } catch (error) {
    console.error("[google oauth] profile request failed", {
      reason: error instanceof Error ? error.name : "unknown",
    });
    return failure({
      code: "GOOGLE_PROFILE_INVALID",
      message: "无法读取 Google 账号信息",
    });
  }
  if (!profileResponse.ok) {
    console.error("[google oauth] profile request rejected", {
      status: profileResponse.status,
    });
    return failure({
      code: "GOOGLE_PROFILE_INVALID",
      message: "无法读取 Google 账号信息",
    });
  }
  const profile = (await profileResponse
    .json()
    .catch(() => null)) as GoogleProfile | null;
  const email =
    typeof profile?.email === "string" ? profile.email.toLowerCase() : "";
  if (!email || profile?.email_verified !== true) {
    console.error("[google oauth] invalid profile payload", {
      hasEmail: Boolean(email),
      emailVerified: profile?.email_verified === true,
    });
    return failure({
      code: "GOOGLE_PROFILE_INVALID",
      message: "Google 邮箱未通过验证",
    });
  }
  const users = await getUsersCollection();
  const document = await users.findOne({ email });
  let user: UserDocument;
  if (document) {
    const parsed = parseUser(document);
    if (!parsed.ok)
      return failure({
        code: "ACCOUNT_CREATION_FAILED",
        message: "账号数据无效",
      });
    user = parsed.value;
  } else {
    const now = new Date().toISOString();
    const name =
      typeof profile.name === "string" && profile.name.trim()
        ? profile.name.trim().slice(0, 60)
        : email.split("@")[0];
    const newUser: UserDocument = {
      id: randomUUID(),
      email,
      name,
      // Google accounts authenticate through OAuth, never through this password hash.
      passwordHash: "google:unconfigured",
      createdAt: now,
      updatedAt: now,
    };
    try {
      await users.insertOne(newUser);
      user = newUser;
    } catch {
      // A concurrent first login may have created the same email already.
      const existing = await users.findOne({ email });
      if (!existing)
        return failure({
          code: "ACCOUNT_CREATION_FAILED",
          message: "无法创建 Loomark 账号",
        });
      const parsed = parseUser(existing);
      if (!parsed.ok)
        return failure({
          code: "ACCOUNT_CREATION_FAILED",
          message: "账号数据无效",
        });
      user = parsed.value;
    }
  }
  const publicAccount = publicUser(user);
  return success({
    user: publicAccount,
    token: await createSession(publicAccount),
  });
}

export async function getSessionUser(
  token?: string,
): Promise<Result<UserResponse, SessionError | AuthenticationError>> {
  const session = await verifySession(token);
  if (!session.ok) return session;
  const document = await (
    await getUsersCollection()
  ).findOne({ id: session.value.userId });
  if (!document)
    return failure({ code: "ACCOUNT_NOT_FOUND", message: "账号不存在" });
  const parsed = parseUser(document);
  return parsed.ok ? success(publicUser(parsed.value)) : parsed;
}

function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

function publicApiKey(key: ApiKeyDocument): ApiKeyResponse {
  return {
    id: key.id,
    name: key.name,
    prefix: key.prefix,
    createdAt: key.createdAt,
    lastUsedAt: key.lastUsedAt,
  };
}

export async function listApiKeys(ownerId: string): Promise<ApiKeyResponse[]> {
  const keys = await (await getApiKeysCollection())
    .find({ ownerId })
    .sort({ createdAt: -1 })
    .toArray();
  return keys.map(publicApiKey);
}

export async function createApiKey(
  ownerId: string,
  name: string,
): Promise<ApiKeyCreatedResponse> {
  const rawKey = `bmn_${randomBytes(32).toString("base64url")}`;
  const now = new Date().toISOString();
  const document: ApiKeyDocument = {
    id: randomUUID(),
    ownerId,
    name,
    prefix: `${rawKey.slice(0, 12)}...`,
    keyHash: hashApiKey(rawKey),
    createdAt: now,
    lastUsedAt: null,
  };
  await (await getApiKeysCollection()).insertOne(document);
  return { ...publicApiKey(document), key: rawKey };
}

export async function revokeApiKey(ownerId: string, id: string): Promise<boolean> {
  return (await (await getApiKeysCollection()).deleteOne({ id, ownerId })).deletedCount === 1;
}

export async function getApiKeyUser(
  rawKey?: string,
): Promise<Result<UserResponse, ApiKeyError>> {
  if (!rawKey?.startsWith("bmn_"))
    return failure({ code: "API_KEY_INVALID", message: "API Key 无效" });
  const keyHash = hashApiKey(rawKey);
  const keys = await getApiKeysCollection();
  const key = await keys.findOne({ keyHash });
  if (!key)
    return failure({ code: "API_KEY_INVALID", message: "API Key 无效或已撤销" });
  const user = await (await getUsersCollection()).findOne({ id: key.ownerId });
  if (!user)
    return failure({ code: "ACCOUNT_NOT_FOUND", message: "账号不存在" });
  const parsed = parseUser(user);
  if (!parsed.ok)
    return failure({ code: "ACCOUNT_NOT_FOUND", message: "账号数据无效" });
  const lastUsedAt = new Date().toISOString();
  await keys.updateOne(
    { id: key.id, ownerId: key.ownerId, keyHash },
    { $set: { lastUsedAt } },
  );
  return success(publicUser(parsed.value));
}

export async function updateAccount(
  token: string | undefined,
  input: AccountUpdateInput,
): Promise<Result<UserResponse, SessionError | AuthenticationError>> {
  const session = await verifySession(token);
  if (!session.ok) return session;
  const users = await getUsersCollection();
  const document = await users.findOne({ id: session.value.userId });
  if (!document)
    return failure({ code: "ACCOUNT_NOT_FOUND", message: "账号不存在" });
  const parsedDocument = parseUser(document);
  if (!parsedDocument.ok) return parsedDocument;
  const user = parsedDocument.value;
  const isDemoAccount = user.id === "test-user" || user.email === "test@bookmark-nav.local";
  if (isDemoAccount && input.newPassword)
    return failure({ code: "DEMO_ACCOUNT_READ_ONLY", message: "Demo 测试账号不能修改密码" });
  const passwordConfigured = !user.passwordHash.startsWith("google:");
  if (!passwordConfigured && !input.newPassword)
    return failure({
      code: "PASSWORD_REQUIRED",
      message: "首次使用请先设置密码",
    });
  let passwordHash = user.passwordHash;
  if (input.newPassword) {
    if (input.newPassword !== input.confirmPassword)
      return failure({
        code: "PASSWORD_MISMATCH",
        message: "两次输入的新密码不一致",
      });
    if (passwordConfigured && !input.currentPassword)
      return failure({
        code: "PASSWORD_REQUIRED",
        message: "修改密码需要输入当前密码",
      });
    if (passwordConfigured && !(await verifyPassword(input.currentPassword!, user.passwordHash)))
      return failure({
        code: "INVALID_CREDENTIALS",
        message: "当前密码不正确",
      });
    const hashed = await hashPassword(input.newPassword);
    if (!hashed.ok) return hashed;
    passwordHash = hashed.value;
  }
  const updatedAt = new Date().toISOString();
  await users.updateOne(
    { id: user.id },
    { $set: { name: input.name || user.name, passwordHash, updatedAt } },
  );
  return success(
    publicUser({
      ...user,
      name: input.name || user.name,
      passwordHash,
      updatedAt,
    }),
  );
}
