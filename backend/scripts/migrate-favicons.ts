import type { Collection, Filter, ObjectId } from "mongodb";
import { closeDatabase } from "../src/db";
import { getBookmarksCollection } from "../src/database/collections/bookmarks";
import { getPublicationsCollection } from "../src/database/collections/publications";
import { getSharedCollectionsCollection } from "../src/database/collections/shared-collections";
import { getSitesCollection } from "../src/database/collections/sites";

type FaviconDocument = {
  _id: ObjectId;
  id?: string;
  domain?: string;
  url?: string;
  homepageUrl?: string;
  favicon?: string;
};

type FaviconSchema = {
  id?: string;
  domain?: string;
  url?: string;
  homepageUrl?: string;
  favicon?: string;
};

type SharedCollectionDocument = {
  _id: ObjectId;
  id?: string;
  items?: SharedCollectionItem[];
};

type SharedCollectionItem = {
  domain?: string;
  url?: string;
  favicon?: string;
  [key: string]: unknown;
};

type MigrationStats = {
  scanned: number;
  matched: number;
  updated: number;
  skipped: number;
};

const DATA_IMAGE_FAVICON = /^data:image\//;
const MAX_INLINE_FAVICON_BYTES = 4096;
const apply = process.argv.includes("--apply");

function shouldReplaceFavicon(favicon: unknown): favicon is string {
  return (
    typeof favicon === "string" &&
    (DATA_IMAGE_FAVICON.test(favicon) ||
      Buffer.byteLength(favicon) > MAX_INLINE_FAVICON_BYTES)
  );
}

function hostnameFrom(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const text = value.trim();
  try {
    return new URL(text).hostname.replace(/^www\./, "");
  } catch {
    return text.replace(/^www\./, "");
  }
}

function replacementFavicon(domain: unknown, url: unknown): string | null {
  const hostname = hostnameFrom(domain) || hostnameFrom(url);
  if (!hostname) return null;
  const faviconUrl = new URL("https://www.google.com/s2/favicons");
  faviconUrl.searchParams.set("domain", hostname);
  faviconUrl.searchParams.set("sz", "64");
  return faviconUrl.toString();
}

function emptyStats(): MigrationStats {
  return { scanned: 0, matched: 0, updated: 0, skipped: 0 };
}

async function migrateCollection(
  name: string,
  collection: Collection<FaviconSchema>,
): Promise<MigrationStats> {
  const stats = emptyStats();
  const cursor = collection.find<FaviconDocument>(
    { favicon: { $regex: DATA_IMAGE_FAVICON } } as Filter<FaviconSchema>,
    {
      projection: {
        _id: 1,
        id: 1,
        domain: 1,
        url: 1,
        homepageUrl: 1,
        favicon: 1,
      },
    },
  );

  for await (const document of cursor) {
    stats.scanned += 1;
    if (!shouldReplaceFavicon(document.favicon)) continue;
    stats.matched += 1;
    const favicon = replacementFavicon(
      document.domain,
      document.url || document.homepageUrl,
    );
    if (!favicon) {
      stats.skipped += 1;
      continue;
    }
    if (apply) {
      const result = await collection.updateOne(
        { _id: document._id } as Filter<FaviconSchema>,
        { $set: { favicon } },
      );
      if (result.modifiedCount === 1) stats.updated += 1;
      else stats.skipped += 1;
    } else {
      stats.updated += 1;
    }
  }

  console.log(`${name}:`, stats);
  return stats;
}

async function migrateSharedCollections(): Promise<MigrationStats> {
  const stats = emptyStats();
  const collection =
    (await getSharedCollectionsCollection()) as unknown as Collection<SharedCollectionDocument>;
  const cursor = collection.find<SharedCollectionDocument>(
    { "items.favicon": { $regex: DATA_IMAGE_FAVICON } },
    { projection: { _id: 1, id: 1, items: 1 } },
  );

  for await (const document of cursor) {
    stats.scanned += 1;
    let changedItems = 0;
    const items = (document.items || []).map((item) => {
      if (!shouldReplaceFavicon(item.favicon)) return item;
      stats.matched += 1;
      const favicon = replacementFavicon(item.domain, item.url);
      if (!favicon) {
        stats.skipped += 1;
        return item;
      }
      changedItems += 1;
      return { ...item, favicon };
    });

    if (changedItems === 0) continue;
    if (apply) {
      const result = await collection.updateOne(
        { _id: document._id },
        { $set: { items } },
      );
      stats.updated += result.modifiedCount === 1 ? changedItems : 0;
      if (result.modifiedCount !== 1) stats.skipped += changedItems;
    } else {
      stats.updated += changedItems;
    }
  }

  console.log("shared_collections.items:", stats);
  return stats;
}

function sumStats(stats: MigrationStats[]): MigrationStats {
  return stats.reduce(
    (total, item) => ({
      scanned: total.scanned + item.scanned,
      matched: total.matched + item.matched,
      updated: total.updated + item.updated,
      skipped: total.skipped + item.skipped,
    }),
    emptyStats(),
  );
}

async function main(): Promise<void> {
  console.log(
    `Favicon migration ${apply ? "APPLY" : "DRY RUN"} mode. Use --apply to write changes.`,
  );
  const stats = await Promise.all([
    migrateCollection(
      "bookmarks",
      (await getBookmarksCollection()) as unknown as Collection<FaviconSchema>,
    ),
    migrateCollection(
      "sites",
      (await getSitesCollection()) as unknown as Collection<FaviconSchema>,
    ),
    migrateCollection(
      "bookmark_publications",
      (await getPublicationsCollection()) as unknown as Collection<FaviconSchema>,
    ),
    migrateSharedCollections(),
  ]);
  console.log("total:", sumStats(stats));
}

main()
  .catch((error: unknown) => {
    console.error(
      "Favicon migration failed",
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  })
  .finally(() => closeDatabase());
