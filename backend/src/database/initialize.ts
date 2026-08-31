import type {
  Collection,
  CollectionInfo,
  Db,
  Document,
  IndexDescription,
  OptionalUnlessRequiredId,
} from "mongodb";
import { getDatabase } from "../db";
import { initializeDbAuthCollections } from "./collections/auth";
import {
  API_KEYS_COLLECTION_NAME,
  API_KEYS_INDEXES,
  API_KEYS_VALIDATOR,
  getApiKeysCollectionFromDatabase,
  type DbApiKey,
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
  type DbFolder,
} from "./collections/folders";
import {
  PUBLICATIONS_COLLECTION_NAME,
  PUBLICATIONS_INDEXES,
  PUBLICATIONS_VALIDATOR,
  getPublicationsCollectionFromDatabase,
  SEED_PUBLICATIONS,
  type DbPublication,
} from "./collections/publications";
import {
  TAGS_COLLECTION_NAME,
  TAGS_INDEXES,
  TAGS_VALIDATOR,
  getTagsCollectionFromDatabase,
  SEED_TAGS,
  type DbTag,
} from "./collections/tags";
import {
  SITES_COLLECTION_NAME,
  SITES_INDEXES,
  SITES_VALIDATOR,
  getSitesCollectionFromDatabase,
  SEED_SITES,
  type DbSite,
} from "./collections/sites";
import {
  SHARED_COLLECTIONS_COLLECTION_NAME,
  SHARED_COLLECTIONS_INDEXES,
  SHARED_COLLECTIONS_VALIDATOR,
  getSharedCollectionsCollectionFromDatabase,
  SEED_SHARED_COLLECTIONS,
  type DbSharedCollection,
} from "./collections/shared-collections";
import {
  USER_PREFERENCES_COLLECTION_NAME,
  USER_PREFERENCES_INDEXES,
  USER_PREFERENCES_VALIDATOR,
  getUserPreferencesCollectionFromDatabase,
  type DbUserPreferences,
} from "./collections/user-preferences";

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
    if (!migrateValidatorOnSchemaMismatch)
      throw new Error(`Collection ${name} has an unexpected immutable schema`);
    await database.command({
      collMod: name,
      validator,
      validationLevel: "strict",
      validationAction: "error",
    });
  }
  for (const index of indexes) await collection.createIndex(index.key, index);
  if ((await collection.countDocuments()) === 0 && seeds.length)
    await collection.insertMany([...seeds]);
}

async function migrateLegacyIconFields(
  database: Db,
  collectionName: string,
  validator: Document,
  fallback: string,
): Promise<void> {
  const info = await getCollectionInfo(database, collectionName);
  if (info && !hasExpectedValidator(info, validator)) {
    await database.command({
      collMod: collectionName,
      validator,
      validationLevel: "strict",
      validationAction: "error",
    });
  }
  const collection = database.collection<{ _id: unknown; icon?: unknown }>(
    collectionName,
  );
  const legacyDocuments = await collection
    .find({ icon: { $exists: true } })
    .project({ _id: 1, icon: 1 })
    .toArray();
  for (const document of legacyDocuments) {
    const iconName =
      typeof document.icon === "string" && document.icon.trim()
        ? document.icon.trim()
        : fallback;
    await collection.updateOne(
      { _id: document._id },
      { $set: { iconLibrary: "lucide", iconName }, $unset: { icon: "" } },
    );
  }
}

export async function initializeDatabase(): Promise<void> {
  const database = await getDatabase();
  await initializeDbAuthCollections(database);
  await initializeCollection<DbUserPreferences>(
    database,
    USER_PREFERENCES_COLLECTION_NAME,
    USER_PREFERENCES_VALIDATOR,
    USER_PREFERENCES_INDEXES,
    getUserPreferencesCollectionFromDatabase(database),
    [],
    false,
    true,
  );
  await migrateLegacyIconFields(
    database,
    FOLDERS_COLLECTION_NAME,
    FOLDERS_VALIDATOR,
    "Folder",
  );
  await migrateLegacyIconFields(
    database,
    TAGS_COLLECTION_NAME,
    TAGS_VALIDATOR,
    "Tag",
  );
  await initializeCollection<DbApiKey>(
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
  await initializeCollection<DbFolder>(
    database,
    FOLDERS_COLLECTION_NAME,
    FOLDERS_VALIDATOR,
    FOLDERS_INDEXES,
    getFoldersCollectionFromDatabase(database),
    SEED_FOLDERS,
    false,
    true,
  );
  await initializeCollection<DbTag>(
    database,
    TAGS_COLLECTION_NAME,
    TAGS_VALIDATOR,
    TAGS_INDEXES,
    getTagsCollectionFromDatabase(database),
    SEED_TAGS,
    false,
    true,
  );
  await initializeCollection<DbSite>(
    database,
    SITES_COLLECTION_NAME,
    SITES_VALIDATOR,
    SITES_INDEXES,
    getSitesCollectionFromDatabase(database),
    SEED_SITES,
    false,
    true,
  );
  await initializeCollection<DbPublication>(
    database,
    PUBLICATIONS_COLLECTION_NAME,
    PUBLICATIONS_VALIDATOR,
    PUBLICATIONS_INDEXES,
    getPublicationsCollectionFromDatabase(database),
    SEED_PUBLICATIONS,
    false,
    true,
  );
  await initializeCollection<DbSharedCollection>(
    database,
    SHARED_COLLECTIONS_COLLECTION_NAME,
    SHARED_COLLECTIONS_VALIDATOR,
    SHARED_COLLECTIONS_INDEXES,
    getSharedCollectionsCollectionFromDatabase(database),
    SEED_SHARED_COLLECTIONS,
    true,
  );
}
