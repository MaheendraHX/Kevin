import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("GitHub Pages deployment configuration", () => {
  it("builds a repository-prefixed artifact and deploys it with GitHub Actions", async () => {
    const [viteConfig, workflow] = await Promise.all([
      readFile(path.join(projectRoot, "vite.config.ts"), "utf8"),
      readFile(path.join(projectRoot, ".github", "workflows", "deploy-pages.yml"), "utf8"),
    ]);

    expect(viteConfig).toContain('base: process.env.GITHUB_ACTIONS ? "/Kevin/" : "/"');
    expect(viteConfig).toContain('outDir: path.resolve(import.meta.dirname, "dist/public")');
    expect(workflow).toContain("pnpm run build:pages");
    expect(workflow).toContain("actions/upload-pages-artifact@v3");
    expect(workflow).toContain("path: dist/public");
    expect(workflow).toContain("actions/deploy-pages@v4");
  });
});
