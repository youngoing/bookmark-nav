import { randomUUID } from "node:crypto";
import type { Collection, Db } from "mongodb";
import { z } from "zod";
import { getDatabase } from "../../db";

export const DB_USER_COLLECTION_NAME = "auth_user" as const;
export const DB_SESSION_COLLECTION_NAME = "auth_session" as const;
export const DB_ACCOUNT_COLLECTION_NAME = "auth_account" as const;
export const DB_VERIFICATION_COLLECTION_NAME = "auth_verification" as const;
export const LEGACY_USER_COLLECTION_NAME = "users" as const;
export const LEGACY_USER_BACKUP_COLLECTION_NAME =
  "users_legacy_backup" as const;

export const dbUserSchema = z
  .object({
    _id: z.string(),
    name: z.string(),
    email: z.string().email(),
    emailVerified: z.boolean(),
    image: z.string().nullable().optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
  })
  .strict();

export type DbUser = z.infer<typeof dbUserSchema>;

export type DbSession = {
  _id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type DbAccount = {
  _id: string;
  issuer: string;
  accountId: string;
  providerId: string;
  userId: string;
  accessToken?: string | null;
  refreshToken?: string | null;
  idToken?: string | null;
  accessTokenExpiresAt?: Date | null;
  refreshTokenExpiresAt?: Date | null;
  scope?: string | null;
  password?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type DbVerification = {
  _id: string;
  identifier: string;
  value: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

const legacyUserSchema = z
  .object({
    id: z.string(),
    email: z.string().email(),
    name: z.string(),
    passwordHash: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough();

type DbLegacyUser = z.infer<typeof legacyUserSchema>;

const testUser = {
  id: "test-user",
  email: "test@bookmark-nav.local",
  name: "测试账号",
  passwordHash:
    "scrypt:bookmark-nav-test-user-v1:2de828afa0ad5b28a2ce6ee2438a6eb07c5a50501888c2587a7d3ba0e9b452faa86914bc9ac3e974d2dae1444f145d26a386b69473cefa706ba775807be80356",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
} satisfies DbLegacyUser;

function toDate(value: string, field: string, userId: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime()))
    throw new Error(`Legacy user ${userId} has invalid ${field}`);
  return date;
}

function hasPassword(passwordHash: string): boolean {
  return (
    !passwordHash.startsWith("google:") && !passwordHash.startsWith("oauth:")
  );
}

export async function getDbUsers(): Promise<Collection<DbUser>> {
  return (await getDatabase()).collection<DbUser>(DB_USER_COLLECTION_NAME);
}

export async function getDbSessions(): Promise<Collection<DbSession>> {
  return (await getDatabase()).collection<DbSession>(
    DB_SESSION_COLLECTION_NAME,
  );
}

export async function getDbAccounts(): Promise<Collection<DbAccount>> {
  return (await getDatabase()).collection<DbAccount>(
    DB_ACCOUNT_COLLECTION_NAME,
  );
}

export async function getDbVerifications(): Promise<
  Collection<DbVerification>
> {
  return (await getDatabase()).collection<DbVerification>(
    DB_VERIFICATION_COLLECTION_NAME,
  );
}

export function getDbUsersFromDatabase(database: Db): Collection<DbUser> {
  return database.collection<DbUser>(DB_USER_COLLECTION_NAME);
}

export function getDbAccountsFromDatabase(database: Db): Collection<DbAccount> {
  return database.collection<DbAccount>(DB_ACCOUNT_COLLECTION_NAME);
}

async function upsertCredential(
  accounts: Collection<DbAccount>,
  userId: string,
  passwordHash: string,
  now: Date,
): Promise<void> {
  if (!hasPassword(passwordHash)) return;
  await accounts.updateOne(
    { issuer: "local:credential", accountId: userId },
    {
      $setOnInsert: {
        _id: randomUUID(),
        issuer: "local:credential",
        accountId: userId,
        userId,
        providerId: "credential",
        password: passwordHash,
        createdAt: now,
        updatedAt: now,
      },
    },
    { upsert: true },
  );
}

async function migrateLegacyUsers(database: Db): Promise<void> {
  const exists = await database
    .listCollections({ name: LEGACY_USER_COLLECTION_NAME }, { nameOnly: true })
    .hasNext();
  if (!exists) return;
  const backupExists = await database
    .listCollections(
      { name: LEGACY_USER_BACKUP_COLLECTION_NAME },
      { nameOnly: true },
    )
    .hasNext();
  if (backupExists)
    throw new Error(
      `Refusing to overwrite ${LEGACY_USER_BACKUP_COLLECTION_NAME}`,
    );

  const users = getDbUsersFromDatabase(database);
  const accounts = getDbAccountsFromDatabase(database);
  const rawLegacyUsers = await database
    .collection<DbLegacyUser>(LEGACY_USER_COLLECTION_NAME)
    .find()
    .toArray();
  const legacyUsers = rawLegacyUsers.map((rawUser) => {
    const parsed = legacyUserSchema.safeParse(rawUser);
    if (!parsed.success)
      throw new Error(`Invalid legacy user document: ${parsed.error.message}`);
    return parsed.data;
  });
  const normalizedEmails = legacyUsers.map((user) => user.email.toLowerCase());
  if (new Set(normalizedEmails).size !== normalizedEmails.length)
    throw new Error("Legacy users contain duplicate normalized emails");

  const migrationTargets = new Map<string, DbUser>();
  for (const legacyUser of legacyUsers) {
    const normalizedEmail = legacyUser.email.toLowerCase();
    const existingByEmail = await users.findOne({ email: normalizedEmail });
    if (existingByEmail) {
      const parsed = dbUserSchema.safeParse(existingByEmail);
      if (!parsed.success)
        throw new Error(
          `Invalid auth user for ${normalizedEmail}: ${parsed.error.message}`,
        );
      if (parsed.data._id !== legacyUser.id)
        throw new Error(`Auth user ${normalizedEmail} has an incompatible id`);
      migrationTargets.set(legacyUser.id, parsed.data);
      continue;
    }
    const existingById = await users.findOne({ _id: legacyUser.id });
    if (existingById)
      throw new Error(
        `Auth user id ${legacyUser.id} belongs to a different email`,
      );
    migrationTargets.set(legacyUser.id, {
      _id: legacyUser.id,
      email: normalizedEmail,
      emailVerified: true,
      name: legacyUser.name,
      image: null,
      createdAt: toDate(legacyUser.createdAt, "createdAt", legacyUser.id),
      updatedAt: toDate(legacyUser.updatedAt, "updatedAt", legacyUser.id),
    });
  }

  for (const legacyUser of legacyUsers) {
    const normalizedEmail = legacyUser.email.toLowerCase();
    let authUser = await users.findOne({ email: normalizedEmail });
    if (!authUser) {
      const candidate = migrationTargets.get(legacyUser.id);
      if (!candidate)
        throw new Error(`Missing migration target for ${legacyUser.id}`);
      try {
        await users.insertOne(candidate);
        authUser = candidate;
      } catch {
        authUser = await users.findOne({ email: normalizedEmail });
      }
    }
    if (!authUser)
      throw new Error(`Failed to migrate legacy user ${legacyUser.id}`);
    if (authUser._id !== legacyUser.id)
      throw new Error(`Auth user ${normalizedEmail} has an incompatible id`);
    migrationTargets.set(legacyUser.id, authUser);

    await upsertCredential(
      accounts,
      authUser._id,
      legacyUser.passwordHash,
      new Date(),
    );
  }

  const migratedEmails = await users.countDocuments({
    email: { $in: normalizedEmails },
  });
  if (migratedEmails !== normalizedEmails.length)
    throw new Error("Legacy user migration verification failed");
  for (const legacyUser of legacyUsers) {
    const target = migrationTargets.get(legacyUser.id);
    if (!target)
      throw new Error(`Missing migration target for ${legacyUser.id}`);
    if (hasPassword(legacyUser.passwordHash)) {
      const credential = await accounts.findOne({
        issuer: "local:credential",
        accountId: target._id,
        userId: target._id,
        providerId: "credential",
        password: { $type: "string" },
      });
      if (!credential)
        throw new Error(
          `Credential migration failed for legacy user ${legacyUser.id}`,
        );
    }
  }
}

export async function finalizeDbAuthUserMigration(database: Db): Promise<void> {
  await migrateLegacyUsers(database);
  const exists = await database
    .listCollections({ name: LEGACY_USER_COLLECTION_NAME }, { nameOnly: true })
    .hasNext();
  if (!exists) return;
  const backupExists = await database
    .listCollections(
      { name: LEGACY_USER_BACKUP_COLLECTION_NAME },
      { nameOnly: true },
    )
    .hasNext();
  if (backupExists)
    throw new Error(
      `Refusing to overwrite ${LEGACY_USER_BACKUP_COLLECTION_NAME}`,
    );
  await database
    .collection(LEGACY_USER_COLLECTION_NAME)
    .rename(LEGACY_USER_BACKUP_COLLECTION_NAME);
}

async function seedTestUser(database: Db): Promise<void> {
  const users = getDbUsersFromDatabase(database);
  const accounts = getDbAccountsFromDatabase(database);
  if ((await users.countDocuments()) > 0) return;
  let user = await users.findOne({ email: testUser.email });
  if (!user) {
    const document: DbUser = {
      _id: testUser.id,
      email: testUser.email,
      emailVerified: true,
      name: testUser.name,
      image: null,
      createdAt: new Date(testUser.createdAt),
      updatedAt: new Date(testUser.updatedAt),
    };
    await users.insertOne(document);
    user = document;
  }
  await upsertCredential(
    accounts,
    user._id,
    testUser.passwordHash,
    new Date(testUser.updatedAt),
  );
}

export async function initializeDbAuthCollections(database: Db): Promise<void> {
  const users = getDbUsersFromDatabase(database);
  const sessions = database.collection<DbSession>(DB_SESSION_COLLECTION_NAME);
  const accounts = getDbAccountsFromDatabase(database);
  const verifications = database.collection<DbVerification>(
    DB_VERIFICATION_COLLECTION_NAME,
  );

  await Promise.all([
    users.createIndex(
      { email: 1 },
      { name: "auth_user_email_uidx", unique: true },
    ),
    sessions.createIndex(
      { token: 1 },
      { name: "auth_session_token_uidx", unique: true },
    ),
    sessions.createIndex({ userId: 1 }, { name: "auth_session_userId_idx" }),
    sessions.createIndex(
      { expiresAt: 1 },
      { name: "auth_session_expires_at_ttl", expireAfterSeconds: 0 },
    ),
    accounts.createIndex(
      { issuer: 1, accountId: 1 },
      { name: "auth_account_issuer_accountId_uidx", unique: true },
    ),
    accounts.createIndex({ userId: 1 }, { name: "auth_account_userId_idx" }),
    verifications.createIndex(
      { identifier: 1 },
      { name: "auth_verification_identifier_idx" },
    ),
    verifications.createIndex(
      { expiresAt: 1 },
      { name: "auth_verification_expires_at_ttl", expireAfterSeconds: 0 },
    ),
  ]);

  await migrateLegacyUsers(database);
  await seedTestUser(database);
}
