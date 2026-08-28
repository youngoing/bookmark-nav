import { initializeDbAuthCollections } from "../src/database/collections/auth";
import { config } from "../src/config";
import { closeDatabase, getDatabase } from "../src/db";

async function main(): Promise<void> {
  const database = await getDatabase();
  console.log(`Migrating authentication data in ${config.MONGODB_DB}...`);
  await initializeDbAuthCollections(database);

  const collectionNames = new Set(
    (await database.listCollections({}, { nameOnly: true }).toArray()).map(
      (collection) => collection.name,
    ),
  );
  const count = async (name: string): Promise<number | null> =>
    collectionNames.has(name)
      ? database.collection(name).countDocuments()
      : null;

  console.log({
    authUsers: await count("auth_user"),
    authAccounts: await count("auth_account"),
    legacyUsers: await count("users"),
    legacyBackupUsers: await count("users_legacy_backup"),
  });
}

main()
  .catch((error: unknown) => {
    console.error(
      "Authentication migration failed",
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  })
  .finally(() => closeDatabase());
