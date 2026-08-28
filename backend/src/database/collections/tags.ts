import type { Collection, Db, Document, IndexDescription } from "mongodb";
import { z } from "zod";
import { getDatabase } from "../../db";

export const tagDocumentSchema = z.object({ id: z.string(), ownerId: z.string(), name: z.string(), color: z.string(), iconLibrary: z.enum(["lucide", "emoji", "custom"]), iconName: z.string().trim().min(1).max(32), parentId: z.string().nullable(), collectionId: z.string().nullable(), createdAt: z.string(), updatedAt: z.string() }).strict();
export type DbTag = z.infer<typeof tagDocumentSchema>;
export const TAGS_COLLECTION_NAME = "tags" as const;
export const TAGS_VALIDATOR: Document = { $jsonSchema: { bsonType: "object", required: ["id", "ownerId", "name", "color", "iconLibrary", "iconName", "parentId", "collectionId", "createdAt", "updatedAt"], additionalProperties: false, properties: { _id: { bsonType: "objectId" }, id: { bsonType: "string" }, ownerId: { bsonType: "string" }, name: { bsonType: "string" }, color: { bsonType: "string", pattern: "^#[0-9a-fA-F]{6}$" }, iconLibrary: { enum: ["lucide", "emoji", "custom"] }, iconName: { bsonType: "string", minLength: 1, maxLength: 32 }, parentId: { bsonType: ["string", "null"] }, collectionId: { bsonType: ["string", "null"] }, createdAt: { bsonType: "string" }, updatedAt: { bsonType: "string" } } } };
export const TAGS_INDEXES: readonly IndexDescription[] = [{ key: { id: 1 }, name: "tags_id_unique", unique: true }, { key: { ownerId: 1, parentId: 1, name: 1 }, name: "tags_owner_parent_name_unique", unique: true }];
export const SEED_TAGS: readonly DbTag[] = [];
export async function getTagsCollection(): Promise<Collection<DbTag>> { return (await getDatabase()).collection<DbTag>(TAGS_COLLECTION_NAME); }
export function getTagsCollectionFromDatabase(database: Db): Collection<DbTag> { return database.collection<DbTag>(TAGS_COLLECTION_NAME); }
