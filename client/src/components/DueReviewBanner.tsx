import React from "react";
import { Button } from "@/components/ui/button";

export function DueReviewBanner({ status, dueCount, onStart, onRetry }: { status: "ready" | "error"; dueCount: number; onStart: () => void; onRetry?: () => void }) {
  if (status === "error") return <div role="alert" className="mt-5 flex flex-col justify-between gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive sm:flex-row sm:items-center"><p>Your due reviews could not load right now.</p>{onRetry ? <Button variant="outline" onClick={onRetry} className="shrink-0 rounded-full border-destructive/25 bg-white/70 text-destructive hover:bg-white">Try again</Button> : null}</div>;
  if (!dueCount) return <p role="status" className="mt-5 rounded-2xl bg-[#f5f0fc]/70 p-4 text-sm leading-6 text-muted-foreground">You are caught up for now. Generate a fresh deck whenever you are ready for another gentle recall session.</p>;
  return <div className="mt-5 flex flex-col justify-between gap-3 rounded-2xl border border-primary/15 bg-[#f5f0fc]/80 p-4 sm:flex-row sm:items-center"><p className="text-sm text-[#5a5068]"><span className="font-semibold text-primary">{dueCount} card{dueCount === 1 ? "" : "s"} ready now.</span> Start with the card Kevin scheduled for your next recall.</p><Button onClick={onStart} variant="outline" className="shrink-0 rounded-full border-primary/20 bg-white/70 text-primary hover:bg-white">Start due review</Button></div>;
}
