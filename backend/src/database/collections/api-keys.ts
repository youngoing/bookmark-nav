import type { Collection, Db, Document, IndexDescription } from "mongodb";
import { z } from "zod";
import { getDatabase } from "../../db";

export const apiKeyDocumentSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  name: z.string(),
  prefix: z.string(),
  keyHash: z.string(),
  createdAt: z.string(),
  lastUsedAt: z.string().nullable(),
}).strict();

export type DbApiKey = z.infer<typeof apiKeyDocumentSchema>;
export const API_KEYS_COLLECTION_NAME = "api_keys" as const;
export const API_KEYS_VALIDATOR: Document = {
  $jsonSchema: {
    bsonType: "object",
    required: ["id", "ownerId", "name", "prefix", "keyHash", "createdAt", "lastUsedAt"],
    additionalProperties: false,
    properties: {
      _id: { bsonType: "objectId" },
      id: { bsonType: "string" },
      ownerId: { bsonType: "string" },
      name: { bsonType: "string" },
      prefix: { bsonType: "string" },
      keyHash: { bsonType: "string" },
      createdAt: { bsonType: "string" },
      lastUsedAt: { bsonType: ["string", "null"] },
    },
  },
};
export const API_KEYS_INDEXES: readonly IndexDescription[] = [
  { key: { id: 1 }, name: "api_keys_id_unique", unique: true },
  { key: { keyHash: 1 }, name: "api_keys_hash_unique", unique: true },
  { key: { ownerId: 1, createdAt: -1 }, name: "api_keys_owner_created_at" },
];

export async function getApiKeysCollection(): Promise<Collection<DbApiKey>> {
  return (await getDatabase()).collection<DbApiKey>(API_KEYS_COLLECTION_NAME);
}

export function getApiKeysCollectionFromDatabase(database: Db): Collection<DbApiKey> {
  return database.collection<DbApiKey>(API_KEYS_COLLECTION_NAME);
}
