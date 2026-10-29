import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import type { Filter, Sort } from "mongodb";
import type { BookmarkPageQuery, BookmarkResponse } from "@loomark/shared";
import { closeDatabase } from "../src/db";
import { getBookmarksCollection } from "../src/database/collections/bookmarks";
import { getFoldersCollection } from "../src/database/collections/folders";
import { getSitesCollection } from "../src/database/collections/sites";
import { getTagsCollection } from "../src/database/collections/tags";
import { getDashboard, listBookmarksPage } from "../src/store";

type TimedSample = {
  label: string;
  samplesMs: number[];
  p50Ms: number;
  p95Ms: number;
  minMs: number;
  maxMs: number;
};

const iterations = Number(process.env.PERF_ITERATIONS || 5);
const allowDashboardSideEffects = process.env.PERF_ALLOW_DASHBOARD_SIDE_EFFECTS === "1";

function quantile(values: number[], percentile: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.ceil((percentile / 100) * sorted.length) - 1);
  return sorted[index];
}

function roundMs(value: number): number {
  return Math.round(value * 10) / 10;
}

function ownerFingerprint(ownerId: string): string {
  return createHash("sha256").update(ownerId).digest("hex").slice(0, 10);
}

function bytes(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value));
}

function textBytes(value: string): number {
  return Buffer.byteLength(value);
}

async function measure(label: string, fn: () => Promise<unknown>): Promise<TimedSample> {
  await fn();
  const samplesMs: number[] = [];
  for (let index = 0; index < iterations; index += 1) {
    const startedAt = performance.now();
    await fn();
    samplesMs.push(performance.now() - startedAt);
  }
  return {
    label,
    samplesMs: samplesMs.map(roundMs),
    p50Ms: roundMs(quantile(samplesMs, 50)),
    p95Ms: roundMs(quantile(samplesMs, 95)),
    minMs: roundMs(Math.min(...samplesMs)),
    maxMs: roundMs(Math.max(...samplesMs)),
  };
}

function findIndexName(stage: unknown): string | null {
  if (!stage || typeof stage !== "object") return null;
  const value = stage as Record<string, unknown>;
  if (typeof value.indexName === "string") return value.indexName;
  for (const child of Object.values(value)) {
    if (Array.isArray(child)) {
      for (const item of child) {
        const match = findIndexName(item);
        if (match) return match;
      }
    } else {
      const match = findIndexName(child);
      if (match) return match;
    }
  }
  return null;
}

async function explainBookmarksQuery(
  label: string,
  ownerId: string,
  filter: Filter<BookmarkResponse>,
  sort: Sort,
): Promise<Record<string, unknown>> {
  const collection = await getBookmarksCollection();
  const explained = await collection
    .find(filter)
    .sort(sort)
    .limit(9)
    .explain("executionStats");
  const executionStats = explained.executionStats as Record<string, unknown> | undefined;
  const queryPlanner = explained.queryPlanner as Record<string, unknown> | undefined;
  return {
    label,
    ownerHash: ownerFingerprint(ownerId),
    indexName: findIndexName(queryPlanner?.winningPlan),
    executionTimeMillis: executionStats?.executionTimeMillis,
    totalKeysExamined: executionStats?.totalKeysExamined,
    totalDocsExamined: executionStats?.totalDocsExamined,
    nReturned: executionStats?.nReturned,
  };
}

async function main(): Promise<void> {
  const bookmarks = await getBookmarksCollection();
  const folders = await getFoldersCollection();
  const tags = await getTagsCollection();
  const sites = await getSitesCollection();

  const ownerStats = await bookmarks
    .aggregate<{ _id: string; bookmarks: number }>([
      { $group: { _id: "$ownerId", bookmarks: { $sum: 1 } } },
      { $sort: { bookmarks: -1 } },
      { $limit: 1 },
    ])
    .toArray();
  const selectedOwner = ownerStats[0]?._id;
  if (!selectedOwner) {
    console.log(JSON.stringify({ error: "No bookmark owner found; baseline skipped." }, null, 2));
    return;
  }

  const rawBookmarks = await bookmarks.find({ ownerId: selectedOwner }).toArray();
  const rawSites = await sites.find({ ownerId: selectedOwner }).toArray();
  const firstBookmark = rawBookmarks[0];
  const searchTerm = firstBookmark?.domain || firstBookmark?.title || "";
  const legacyFaviconSites = await sites.countDocuments({
    ownerId: selectedOwner,
    favicon: /^https:\/\/www\.google\.com\/s2\/favicons/,
  });
  const canMeasureDashboard = legacyFaviconSites === 0 || allowDashboardSideEffects;
  const pageQuery: BookmarkPageQuery = { page: 1, pageSize: 9, sort: "recent" };
  const searchQuery: BookmarkPageQuery = {
    page: 1,
    pageSize: 9,
    sort: "recent",
    q: searchTerm,
  };

  const [folderCount, tagCount, siteCount] = await Promise.all([
    folders.countDocuments({ ownerId: selectedOwner }),
    tags.countDocuments({ ownerId: selectedOwner }),
    sites.countDocuments({ ownerId: selectedOwner }),
  ]);
  const bookmarkFavicons = rawBookmarks.map((bookmark) => bookmark.favicon || "");
  const siteFavicons = rawSites.map((site) => site.favicon || "");
  const payloadProfile = {
    rawBookmarksBytes: bytes(rawBookmarks),
    rawSitesBytes: bytes(rawSites),
    bookmarkFaviconBytes: bookmarkFavicons.reduce((total, favicon) => total + textBytes(favicon), 0),
    bookmarkDataImageFavicons: bookmarkFavicons.filter((favicon) => favicon.startsWith("data:image/")).length,
    bookmarkMaxFaviconBytes: Math.max(0, ...bookmarkFavicons.map(textBytes)),
    siteFaviconBytes: siteFavicons.reduce((total, favicon) => total + textBytes(favicon), 0),
    siteDataImageFavicons: siteFavicons.filter((favicon) => favicon.startsWith("data:image/")).length,
    siteMaxFaviconBytes: Math.max(0, ...siteFavicons.map(textBytes)),
  };

  const timings: TimedSample[] = [];
  let dashboardPayloadBytes: number | null = null;
  let recentPagePayloadBytes: number | null = null;
  if (canMeasureDashboard) {
    dashboardPayloadBytes = bytes(await getDashboard(selectedOwner));
    timings.push(await measure("store.getDashboard", () => getDashboard(selectedOwner)));
  }
  recentPagePayloadBytes = bytes(await listBookmarksPage(selectedOwner, pageQuery));
  timings.push(await measure("store.listBookmarksPage recent", () => listBookmarksPage(selectedOwner, pageQuery)));
  if (searchTerm) {
    timings.push(await measure("store.listBookmarksPage search", () => listBookmarksPage(selectedOwner, searchQuery)));
  }
  timings.push(
    await measure("store.listBookmarksPage clicks sort", () =>
      listBookmarksPage(selectedOwner, { page: 1, pageSize: 9, sort: "clicks" }),
    ),
  );
  timings.push(
    await measure("store.listBookmarksPage az sort", () =>
      listBookmarksPage(selectedOwner, { page: 1, pageSize: 9, sort: "az" }),
    ),
  );

  const explains = await Promise.all([
    explainBookmarksQuery("recent", selectedOwner, { ownerId: selectedOwner }, { createdAt: -1 }),
    explainBookmarksQuery("clicks", selectedOwner, { ownerId: selectedOwner }, { clicks: -1 }),
    explainBookmarksQuery("az", selectedOwner, { ownerId: selectedOwner }, { title: 1 }),
    searchTerm
      ? explainBookmarksQuery(
          "search",
          selectedOwner,
          {
            ownerId: selectedOwner,
            $or: [
              { title: { $regex: searchTerm, $options: "i" } },
              { domain: { $regex: searchTerm, $options: "i" } },
              { description: { $regex: searchTerm, $options: "i" } },
            ],
          },
          { createdAt: -1 },
        )
      : Promise.resolve(null),
  ]);

  console.log(
    JSON.stringify(
      {
        iterations,
        selectedOwner: {
          hash: ownerFingerprint(selectedOwner),
          bookmarks: ownerStats[0].bookmarks,
          folders: folderCount,
          tags: tagCount,
          sites: siteCount,
          legacyFaviconSites,
        },
        payloadProfile: {
          ...payloadProfile,
          dashboardPayloadBytes,
          recentPagePayloadBytes,
        },
        dashboardMeasurement: canMeasureDashboard
          ? "measured"
          : "skipped: set PERF_ALLOW_DASHBOARD_SIDE_EFFECTS=1 to measure when legacy Google favicon URLs may be fetched and persisted",
        timings,
        explain: explains.filter(Boolean),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closeDatabase());
