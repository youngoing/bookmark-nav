import type { Collection, Db, Document, IndexDescription } from "mongodb";
import { z } from "zod";
import { getDatabase } from "../../db";

export const folderDocumentSchema = z.object({ id: z.string(), ownerId: z.string(), name: z.string(), iconLibrary: z.enum(["lucide", "emoji", "custom"]), iconName: z.string().trim().min(1).max(32), createdAt: z.string(), updatedAt: z.string() }).strict();
export type FolderDocument = z.infer<typeof folderDocumentSchema>;
export const FOLDERS_COLLECTION_NAME = "folders" as const;
export const FOLDERS_VALIDATOR: Document = { $jsonSchema: { bsonType: "object", required: ["id", "ownerId", "name", "iconLibrary", "iconName", "createdAt", "updatedAt"], additionalProperties: false, properties: { _id: { bsonType: "objectId" }, id: { bsonType: "string" }, ownerId: { bsonType: "string" }, name: { bsonType: "string" }, iconLibrary: { enum: ["lucide", "emoji", "custom"] }, iconName: { bsonType: "string", minLength: 1, maxLength: 32 }, createdAt: { bsonType: "string" }, updatedAt: { bsonType: "string" } } } };
export const FOLDERS_INDEXES: readonly IndexDescription[] = [{ key: { id: 1 }, name: "folders_id_unique", unique: true }, { key: { ownerId: 1, name: 1 }, name: "folders_owner_name_unique", unique: true }];
export const SEED_FOLDERS: readonly FolderDocument[] = [];
export async function getFoldersCollection(): Promise<Collection<FolderDocument>> { return (await getDatabase()).collection<FolderDocument>(FOLDERS_COLLECTION_NAME); }
export function getFoldersCollectionFromDatabase(database: Db): Collection<FolderDocument> { return database.collection<FolderDocument>(FOLDERS_COLLECTION_NAME); }
