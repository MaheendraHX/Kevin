import { describe, expect, it } from "vitest";
import { isPdfUploadFile, mergeUniquePdfFiles } from "./materialBatch";

const pdf = { name: "Module 1.pdf", type: "application/pdf", size: 100, lastModified: 1 } as File;
const secondPdf = { name: "Module 2.pdf", type: "application/pdf", size: 101, lastModified: 2 } as File;
const extensionOnlyPdf = { name: "Module 3.PDF", type: "", size: 102, lastModified: 3 } as File;
const text = { name: "notes.txt", type: "text/plain", size: 20, lastModified: 4 } as File;

describe("multi-module PDF intake", () => {
  it("accepts PDFs by MIME type or filename extension", () => {
    expect(isPdfUploadFile(pdf)).toBe(true);
    expect(isPdfUploadFile(extensionOnlyPdf)).toBe(true);
    expect(isPdfUploadFile(text)).toBe(false);
  });

  it("keeps a batch queue unique while excluding non-PDF selections", () => {
    expect(mergeUniquePdfFiles([pdf], [pdf, secondPdf, extensionOnlyPdf, text])).toEqual([secondPdf, extensionOnlyPdf]);
  });
});
