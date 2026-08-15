import { jwtVerify, SignJWT } from "jose";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { failure, fromPromise, success, type AccountUpdateInput, type Result, type UserResponse } from "@loomark/shared";
import { z } from "zod";
import type { WithId } from "mongodb";
import { config } from "./config";
import { getUsersCollection, userDocumentSchema, type UserDocument } from "./database/collections/users";

const secret = new TextEncoder().encode(config.AUTH_SECRET);
const sessionPayload = z.object({ userId: z.string(), email: z.string().email() });

export type SessionError = { code: "SESSION_INVALID"; message: string };
export type AuthenticationError = { code: "INVALID_CREDENTIALS" | "ACCOUNT_NOT_FOUND" | "PASSWORD_REQUIRED" | "PASSWORD_HASH_FAILED"; message: string };

export function createSession(user: UserResponse): Promise<string> {
  return new SignJWT({ userId: user.id, email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export function verifySession(token?: string): Promise<Result<{ userId: string; email: string }, SessionError>> {
  if (!token) return Promise.resolve(failure({ code: "SESSION_INVALID", message: "Session token is missing" }));
  return fromPromise(
    jwtVerify(token, secret),
    (): SessionError => ({ code: "SESSION_INVALID", message: "Session token is invalid" }),
  ).then((verified) => {
    if (!verified.ok) return verified;
    const parsed = sessionPayload.safeParse(verified.value.payload);
    return parsed.success
      ? success(parsed.data)
      : failure({ code: "SESSION_INVALID", message: "Session payload is invalid" });
  });
}

function publicUser(user: UserDocument): UserResponse { return { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt, updatedAt: user.updatedAt }; }

function parseUser(document: WithId<UserDocument>): Result<UserDocument, AuthenticationError> {
  const { _id: _, ...value } = document;
  const parsed = userDocumentSchema.safeParse(value);
  return parsed.success ? success(parsed.data) : failure({ code: "ACCOUNT_NOT_FOUND", message: "账号数据无效" });
}

function derivePassword(password: string, salt: string): Promise<Result<Buffer, AuthenticationError>> {
  return new Promise((resolve) => {
    scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) resolve(failure({ code: "PASSWORD_HASH_FAILED", message: "无法处理密码" }));
      else resolve(success(derivedKey));
    });
  });
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, salt, expectedHex] = stored.split(":");
  if (algorithm !== "scrypt" || !salt || !expectedHex || !/^[0-9a-f]+$/i.test(expectedHex)) return false;
  const derived = await derivePassword(password, salt);
  if (!derived.ok) return false;
  const expected = Buffer.from(expectedHex, "hex");
  return expected.length === derived.value.length && timingSafeEqual(expected, derived.value);
}

async function hashPassword(password: string): Promise<Result<string, AuthenticationError>> {
  const salt = randomBytes(16).toString("hex");
  const derived = await derivePassword(password, salt);
  return derived.ok ? success(`scrypt:${salt}:${derived.value.toString("hex")}`) : derived;
}

export async function authenticateUser(email: string, password: string): Promise<Result<UserResponse, AuthenticationError>> {
  const document = await (await getUsersCollection()).findOne({ email: email.toLowerCase() });
  if (!document) return failure({ code: "INVALID_CREDENTIALS", message: "邮箱或密码不正确" });
  const parsed = parseUser(document);
  if (!parsed.ok || !(await verifyPassword(password, parsed.value.passwordHash))) return failure({ code: "INVALID_CREDENTIALS", message: "邮箱或密码不正确" });
  return success(publicUser(parsed.value));
}

export async function getSessionUser(token?: string): Promise<Result<UserResponse, SessionError | AuthenticationError>> {
  const session = await verifySession(token);
  if (!session.ok) return session;
  const document = await (await getUsersCollection()).findOne({ id: session.value.userId });
  if (!document) return failure({ code: "ACCOUNT_NOT_FOUND", message: "账号不存在" });
  const parsed = parseUser(document);
  return parsed.ok ? success(publicUser(parsed.value)) : parsed;
}

export async function updateAccount(token: string | undefined, input: AccountUpdateInput): Promise<Result<UserResponse, SessionError | AuthenticationError>> {
  const session = await verifySession(token);
  if (!session.ok) return session;
  const users = await getUsersCollection();
  const document = await users.findOne({ id: session.value.userId });
  if (!document) return failure({ code: "ACCOUNT_NOT_FOUND", message: "账号不存在" });
  const parsedDocument = parseUser(document);
  if (!parsedDocument.ok) return parsedDocument;
  const user = parsedDocument.value;
  let passwordHash = user.passwordHash;
  if (input.newPassword) {
    if (!input.currentPassword) return failure({ code: "PASSWORD_REQUIRED", message: "修改密码需要输入当前密码" });
    if (!(await verifyPassword(input.currentPassword, user.passwordHash))) return failure({ code: "INVALID_CREDENTIALS", message: "当前密码不正确" });
    const hashed = await hashPassword(input.newPassword);
    if (!hashed.ok) return hashed;
    passwordHash = hashed.value;
  }
  const updatedAt = new Date().toISOString();
  await users.updateOne({ id: user.id }, { $set: { name: input.name || user.name, passwordHash, updatedAt } });
  return success(publicUser({ ...user, name: input.name || user.name, passwordHash, updatedAt }));
}

export function isValidApiToken(token?: string): boolean {
  return Boolean(token && token === config.API_TOKEN);
}
