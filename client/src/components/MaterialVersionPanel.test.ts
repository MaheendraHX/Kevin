import { describe, expect, it } from "vitest";
import { getRevisionLineage } from "./MaterialVersionPanel";

describe("material revision lineage", () => {
  it("follows persisted supersession links even when a revision is renamed", () => {
    const lineage = getRevisionLineage([
      { id: 1, title: "Original notes", sourceType: "text", version: 1, supersedesMaterialId: null, archivedAt: null },
      { id: 2, title: "Clarified notes", sourceType: "text", version: 2, supersedesMaterialId: 1, archivedAt: null },
      { id: 3, title: "Exam-ready notes", sourceType: "text", version: 3, supersedesMaterialId: 2, archivedAt: null },
      { id: 4, title: "Original notes", sourceType: "text", version: 1, supersedesMaterialId: null, archivedAt: null },
    ], 3);
    expect(lineage.map(item => item.id)).toEqual([1, 2, 3]);
  });
});
