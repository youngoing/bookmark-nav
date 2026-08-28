import { build } from "esbuild";
import { mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = resolve(import.meta.dirname, "..");
const outDir = resolve(rootDir, "dist");

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

await build({
  entryPoints: [resolve(rootDir, "src/server.ts")],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  outfile: resolve(outDir, "server.js"),
  // Bundle the workspace package @loomark/shared, but keep npm dependencies
  // external so native modules (e.g. mongodb) are loaded from node_modules.
  external: ["mongodb", "@trpc/server", "jose", "dotenv", "undici"],
  minify: true,
  sourcemap: false,
});

console.log(`Backend built: ${outDir}/server.js`);
