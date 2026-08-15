import type { Collection, CollectionInfo, Db, Document, IndexDescription, OptionalUnlessRequiredId } from "mongodb";
import { getDatabase } from "../db";
import {
  BOOKMARKS_COLLECTION_NAME,
  BOOKMARKS_INDEXES,
  BOOKMARKS_VALIDATOR,
  getBookmarksCollectionFromDatabase,
  SEED_BOOKMARKS,
} from "./collections/bookmarks";
import { FOLDERS_COLLECTION_NAME, FOLDERS_INDEXES, FOLDERS_VALIDATOR, getFoldersCollectionFromDatabase, SEED_FOLDERS, type FolderDocument } from "./collections/folders";
import { TAGS_COLLECTION_NAME, TAGS_INDEXES, TAGS_VALIDATOR, getTagsCollectionFromDatabase, SEED_TAGS, type TagDocument } from "./collections/tags";
import { USERS_COLLECTION_NAME, USERS_INDEXES, USERS_VALIDATOR, getUsersCollectionFromDatabase, SEED_USERS, type UserDocument } from "./collections/users";

async function getCollectionInfo(database: Db, name: string): Promise<CollectionInfo | null> {
  return database.listCollections({ name }, { nameOnly: false }).next();
}

function hasExpectedValidator(info: CollectionInfo, validator: Document): boolean {
  return JSON.stringify(info.options?.validator) === JSON.stringify(validator);
}

async function initializeCollection<T extends Document>(database: Db, name: string, validator: Document, indexes: readonly IndexDescription[], collection: Collection<T>, seeds: readonly OptionalUnlessRequiredId<T>[]): Promise<void> {
  const info = await getCollectionInfo(database, name);
  if (!info) {
    await database.createCollection(name, {
      validator,
      validationLevel: "strict",
      validationAction: "error",
    });
  } else if (!hasExpectedValidator(info, validator)) {
    throw new Error(`Collection ${name} has an unexpected immutable schema`);
  }
  for (const index of indexes) await collection.createIndex(index.key, index);
  if (await collection.countDocuments() === 0 && seeds.length) await collection.insertMany([...seeds]);
}

export async function initializeDatabase(): Promise<void> {
  const database = await getDatabase();
  await initializeCollection(database, BOOKMARKS_COLLECTION_NAME, BOOKMARKS_VALIDATOR, BOOKMARKS_INDEXES, getBookmarksCollectionFromDatabase(database), SEED_BOOKMARKS);
  await initializeCollection<FolderDocument>(database, FOLDERS_COLLECTION_NAME, FOLDERS_VALIDATOR, FOLDERS_INDEXES, getFoldersCollectionFromDatabase(database), SEED_FOLDERS);
  await initializeCollection<TagDocument>(database, TAGS_COLLECTION_NAME, TAGS_VALIDATOR, TAGS_INDEXES, getTagsCollectionFromDatabase(database), SEED_TAGS);
  await initializeCollection<UserDocument>(database, USERS_COLLECTION_NAME, USERS_VALIDATOR, USERS_INDEXES, getUsersCollectionFromDatabase(database), SEED_USERS);
}
