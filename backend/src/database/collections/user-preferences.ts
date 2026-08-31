import type { Collection, Db, Document, IndexDescription } from "mongodb";
import { z } from "zod";
import { getDatabase } from "../../db";

export const USER_PREFERENCES_COLLECTION_NAME = "user_preferences" as const;

export const dbUserPreferencesSchema = z
  .object({
    userId: z.string(),
    themeId: z.enum([
      "default",
      "midnight",
      "sakura",
      "forest",
      "paper",
      "cyber",
      "eva-asuka",
    ]),
    themeMode: z.enum(["system", "light", "dark"]),
    version: z.number().int().positive(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict();

export type DbUserPreferences = z.infer<typeof dbUserPreferencesSchema>;

export const USER_PREFERENCES_VALIDATOR: Document = {
  $jsonSchema: {
    bsonType: "object",
    required: [
      "userId",
      "themeId",
      "themeMode",
      "version",
      "createdAt",
      "updatedAt",
    ],
    additionalProperties: false,
    properties: {
      _id: { bsonType: "objectId" },
      userId: { bsonType: "string" },
      themeId: {
        enum: [
          "default",
          "midnight",
          "sakura",
          "forest",
          "paper",
          "cyber",
          "eva-asuka",
        ],
      },
      themeMode: { enum: ["system", "light", "dark"] },
      version: { bsonType: "int", minimum: 1 },
      createdAt: { bsonType: "string" },
      updatedAt: { bsonType: "string" },
    },
  },
};

export const USER_PREFERENCES_INDEXES: readonly IndexDescription[] = [
  { key: { userId: 1 }, name: "user_preferences_user_unique", unique: true },
];

export async function getUserPreferencesCollection(): Promise<
  Collection<DbUserPreferences>
> {
  return (
    await getDatabase()
  ).collection<DbUserPreferences>(USER_PREFERENCES_COLLECTION_NAME);
}

export function getUserPreferencesCollectionFromDatabase(
  database: Db,
): Collection<DbUserPreferences> {
  return database.collection<DbUserPreferences>(
    USER_PREFERENCES_COLLECTION_NAME,
  );
}
