import type { Collection, Db, Document, IndexDescription } from "mongodb";
import { bookmarkResponse, type BookmarkResponse } from "@loomark/shared";
import { getDatabase } from "../../db";

export type BookmarkDocument = BookmarkResponse;
export const bookmarkDocumentSchema = bookmarkResponse.strict();
export const BOOKMARKS_COLLECTION_NAME = "bookmarks" as const;

export const BOOKMARKS_VALIDATOR: Document = {
  $jsonSchema: {
    bsonType: "object",
    required: ["id", "ownerId", "siteId", "title", "url", "description", "domain", "favicon", "folderId", "tags", "clicks", "isFavorite", "publicationId", "createdAt", "updatedAt"],
    additionalProperties: false,
    properties: {
      _id: { bsonType: "objectId" },
      id: { bsonType: "string" },
      ownerId: { bsonType: "string" },
      siteId: { bsonType: "string" },
      title: { bsonType: "string" },
      url: { bsonType: "string", pattern: "^https?://" },
      description: { bsonType: "string" },
      domain: { bsonType: "string" },
      favicon: { bsonType: "string", pattern: "^https?://" },
      folderId: { bsonType: ["string", "null"] },
      tags: { bsonType: "array", items: { bsonType: "string" } },
      clicks: { bsonType: "int", minimum: 0 },
      isFavorite: { bsonType: "bool" },
      publicationId: { bsonType: ["string", "null"] },
      createdAt: { bsonType: "string" },
      updatedAt: { bsonType: "string" },
    },
  },
};

export const BOOKMARKS_INDEXES: readonly IndexDescription[] = [
  { key: { id: 1 }, name: "bookmarks_id_unique", unique: true },
  { key: { ownerId: 1, createdAt: -1 }, name: "bookmarks_owner_created_at" },
  { key: { ownerId: 1, folderId: 1 }, name: "bookmarks_owner_folder" },
  { key: { ownerId: 1, siteId: 1 }, name: "bookmarks_owner_site" },
  { key: { ownerId: 1, domain: 1 }, name: "bookmarks_owner_domain" },
];

export const SEED_BOOKMARKS: readonly BookmarkDocument[] = [];

export async function getBookmarksCollection(): Promise<Collection<BookmarkDocument>> {
  return (await getDatabase()).collection<BookmarkDocument>(BOOKMARKS_COLLECTION_NAME);
}

export function getBookmarksCollectionFromDatabase(database: Db): Collection<BookmarkDocument> {
  return database.collection<BookmarkDocument>(BOOKMARKS_COLLECTION_NAME);
}
