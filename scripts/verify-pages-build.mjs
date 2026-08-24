import { access, readFile } from "node:fs/promises";
import path from "node:path";

const outputDir = path.resolve(import.meta.dirname, "..", "dist", "public");
const entryFile = path.join(outputDir, "index.html");

await access(entryFile);

const html = await readFile(entryFile, "utf8");
if (!html.includes("/Kevin/assets/")) {
  throw new Error("GitHub Pages build did not generate repository-prefixed asset paths.");
}

console.log("GitHub Pages artifact contains index.html with repository-prefixed assets.");
