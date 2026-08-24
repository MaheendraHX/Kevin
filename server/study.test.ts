import { describe, expect, it } from "vitest";
import { checkAnswer, gradeQuizAnswers, makeChunks, resolveCitations, scheduleFlashcardReview, selectRelevantSources, selectRepresentativeSources, type SourceChunk } from "./study";

const sources: SourceChunk[] = [
  { id: 1, materialId: 1, materialTitle: "Attention notes", pageNumber: 2, chunkIndex: 0, content: "Attention selects information for further processing. Selective attention can reduce distraction while working on a task." },
  { id: 2, materialId: 1, materialTitle: "Attention notes", pageNumber: 3, chunkIndex: 1, content: "Working memory temporarily maintains relevant information. It is capacity limited and supports conscious problem solving." },
  { id: 3, materialId: 2, materialTitle: "Memory reading", pageNumber: 7, chunkIndex: 0, content: "Retrieval practice strengthens later recall when a learner actively brings information to mind rather than only rereading it." },
];

describe("study source selection", () => {
  it("breaks pasted material into stable, non-empty chunks", () => {
    const material = "A ".repeat(1400);
    const chunks = makeChunks(material, null, 0);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every(chunk => chunk.content.length >= 80)).toBe(true);
  });

  it("retrieves excerpts that match the student question", () => {
    const selected = selectRelevantSources(sources, "How does working memory support problem solving?");
    expect(selected.map(source => source.id)).toContain(2);
    expect(selected.every(source => sources.includes(source))).toBe(true);
  });

  it("selects representative excerpts from separate materials for study-set generation", () => {
    const selected = selectRepresentativeSources(sources, 3);
    expect(selected).toHaveLength(3);
    expect(new Set(selected.map(source => source.materialId)).size).toBe(2);
    expect(selected.every(source => sources.includes(source))).toBe(true);
  });

  it("only resolves citations from the excerpts allowed for the request", () => {
    const allowed = [sources[0], sources[2]];
    const citations = resolveCitations([1, 2, 3, 999], allowed);
    expect(citations.map(citation => citation.chunkId)).toEqual([1, 3]);
    expect(citations.every(citation => [1, 3].includes(citation.chunkId))).toBe(true);
  });
});

describe("quiz answer checking", () => {
  it("accepts exact options and their letter shorthand", () => {
    expect(checkAnswer("Working memory", "working memory", [])).toBe(true);
    expect(checkAnswer("Working memory", "b", ["Long-term memory", "Working memory"])).toBe(true);
    expect(checkAnswer("Working memory", "attention", ["Long-term memory", "Working memory"])).toBe(false);
  });

  it("scores a complete quiz attempt and preserves feedback sources", () => {
    const result = gradeQuizAnswers([
      { id: "one", answer: "Attention", options: ["Attention", "Memory"], explanation: "The source defines attention.", citations: [{ chunkId: 1, materialId: 1, materialTitle: "Attention notes", pageNumber: 2, excerpt: "Attention selects information." }] },
      { id: "two", answer: "Retrieval practice", options: [], explanation: "The source explains retrieval practice.", citations: [{ chunkId: 3, materialId: 2, materialTitle: "Memory reading", pageNumber: 7, excerpt: "Retrieval practice strengthens recall." }] },
    ], { one: "a", two: "retrieval practice" });
    expect(result.score).toBe(2);
    expect(result.feedback).toHaveLength(2);
    expect(result.feedback[1].citations[0].chunkId).toBe(3);
  });

  it("schedules hard, easy, and repeat reviews at increasing recall intervals", () => {
    const reviewedAt = new Date("2026-08-24T00:00:00.000Z");
    const retry = scheduleFlashcardReview(undefined, "review_again", reviewedAt);
    const hard = scheduleFlashcardReview(undefined, "hard", reviewedAt);
    const easy = scheduleFlashcardReview({ repetition: 1, intervalDays: 1, easeFactor: 250 }, "easy", reviewedAt);
    expect(retry.dueAt.getTime() - reviewedAt.getTime()).toBe(10 * 60 * 1000);
    expect(hard.intervalDays).toBe(1);
    expect(easy.intervalDays).toBe(4);
    expect(easy.dueAt.getTime()).toBeGreaterThan(hard.dueAt.getTime());
  });
});
