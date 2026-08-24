import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DueReviewBanner } from "./DueReviewBanner";

describe("DueReviewBanner", () => {
  it("renders an actionable due-review entry point", () => {
    const markup = renderToStaticMarkup(<DueReviewBanner status="ready" dueCount={3} onStart={vi.fn()} />);
    expect(markup).toContain("3 cards ready now.");
    expect(markup).toContain("Start due review");
  });

  it("renders helpful empty and retryable error states", () => {
    const empty = renderToStaticMarkup(<DueReviewBanner status="ready" dueCount={0} onStart={vi.fn()} />);
    const error = renderToStaticMarkup(<DueReviewBanner status="error" dueCount={0} onStart={vi.fn()} onRetry={vi.fn()} />);
    expect(empty).toContain("caught up for now");
    expect(error).toContain("due reviews could not load");
    expect(error).toContain("Try again");
  });
});
