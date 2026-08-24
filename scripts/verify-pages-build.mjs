import { access, readFile } from "node:fs/promises";
import path from "node:path";

const outputDir = path.resolve(import.meta.dirname, "..", "dist", "public");
const entryFile = path.join(outputDir, "index.html");

await access(entryFile);

const html = await readFile(entryFile, "utf8");
if (!html.includes('id="launch-kevin"') || !html.includes("https://kevinai-vjva5vux.manus.space")) {
  throw new Error("GitHub Pages artifact does not provide the verified full-stack Kevin destination.");
}

console.log("GitHub Pages artifact contains an accurate full-stack Kevin destination notice.");
