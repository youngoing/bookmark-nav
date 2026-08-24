import type {
  Collection,
  CollectionInfo,
  Db,
  Document,
  IndexDescription,
  OptionalUnlessRequiredId,
} from "mongodb";
import { getDatabase } from "../db";
import {
  API_KEYS_COLLECTION_NAME,
  API_KEYS_INDEXES,
  API_KEYS_VALIDATOR,
  getApiKeysCollectionFromDatabase,
  type ApiKeyDocument,
} from "./collections/api-keys";
import {
  BOOKMARKS_COLLECTION_NAME,
  BOOKMARKS_INDEXES,
  BOOKMARKS_VALIDATOR,
  getBookmarksCollectionFromDatabase,
  SEED_BOOKMARKS,
} from "./collections/bookmarks";
import {
  FOLDERS_COLLECTION_NAME,
  FOLDERS_INDEXES,
  FOLDERS_VALIDATOR,
  getFoldersCollectionFromDatabase,
  SEED_FOLDERS,
  type FolderDocument,
} from "./collections/folders";
import {
  PUBLICATIONS_COLLECTION_NAME,
  PUBLICATIONS_INDEXES,
  PUBLICATIONS_VALIDATOR,
  getPublicationsCollectionFromDatabase,
  SEED_PUBLICATIONS,
  type PublicationDocument,
} from "./collections/publications";
import {
  TAGS_COLLECTION_NAME,
  TAGS_INDEXES,
  TAGS_VALIDATOR,
  getTagsCollectionFromDatabase,
  SEED_TAGS,
  type TagDocument,
} from "./collections/tags";
import {
  SITES_COLLECTION_NAME,
  SITES_INDEXES,
  SITES_VALIDATOR,
  getSitesCollectionFromDatabase,
  SEED_SITES,
  type SiteDocument,
} from "./collections/sites";
import {
  SHARED_COLLECTIONS_COLLECTION_NAME,
  SHARED_COLLECTIONS_INDEXES,
  SHARED_COLLECTIONS_VALIDATOR,
  getSharedCollectionsCollectionFromDatabase,
  SEED_SHARED_COLLECTIONS,
  type SharedCollectionDocument,
} from "./collections/shared-collections";
import {
  USERS_COLLECTION_NAME,
  USERS_INDEXES,
  USERS_VALIDATOR,
  getUsersCollectionFromDatabase,
  SEED_USERS,
  type UserDocument,
} from "./collections/users";

async function getCollectionInfo(
  database: Db,
  name: string,
): Promise<CollectionInfo | null> {
  return database.listCollections({ name }, { nameOnly: false }).next();
}

function hasExpectedValidator(
  info: CollectionInfo,
  validator: Document,
): boolean {
  return JSON.stringify(info.options?.validator) === JSON.stringify(validator);
}

async function initializeCollection<T extends Document>(
  database: Db,
  name: string,
  validator: Document,
  indexes: readonly IndexDescription[],
  collection: Collection<T>,
  seeds: readonly OptionalUnlessRequiredId<T>[],
  resetOnSchemaMismatch = false,
  migrateValidatorOnSchemaMismatch = false,
): Promise<void> {
  let info = await getCollectionInfo(database, name);
  if (info && !hasExpectedValidator(info, validator) && resetOnSchemaMismatch) {
    await database.dropCollection(name);
    info = null;
  }
  if (!info) {
    await database.createCollection(name, {
      validator,
      validationLevel: "strict",
      validationAction: "error",
    });
  } else if (!hasExpectedValidator(info, validator)) {
    if (!migrateValidatorOnSchemaMismatch) throw new Error(`Collection ${name} has an unexpected immutable schema`);
    await database.command({ collMod: name, validator, validationLevel: "strict", validationAction: "error" });
  }
  for (const index of indexes) await collection.createIndex(index.key, index);
  if ((await collection.countDocuments()) === 0 && seeds.length)
    await collection.insertMany([...seeds]);
}

async function migrateLegacyIconFields(database: Db, collectionName: string, validator: Document, fallback: string): Promise<void> {
  const info = await getCollectionInfo(database, collectionName);
  if (info && !hasExpectedValidator(info, validator)) {
    await database.command({ collMod: collectionName, validator, validationLevel: "strict", validationAction: "error" });
  }
  const collection = database.collection<{ _id: unknown; icon?: unknown }>(collectionName);
  const legacyDocuments = await collection.find({ icon: { $exists: true } }).project({ _id: 1, icon: 1 }).toArray();
  for (const document of legacyDocuments) {
    const iconName = typeof document.icon === "string" && document.icon.trim() ? document.icon.trim() : fallback;
    await collection.updateOne({ _id: document._id }, { $set: { iconLibrary: "lucide", iconName }, $unset: { icon: "" } });
  }
}

export async function initializeDatabase(): Promise<void> {
  const database = await getDatabase();
  await migrateLegacyIconFields(database, FOLDERS_COLLECTION_NAME, FOLDERS_VALIDATOR, "Folder");
  await migrateLegacyIconFields(database, TAGS_COLLECTION_NAME, TAGS_VALIDATOR, "Tag");
  await initializeCollection<ApiKeyDocument>(
    database,
    API_KEYS_COLLECTION_NAME,
    API_KEYS_VALIDATOR,
    API_KEYS_INDEXES,
    getApiKeysCollectionFromDatabase(database),
    [],
  );
  await initializeCollection(
    database,
    BOOKMARKS_COLLECTION_NAME,
    BOOKMARKS_VALIDATOR,
    BOOKMARKS_INDEXES,
    getBookmarksCollectionFromDatabase(database),
    SEED_BOOKMARKS,
    false,
    true,
  );
  await initializeCollection<FolderDocument>(
    database,
    FOLDERS_COLLECTION_NAME,
    FOLDERS_VALIDATOR,
    FOLDERS_INDEXES,
    getFoldersCollectionFromDatabase(database),
    SEED_FOLDERS,
    false,
    true,
  );
  await initializeCollection<TagDocument>(
    database,
    TAGS_COLLECTION_NAME,
    TAGS_VALIDATOR,
    TAGS_INDEXES,
    getTagsCollectionFromDatabase(database),
    SEED_TAGS,
    false,
    true,
  );
  await initializeCollection<SiteDocument>(
    database,
    SITES_COLLECTION_NAME,
    SITES_VALIDATOR,
    SITES_INDEXES,
    getSitesCollectionFromDatabase(database),
    SEED_SITES,
    true,
  );
  await initializeCollection<PublicationDocument>(
    database,
    PUBLICATIONS_COLLECTION_NAME,
    PUBLICATIONS_VALIDATOR,
    PUBLICATIONS_INDEXES,
    getPublicationsCollectionFromDatabase(database),
    SEED_PUBLICATIONS,
    true,
  );
  await initializeCollection<SharedCollectionDocument>(
    database,
    SHARED_COLLECTIONS_COLLECTION_NAME,
    SHARED_COLLECTIONS_VALIDATOR,
    SHARED_COLLECTIONS_INDEXES,
    getSharedCollectionsCollectionFromDatabase(database),
    SEED_SHARED_COLLECTIONS,
    true,
  );
  await initializeCollection<UserDocument>(
    database,
    USERS_COLLECTION_NAME,
    USERS_VALIDATOR,
    USERS_INDEXES,
    getUsersCollectionFromDatabase(database),
    SEED_USERS,
  );
}
