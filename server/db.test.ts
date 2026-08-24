import { describe, expect, it } from "vitest";
import { calculateWeeklyDigest } from "./db";

describe("calculateWeeklyDigest", () => {
  it("aggregates actual learning activity by subject and preserves due-card priorities", () => {
    const digest = calculateWeeklyDigest({
      subjects: [{ id: 1, name: "Algorithms" }, { id: 2, name: "Biology" }],
      sessions: [{ subjectId: 1, minutes: 25 }, { subjectId: 1, minutes: 15 }, { subjectId: 2, minutes: 40 }],
      attempts: [{ subjectId: 1, score: 4, totalQuestions: 5 }, { subjectId: 1, score: 3, totalQuestions: 5 }],
      reviews: [{ subjectId: 1 }, { subjectId: 1 }, { subjectId: 2 }],
      dueCards: [{ studySet: { subjectId: 1 } }, { studySet: { subjectId: 2 } }, { studySet: { subjectId: 2 } }],
    });
    expect(digest).toMatchObject({ totalMinutes: 80, quizzesTaken: 2, cardsReviewed: 3, dueCards: 3 });
    expect(digest.subjects).toEqual([
      expect.objectContaining({ subjectName: "Algorithms", minutes: 40, quizzesTaken: 2, quizAverage: 70, cardsReviewed: 2, dueCards: 1 }),
      expect.objectContaining({ subjectName: "Biology", minutes: 40, quizzesTaken: 0, quizAverage: null, cardsReviewed: 1, dueCards: 2 }),
    ]);
  });
});
