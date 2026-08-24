import { describe, expect, it } from "vitest";
import { buildStudyPack } from "./studyPacks";

const citation = [{ materialTitle: "Week 3 notes", pageNumber: 4, excerpt: "A concise source excerpt." }];

describe("buildStudyPack", () => {
  it("creates source-grounded summary, flashcard, and answer-key exports", () => {
    const summary = buildStudyPack({ subjectName: "Physics", kind: "summary", payload: { summary: "Energy is conserved.", citations: citation } });
    const cards = buildStudyPack({ subjectName: "Physics", kind: "flashcards", payload: { cards: [{ front: "Define energy.", back: "Capacity for work.", citations: citation }] } });
    const quiz = buildStudyPack({ subjectName: "Physics", kind: "quiz", payload: { questions: [{ prompt: "What is conserved?", options: ["Energy", "Mass"], answer: "Energy", explanation: "The source names energy.", citations: citation }] } });
    expect(summary.content).toContain("Source notes");
    expect(summary).toMatchObject({ fileName: "physics-summary-study-pack.md", contentType: "text/markdown;charset=utf-8" });
    expect(cards.content).toContain("**Prompt**");
    expect(quiz.content).toContain("Answer key");
    expect(quiz.content).toContain("Week 3 notes, page 4");
  });

  it("does not produce an empty export", () => {
    expect(() => buildStudyPack({ subjectName: "Physics", kind: "flashcards", payload: { cards: [] } })).toThrow("Generate flashcards");
  });
});
