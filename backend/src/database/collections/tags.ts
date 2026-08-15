import type { Collection, Db, Document, IndexDescription } from "mongodb";
import { z } from "zod";
import { getDatabase } from "../../db";

export const tagDocumentSchema = z.object({ id: z.string(), name: z.string(), color: z.string(), createdAt: z.string(), updatedAt: z.string() }).strict();
export type TagDocument = z.infer<typeof tagDocumentSchema>;
export const TAGS_COLLECTION_NAME = "tags" as const;
export const TAGS_VALIDATOR: Document = { $jsonSchema: { bsonType: "object", required: ["id", "name", "color", "createdAt", "updatedAt"], additionalProperties: false, properties: { _id: { bsonType: "objectId" }, id: { bsonType: "string" }, name: { bsonType: "string" }, color: { bsonType: "string", pattern: "^#[0-9a-fA-F]{6}$" }, createdAt: { bsonType: "string" }, updatedAt: { bsonType: "string" } } } };
export const TAGS_INDEXES: readonly IndexDescription[] = [{ key: { id: 1 }, name: "tags_id_unique", unique: true }, { key: { name: 1 }, name: "tags_name_unique", unique: true }];
const seededAt = "2024-01-01T00:00:00.000Z";
export const SEED_TAGS: readonly TagDocument[] = [
  { id: "frontend", name: "前端", color: "#3b82f6", createdAt: seededAt, updatedAt: seededAt },
  { id: "product", name: "产品设计", color: "#f97316", createdAt: seededAt, updatedAt: seededAt },
  { id: "ai", name: "AI", color: "#8b5cf6", createdAt: seededAt, updatedAt: seededAt },
  { id: "inspiration", name: "灵感", color: "#10b981", createdAt: seededAt, updatedAt: seededAt },
  { id: "reading", name: "阅读", color: "#ec4899", createdAt: seededAt, updatedAt: seededAt },
];
export async function getTagsCollection(): Promise<Collection<TagDocument>> { return (await getDatabase()).collection<TagDocument>(TAGS_COLLECTION_NAME); }
export function getTagsCollectionFromDatabase(database: Db): Collection<TagDocument> { return database.collection<TagDocument>(TAGS_COLLECTION_NAME); }
