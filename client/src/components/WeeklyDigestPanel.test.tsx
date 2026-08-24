import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { WeeklyDigestPanel } from "./WeeklyDigestPanel";

const digest = { totalMinutes: 42, quizzesTaken: 2, cardsReviewed: 6, dueCards: 3, subjects: [{ subjectId: 7, subjectName: "Chemistry", minutes: 42, quizzesTaken: 2, quizAverage: 80, cardsReviewed: 6, dueCards: 3 }] };

describe("WeeklyDigestPanel", () => {
  it("renders actual weekly metrics and a subject-level due review cue", () => {
    const markup = renderToStaticMarkup(<WeeklyDigestPanel status="ready" digest={digest} onOpenSubject={vi.fn()} />);
    expect(markup).toContain("Your week, at a glance.");
    expect(markup).toContain("Chemistry");
    expect(markup).toContain("3 cards ready to revisit");
  });

  it("renders a calm empty state and a recoverable error state", () => {
    const empty = renderToStaticMarkup(<WeeklyDigestPanel status="ready" digest={{ ...digest, subjects: [] }} onOpenSubject={vi.fn()} />);
    const error = renderToStaticMarkup(<WeeklyDigestPanel status="error" onOpenSubject={vi.fn()} onRetry={vi.fn()} />);
    expect(empty).toContain("Your first study session");
    expect(error).toContain("Your weekly reflection could not load yet.");
    expect(error).toContain("Try again");
  });
});
