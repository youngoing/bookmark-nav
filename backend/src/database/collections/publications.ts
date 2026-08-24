import type { Collection, Db, Document, IndexDescription } from "mongodb";
import { z } from "zod";
import { getDatabase } from "../../db";

export const publicationDocumentSchema = z
  .object({
    id: z.string(),
    sourceBookmarkId: z.string(),
    ownerId: z.string(),
    authorName: z.string(),
    url: z.string().url(),
    title: z.string(),
    description: z.string(),
    domain: z.string(),
    favicon: z.string().url(),
    publishedAt: z.string(),
  })
  .strict();
export type PublicationDocument = z.infer<typeof publicationDocumentSchema>;
export const PUBLICATIONS_COLLECTION_NAME = "bookmark_publications" as const;
export const PUBLICATIONS_VALIDATOR: Document = {
  $jsonSchema: {
    bsonType: "object",
    required: [
      "id",
      "sourceBookmarkId",
      "ownerId",
      "authorName",
      "url",
      "title",
      "description",
      "domain",
      "favicon",
      "publishedAt",
    ],
    additionalProperties: false,
    properties: {
      _id: { bsonType: "objectId" },
      id: { bsonType: "string" },
      sourceBookmarkId: { bsonType: "string" },
      ownerId: { bsonType: "string" },
      authorName: { bsonType: "string" },
      url: { bsonType: "string", pattern: "^https?://" },
      title: { bsonType: "string" },
      description: { bsonType: "string" },
      domain: { bsonType: "string" },
      favicon: { bsonType: "string", pattern: "^(https?://|data:image/)" },
      publishedAt: { bsonType: "string" },
    },
  },
};
export const PUBLICATIONS_INDEXES: readonly IndexDescription[] = [
  { key: { id: 1 }, name: "publications_id_unique", unique: true },
  {
    key: { sourceBookmarkId: 1 },
    name: "publications_source_unique",
    unique: true,
  },
  {
    key: { ownerId: 1, publishedAt: -1 },
    name: "publications_owner_published_at",
  },
  { key: { publishedAt: -1 }, name: "publications_published_at" },
];
export const SEED_PUBLICATIONS: readonly PublicationDocument[] = [];
export async function getPublicationsCollection(): Promise<
  Collection<PublicationDocument>
> {
  return (await getDatabase()).collection<PublicationDocument>(
    PUBLICATIONS_COLLECTION_NAME,
  );
}
export function getPublicationsCollectionFromDatabase(
  database: Db,
): Collection<PublicationDocument> {
  return database.collection<PublicationDocument>(PUBLICATIONS_COLLECTION_NAME);
}
