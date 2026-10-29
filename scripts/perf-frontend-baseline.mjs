import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { gzipSync } from "node:zlib";

const rootDir = resolve(import.meta.dirname, "..");
const nextDir = resolve(rootDir, "frontend/.next");
const staticDir = join(nextDir, "static");
const standaloneDir = join(nextDir, "standalone");
const appBuildManifestPath = join(nextDir, "app-build-manifest.json");

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = units.shift();
  while (value >= 1024 && units.length) {
    value /= 1024;
    unit = units.shift();
  }
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${unit}`;
}

function walkFiles(dir) {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walkFiles(path) : [path];
  });
}

function directorySize(dir) {
  return walkFiles(dir).reduce((total, file) => total + statSync(file).size, 0);
}

function fileRecord(file) {
  const bytes = statSync(file).size;
  const content = readFileSync(file);
  return {
    path: relative(rootDir, file),
    bytes,
    gzipBytes: gzipSync(content).byteLength,
  };
}

function printTable(title, rows) {
  console.log(`\n${title}`);
  for (const row of rows) {
    const gzip = row.gzipBytes === undefined ? "" : ` gzip=${formatBytes(row.gzipBytes)}`;
    console.log(`- ${formatBytes(row.bytes).padStart(9)}${gzip.padEnd(18)} ${row.path}`);
  }
}

if (!existsSync(nextDir)) {
  console.error("Missing frontend/.next. Run `pnpm build:frontend` first.");
  process.exitCode = 1;
} else {
  const staticFiles = walkFiles(staticDir)
    .filter((file) => /\.(js|css)$/.test(file))
    .map(fileRecord)
    .sort((left, right) => right.bytes - left.bytes);

  const manifest = existsSync(appBuildManifestPath)
    ? JSON.parse(readFileSync(appBuildManifestPath, "utf8"))
    : { pages: {} };
  const rootRouteAssets = (manifest.pages?.["/page"] || manifest.pages?.["/"] || [])
    .map((asset) => join(nextDir, asset))
    .filter(existsSync)
    .map(fileRecord);
  const rootRouteBytes = rootRouteAssets.reduce((total, asset) => total + asset.bytes, 0);
  const rootRouteGzipBytes = rootRouteAssets.reduce((total, asset) => total + asset.gzipBytes, 0);

  console.log("Frontend P0 baseline");
  console.log(`- .next: ${formatBytes(directorySize(nextDir))}`);
  console.log(`- .next/static: ${formatBytes(directorySize(staticDir))}`);
  console.log(`- .next/standalone: ${formatBytes(directorySize(standaloneDir))}`);
  console.log(`- root route manifest assets: ${formatBytes(rootRouteBytes)} raw, ${formatBytes(rootRouteGzipBytes)} gzip`);
  console.log(`- root route asset count: ${rootRouteAssets.length}`);

  printTable("Root route assets", rootRouteAssets.sort((left, right) => right.bytes - left.bytes));
  printTable("Largest static JS/CSS assets", staticFiles.slice(0, 20));
}
