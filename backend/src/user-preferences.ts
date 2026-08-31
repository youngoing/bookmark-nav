import { themePreferencesUpdateInput, type ThemePreferencesUpdateInput } from "@loomark/shared";
import { getUserPreferencesCollection } from "./database/collections/user-preferences";

const DEFAULT_THEME_PREFERENCES: ThemePreferencesUpdateInput = {
  themeId: "default",
  themeMode: "system",
};

function now(): string {
  return new Date().toISOString();
}

export async function getUserPreferences(userId: string) {
  const collection = await getUserPreferencesCollection();
  const existing = await collection.findOne({ userId });
  if (existing) {
    const parsed = themePreferencesUpdateInput.safeParse(existing);
    if (parsed.success)
      return {
        ...parsed.data,
        version: existing.version,
        updatedAt: existing.updatedAt,
      };
  }

  const timestamp = now();
  const created = {
    userId,
    ...DEFAULT_THEME_PREFERENCES,
    version: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await collection.updateOne(
    { userId },
    { $setOnInsert: created },
    { upsert: true },
  );
  const result = await collection.findOne({ userId });
  if (!result) throw new Error("Failed to create user preferences");
  return {
    themeId: result.themeId,
    themeMode: result.themeMode,
    version: result.version,
    updatedAt: result.updatedAt,
  };
}

export async function updateUserPreferences(
  userId: string,
  input: ThemePreferencesUpdateInput,
) {
  const parsed = themePreferencesUpdateInput.parse(input);
  const collection = await getUserPreferencesCollection();
  const timestamp = now();
  await collection.updateOne(
    { userId },
    {
      $set: {
        themeId: parsed.themeId,
        themeMode: parsed.themeMode,
        updatedAt: timestamp,
      },
      $inc: { version: 1 },
      $setOnInsert: {
        userId,
        createdAt: timestamp,
      },
    },
    { upsert: true },
  );
  const result = await collection.findOne({ userId });
  if (!result) throw new Error("Failed to update user preferences");
  return {
    themeId: result.themeId,
    themeMode: result.themeMode,
    version: result.version,
    updatedAt: result.updatedAt,
  };
}
