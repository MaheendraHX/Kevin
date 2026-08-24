import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  insights: { isLoading: false, isError: false, refetch: vi.fn(), data: null as any },
  mutation: { isPending: false, mutate: vi.fn() },
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    study: {
      archiveMaterial: { useMutation: () => state.mutation },
      deleteMaterial: { useMutation: () => state.mutation },
      updateMaterial: { useMutation: () => state.mutation },
      reprocessPdf: { useMutation: () => state.mutation },
      insights: { useQuery: () => state.insights },
      createExam: { useMutation: () => state.mutation },
      deleteExam: { useMutation: () => state.mutation },
      resolveMistake: { useMutation: () => state.mutation },
    },
  },
}));

import { MaterialLibrary } from "./MaterialLibrary";
import { StudyGrowthPanel } from "./StudyGrowthPanel";

describe("Kevin final study workflows", () => {
  it("renders searchable, source-anchored material organization controls", () => {
    const markup = renderToStaticMarkup(<MaterialLibrary subjectId={1} onChanged={vi.fn()} materials={[{ id: 42, title: "Cellular biology", sourceType: "pdf", folder: "Week 4", tags: ["definitions", "exam"], version: 2, archivedAt: null, pageCount: 18, processingStatus: "ready" }]} archivedMaterials={[]} />);
    expect(markup).toContain("Organized source library");
    expect(markup).toContain('id="material-42"');
    expect(markup).toContain("Week 4");
    expect(markup).toContain("definitions");
    expect(markup).toContain("Archive");
  });

  it("renders coverage, review status, and a source-return action for mistakes", () => {
    state.insights = { isLoading: false, isError: false, refetch: vi.fn(), data: { dueCards: 3, unresolvedMistakes: 1, upcomingExam: null, daysToExam: null, suggestedDailyMinutes: null, exams: [], coverage: [{ materialId: 42, title: "Cellular biology", version: 2, summary: true, flashcards: true, quiz: false, reviewState: "Due practice" }], mistakes: [{ id: 9, prompt: "What does ATP store?", answer: "Usable cellular energy.", citations: [{ materialId: 42, materialTitle: "Cellular biology", pageNumber: 3 }], resolvedAt: null }] } };
    const markup = renderToStaticMarkup(<StudyGrowthPanel subjectId={1} onChanged={vi.fn()} onOpenMaterial={vi.fn()} />);
    expect(markup).toContain("Source coverage");
    expect(markup).toContain("Due practice");
    expect(markup).toContain("Mistake notebook");
    expect(markup).toContain("Open Cellular biology · p. 3");
  });

  it("renders a recoverable plan error state", () => {
    state.insights = { isLoading: false, isError: true, refetch: vi.fn(), data: null };
    const markup = renderToStaticMarkup(<StudyGrowthPanel subjectId={1} onChanged={vi.fn()} onOpenMaterial={vi.fn()} />);
    expect(markup).toContain("Your study plan could not load.");
    expect(markup).toContain("Try again");
  });
});
