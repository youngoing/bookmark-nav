import type { Collection, Db, Document, IndexDescription } from "mongodb";
import { z } from "zod";
import { getDatabase } from "../../db";

export const userDocumentSchema = z.object({ id: z.string(), email: z.string().email(), name: z.string(), passwordHash: z.string(), createdAt: z.string(), updatedAt: z.string() }).strict();
export type UserDocument = z.infer<typeof userDocumentSchema>;
export const USERS_COLLECTION_NAME = "users" as const;
export const USERS_VALIDATOR: Document = { $jsonSchema: { bsonType: "object", required: ["id", "email", "name", "passwordHash", "createdAt", "updatedAt"], additionalProperties: false, properties: { _id: { bsonType: "objectId" }, id: { bsonType: "string" }, email: { bsonType: "string" }, name: { bsonType: "string" }, passwordHash: { bsonType: "string" }, createdAt: { bsonType: "string" }, updatedAt: { bsonType: "string" } } } };
export const USERS_INDEXES: readonly IndexDescription[] = [{ key: { id: 1 }, name: "users_id_unique", unique: true }, { key: { email: 1 }, name: "users_email_unique", unique: true }];
const seededAt = "2024-01-01T00:00:00.000Z";
export const SEED_USERS: readonly UserDocument[] = [{ id: "test-user", email: "test@bookmark-nav.local", name: "测试账号", passwordHash: "scrypt:bookmark-nav-test-user-v1:2de828afa0ad5b28a2ce6ee2438a6eb07c5a50501888c2587a7d3ba0e9b452faa86914bc9ac3e974d2dae1444f145d26a386b69473cefa706ba775807be80356", createdAt: seededAt, updatedAt: seededAt }];
export async function getUsersCollection(): Promise<Collection<UserDocument>> { return (await getDatabase()).collection<UserDocument>(USERS_COLLECTION_NAME); }
export function getUsersCollectionFromDatabase(database: Db): Collection<UserDocument> { return database.collection<UserDocument>(USERS_COLLECTION_NAME); }
