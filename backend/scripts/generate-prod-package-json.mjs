import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const backendDir = resolve(import.meta.dirname, "..");
const outDir = process.argv[2];
if (!outDir) {
  console.error("Usage: node generate-prod-package-json.mjs <output-dir>");
  process.exit(1);
}

const srcPkg = JSON.parse(readFileSync(resolve(backendDir, "package.json"), "utf-8"));
const externalRuntimeDependencies = [
  "@trpc/server",
  "dotenv",
  "jose",
  "mongodb",
  "undici",
];
const prodPkg = {
  name: srcPkg.name,
  version: srcPkg.version,
  private: true,
  type: srcPkg.type,
  scripts: { start: "node dist/server.js" },
  dependencies: Object.fromEntries(
    externalRuntimeDependencies.map((name) => {
      const version = srcPkg.dependencies[name];
      if (!version)
        throw new Error(`Missing external runtime dependency: ${name}`);
      return [name, version];
    }),
  ),
  engines: srcPkg.engines,
};

writeFileSync(resolve(outDir, "package.json"), JSON.stringify(prodPkg, null, 2));
