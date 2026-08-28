import type { Collection, Db, Document, IndexDescription } from "mongodb";
import { siteResponse, type Site } from "@loomark/shared";
import { getDatabase } from "../../db";

export type DbSite = Omit<Site, "count">;
export const siteDocumentSchema = siteResponse.omit({ count: true }).strict();
export const SITES_COLLECTION_NAME = "sites" as const;
export const SITES_VALIDATOR: Document = {
  $jsonSchema: {
    bsonType: "object",
    required: ["id", "ownerId", "name", "homepageUrl", "domain", "favicon", "folderId", "tags", "createdAt", "updatedAt"],
    additionalProperties: false,
    properties: {
      _id: { bsonType: "objectId" },
      id: { bsonType: "string" },
      ownerId: { bsonType: "string" },
      name: { bsonType: "string" },
      homepageUrl: { bsonType: "string", pattern: "^https?://" },
      domain: { bsonType: "string" },
      favicon: { bsonType: "string", pattern: "^(https?://|data:image/)" },
      folderId: { bsonType: ["string", "null"] },
      tags: { bsonType: "array", items: { bsonType: "string" } },
      createdAt: { bsonType: "string" },
      updatedAt: { bsonType: "string" },
    },
  },
};
export const SITES_INDEXES: readonly IndexDescription[] = [
  { key: { id: 1 }, name: "sites_id_unique", unique: true },
  { key: { ownerId: 1, domain: 1 }, name: "sites_owner_domain_unique", unique: true },
  { key: { ownerId: 1, name: 1 }, name: "sites_owner_name" },
];
export const SEED_SITES: readonly DbSite[] = [];
export async function getSitesCollection(): Promise<Collection<DbSite>> { return (await getDatabase()).collection<DbSite>(SITES_COLLECTION_NAME); }
export function getSitesCollectionFromDatabase(database: Db): Collection<DbSite> { return database.collection<DbSite>(SITES_COLLECTION_NAME); }
