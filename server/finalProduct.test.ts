import { describe, expect, it } from "vitest";
import { calculateMaterialReviewState, calculateSuggestedDailyMinutes } from "./db";

describe("final product study planning", () => {
  it("keeps materials-only daily study targets bounded and exam-aware", () => {
    expect(calculateSuggestedDailyMinutes(8, 2, 4)).toBe(15);
    expect(calculateSuggestedDailyMinutes(40, 20, 1)).toBe(90);
    expect(calculateSuggestedDailyMinutes(3, 1, null)).toBeNull();
  });

  it("keeps source review status specific to each material", () => {
    const dueMaterials = new Set([7]);
    const reviewedMaterials = new Set([8]);
    expect(calculateMaterialReviewState(6, false, dueMaterials, reviewedMaterials)).toBe("Not started");
    expect(calculateMaterialReviewState(7, true, dueMaterials, reviewedMaterials)).toBe("Due practice");
    expect(calculateMaterialReviewState(8, true, dueMaterials, reviewedMaterials)).toBe("Reviewed");
    expect(calculateMaterialReviewState(9, true, dueMaterials, reviewedMaterials)).toBe("Ready to review");
  });
});
