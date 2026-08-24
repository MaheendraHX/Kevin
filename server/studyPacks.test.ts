import { describe, expect, it } from "vitest";
import { buildAnkiPack, buildPdfStudyPack, buildStudyPack } from "./studyPacks";

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

  it("creates print-ready PDF bytes and an Anki-compatible tab-separated deck", async () => {
    const pdf = await buildPdfStudyPack({ subjectName: "Physics", kind: "summary", payload: { summary: "Energy is conserved.", citations: citation } });
    const anki = buildAnkiPack({ subjectName: "Physics", payload: { cards: [{ front: "Define energy.", back: "Capacity for work.", citations: citation }] } });
    expect(Buffer.from(pdf.dataBase64, "base64").subarray(0, 4).toString()).toBe("%PDF");
    expect(pdf.fileName).toBe("physics-summary-study-pack.pdf");
    expect(anki.content).toContain("#separator:Tab");
    expect(anki.content).toContain("Define energy.\tCapacity for work.");
  });

  it("returns format-specific errors instead of downloading incomplete exports", async () => {
    expect(() => buildAnkiPack({ subjectName: "Physics", payload: { cards: [] } })).toThrow("Generate flashcards");
    await expect(buildPdfStudyPack({ subjectName: "Physics", kind: "summary", payload: {} })).rejects.toThrow("Generate a summary");
    await expect(buildPdfStudyPack({ subjectName: "Physics", kind: "quiz", payload: { questions: [] } })).rejects.toThrow("Generate a quiz");
  });
});
