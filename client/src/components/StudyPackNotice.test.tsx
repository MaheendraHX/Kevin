import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { StudyPackNotice } from "./StudyPackNotice";

describe("StudyPackNotice", () => {
  it("renders accessible success and recovery feedback", () => {
    const success = renderToStaticMarkup(<StudyPackNotice notice={{ tone: "success", message: "Summary study pack downloaded." }} onDismiss={vi.fn()} />);
    const error = renderToStaticMarkup(<StudyPackNotice notice={{ tone: "error", message: "Generate a quiz before exporting it." }} onDismiss={vi.fn()} />);
    expect(success).toContain("Summary study pack downloaded.");
    expect(error).toContain("Generate a quiz before exporting it.");
    expect(error).toContain("Dismiss");
  });
});
