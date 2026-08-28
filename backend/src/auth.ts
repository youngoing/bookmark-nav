import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  failure,
  success,
  type ApiKeyCreatedResponse,
  type ApiKeyResponse,
  type AccountUpdateInput,
  type Result,
  type UserResponse,
} from "@loomark/shared";
import { getBetterAuth, setBetterAuthPassword } from "./better-auth";
import {
  getApiKeysCollection,
  type DbApiKey,
} from "./database/collections/api-keys";
import {
  dbUserSchema,
  getDbAccounts,
  getDbUsers,
  type DbUser,
} from "./database/collections/auth";
import { hashPassword } from "./password";

export type SessionError = { code: "SESSION_INVALID"; message: string };
export type AuthenticationError = {
  code:
    | "PASSWORD_MISMATCH"
    | "ACCOUNT_NOT_FOUND"
    | "PASSWORD_REQUIRED"
    | "DEMO_ACCOUNT_READ_ONLY"
    | "PASSWORD_HASH_FAILED";
  message: string;
};
export type ApiKeyError = {
  code: "API_KEY_INVALID" | "ACCOUNT_NOT_FOUND";
  message: string;
};

async function publicUser(user: DbUser): Promise<UserResponse> {
  const passwordConfigured = Boolean(
    await (
      await getDbAccounts()
    ).findOne({
      issuer: "local:credential",
      accountId: user._id,
      password: { $type: "string" },
    }),
  );
  return {
    id: user._id,
    email: user.email,
    name: user.name,
    passwordConfigured,
    passwordChangeRequired: !passwordConfigured,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

function parseUser(document: DbUser): Result<DbUser, AuthenticationError> {
  const parsed = dbUserSchema.safeParse(document);
  return parsed.success
    ? success(parsed.data)
    : failure({ code: "ACCOUNT_NOT_FOUND", message: "账号数据无效" });
}

async function getAuthenticatedUser(
  headers: Headers,
): Promise<
  Result<
    { authUserId: string; user: UserResponse },
    SessionError | AuthenticationError
  >
> {
  const session = await (await getBetterAuth()).api.getSession({ headers });
  if (!session)
    return failure({
      code: "SESSION_INVALID",
      message: "Session token is invalid",
    });
  const document = await (await getDbUsers()).findOne({ _id: session.user.id });
  if (!document)
    return failure({ code: "ACCOUNT_NOT_FOUND", message: "账号不存在" });
  const parsed = parseUser(document);
  return parsed.ok
    ? success({
        authUserId: session.user.id,
        user: await publicUser(parsed.value),
      })
    : parsed;
}

export async function getSessionUser(
  headers: Headers,
): Promise<Result<UserResponse, SessionError | AuthenticationError>> {
  const authenticated = await getAuthenticatedUser(headers);
  return authenticated.ok ? success(authenticated.value.user) : authenticated;
}

function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

function publicApiKey(key: DbApiKey): ApiKeyResponse {
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
  const document: DbApiKey = {
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

export async function revokeApiKey(
  ownerId: string,
  id: string,
): Promise<boolean> {
  return (
    (await (await getApiKeysCollection()).deleteOne({ id, ownerId }))
      .deletedCount === 1
  );
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
    return failure({
      code: "API_KEY_INVALID",
      message: "API Key 无效或已撤销",
    });
  const user = await (await getDbUsers()).findOne({ _id: key.ownerId });
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
  return success(await publicUser(parsed.value));
}

export async function updateAccount(
  headers: Headers,
  input: AccountUpdateInput,
): Promise<Result<UserResponse, SessionError | AuthenticationError>> {
  const authenticated = await getAuthenticatedUser(headers);
  if (!authenticated.ok) return authenticated;
  const users = await getDbUsers();
  const document = await users.findOne({ _id: authenticated.value.user.id });
  if (!document)
    return failure({ code: "ACCOUNT_NOT_FOUND", message: "账号不存在" });
  const parsedDocument = parseUser(document);
  if (!parsedDocument.ok) return parsedDocument;
  const user = parsedDocument.value;
  const isDemoAccount =
    user._id === "test-user" || user.email === "test@bookmark-nav.local";
  if (isDemoAccount && input.newPassword)
    return failure({
      code: "DEMO_ACCOUNT_READ_ONLY",
      message: "Demo 测试账号不能修改密码",
    });
  const passwordConfigured =
    authenticated.value.user.passwordConfigured === true;
  if (!passwordConfigured && !input.newPassword)
    return failure({
      code: "PASSWORD_REQUIRED",
      message: "首次使用请先设置密码",
    });
  if (input.newPassword) {
    if (input.newPassword !== input.confirmPassword)
      return failure({
        code: "PASSWORD_MISMATCH",
        message: "两次输入的新密码不一致",
      });
    const hashed = await hashPassword(input.newPassword);
    if (!hashed.ok) return hashed;
    await setBetterAuthPassword(authenticated.value.authUserId, hashed.value);
  }
  const updatedAt = new Date();
  await users.updateOne(
    { _id: user._id },
    { $set: { name: input.name || user.name, updatedAt } },
  );
  return success(
    await publicUser({ ...user, name: input.name || user.name, updatedAt }),
  );
}
