import { cp, mkdir } from "node:fs/promises";
await mkdir("dist", { recursive: true });
for (const file of ["manifest.json", "popup.html", "popup.js"]) await cp(file, `dist/${file}`);
console.log("Extension copied to extension/dist");
