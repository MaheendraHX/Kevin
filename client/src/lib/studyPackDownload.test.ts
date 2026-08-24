import { describe, expect, it, vi } from "vitest";
import { downloadStudyPack } from "./studyPackDownload";

describe("downloadStudyPack", () => {
  it("creates a download with the server-provided file name and releases its temporary URL", () => {
    const link = { href: "", download: "", click: vi.fn(), remove: vi.fn() };
    const host = { document: { createElement: vi.fn(() => link), body: { appendChild: vi.fn() } }, URL: { createObjectURL: vi.fn(() => "blob:study-pack"), revokeObjectURL: vi.fn() } };
    downloadStudyPack({ fileName: "algorithms-summary-study-pack.md", content: "# Pack", contentType: "text/markdown" }, host as never);
    expect(link.download).toBe("algorithms-summary-study-pack.md");
    expect(link.click).toHaveBeenCalledOnce();
    expect(host.URL.revokeObjectURL).toHaveBeenCalledWith("blob:study-pack");
  });

  it("accepts binary base64 payloads for print-ready PDF exports", () => {
    const link = { href: "", download: "", click: vi.fn(), remove: vi.fn() };
    const host = { document: { createElement: vi.fn(() => link), body: { appendChild: vi.fn() } }, URL: { createObjectURL: vi.fn(() => "blob:pdf-pack"), revokeObjectURL: vi.fn() } };
    downloadStudyPack({ fileName: "physics-summary-study-pack.pdf", dataBase64: "JVBERg==", contentType: "application/pdf" }, host as never);
    expect(link.download).toBe("physics-summary-study-pack.pdf");
    expect(link.click).toHaveBeenCalledOnce();
  });
});
