import React from "react";
import { Button } from "@/components/ui/button";

export type StudyPackNoticeValue = { tone: "success" | "error"; message: string };

export function StudyPackNotice({ notice, onDismiss }: { notice: StudyPackNoticeValue; onDismiss: () => void }) {
  const error = notice.tone === "error";
  return <div role={error ? "alert" : "status"} className={`mt-5 flex flex-col justify-between gap-3 rounded-2xl border p-4 text-sm sm:flex-row sm:items-center ${error ? "border-destructive/20 bg-destructive/5 text-destructive" : "border-[#78b8a8]/25 bg-[#edf9f4] text-[#45675e]"}`}><p>{notice.message}</p><Button variant="ghost" size="sm" onClick={onDismiss} className={`shrink-0 rounded-full ${error ? "text-destructive hover:bg-destructive/5" : "text-[#45675e] hover:bg-[#dff3eb]"}`}>Dismiss</Button></div>;
}
