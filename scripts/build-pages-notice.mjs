import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const sourceDir = path.join(projectRoot, "pages-notice");
const outputDir = path.join(projectRoot, "dist", "public");

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
await cp(sourceDir, outputDir, { recursive: true });

console.log("Built the GitHub Pages hosting notice.");
