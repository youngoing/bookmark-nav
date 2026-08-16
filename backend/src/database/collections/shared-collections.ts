import type { Collection, Db, Document, IndexDescription } from "mongodb";
import { z } from "zod";
import { sharedCollectionItemResponse } from "@loomark/shared";
import { getDatabase } from "../../db";

export const sharedCollectionDocumentSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  sourceTagId: z.string(),
  authorName: z.string(),
  name: z.string(),
  description: z.string(),
  items: z.array(sharedCollectionItemResponse),
  publishedAt: z.string(),
  updatedAt: z.string(),
}).strict();
export type SharedCollectionDocument = z.infer<typeof sharedCollectionDocumentSchema>;
export const SHARED_COLLECTIONS_COLLECTION_NAME = "shared_collections" as const;
export const SHARED_COLLECTIONS_VALIDATOR: Document = {
  $jsonSchema: {
    bsonType: "object",
    required: ["id", "ownerId", "sourceTagId", "authorName", "name", "description", "items", "publishedAt", "updatedAt"],
    additionalProperties: false,
    properties: {
      _id: { bsonType: "objectId" },
      id: { bsonType: "string" },
      ownerId: { bsonType: "string" },
      sourceTagId: { bsonType: "string" },
      authorName: { bsonType: "string" },
      name: { bsonType: "string" },
      description: { bsonType: "string" },
      items: { bsonType: "array" },
      publishedAt: { bsonType: "string" },
      updatedAt: { bsonType: "string" },
    },
  },
};
export const SHARED_COLLECTIONS_INDEXES: readonly IndexDescription[] = [
  { key: { id: 1 }, name: "shared_collections_id_unique", unique: true },
  { key: { ownerId: 1, sourceTagId: 1 }, name: "shared_collections_owner_tag_unique", unique: true },
  { key: { updatedAt: -1 }, name: "shared_collections_updated_at" },
];
export const SEED_SHARED_COLLECTIONS: readonly SharedCollectionDocument[] = [];
export async function getSharedCollectionsCollection(): Promise<Collection<SharedCollectionDocument>> { return (await getDatabase()).collection<SharedCollectionDocument>(SHARED_COLLECTIONS_COLLECTION_NAME); }
export function getSharedCollectionsCollectionFromDatabase(database: Db): Collection<SharedCollectionDocument> { return database.collection<SharedCollectionDocument>(SHARED_COLLECTIONS_COLLECTION_NAME); }
