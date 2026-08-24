import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("GitHub Pages hosting notice", () => {
  it("directs visitors to Kevin's verified full-stack application instead of a non-functional static facade", async () => {
    const notice = await readFile(path.resolve(import.meta.dirname, "..", "pages-notice", "index.html"), "utf8");
    expect(notice).toContain('id="launch-kevin"');
    expect(notice).toContain('href="https://kevinai-vjva5vux.manus.space"');
    expect(notice).toContain("GitHub Pages cannot run Kevin’s secure application services");
  });
});
