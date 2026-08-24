import React from "react";
import { Button } from "@/components/ui/button";
import { BarChart3, ChevronRight } from "lucide-react";

export type WeeklyDigest = {
  totalMinutes: number;
  quizzesTaken: number;
  cardsReviewed: number;
  dueCards: number;
  subjects: Array<{ subjectId: number; subjectName: string; minutes: number; quizzesTaken: number; quizAverage: number | null; cardsReviewed: number; dueCards: number }>;
};

export function WeeklyDigestPanel({ status, digest, onOpenSubject, onRetry }: { status: "loading" | "error" | "ready"; digest?: WeeklyDigest; onOpenSubject: (subjectId: number) => void; onRetry?: () => void }) {
  return <section className="rounded-[1.8rem] border border-white/80 bg-white/50 p-5 sm:p-7">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Seven-day reflection</p><h2 className="mt-1 font-serif text-2xl text-[#484156]">Your week, at a glance.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">A quiet record of the study work you actually completed across each subject.</p></div><span className="grid size-10 place-items-center rounded-2xl bg-[#eee7ff] text-primary"><BarChart3 className="size-5" /></span></div>
    {status === "loading" ? <div aria-label="Loading weekly progress" className="mt-6 h-28 animate-pulse rounded-3xl bg-white/60" /> : status === "error" ? <div role="alert" className="mt-5 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"><p>Your weekly reflection could not load yet.</p>{onRetry ? <Button variant="outline" onClick={onRetry} className="mt-3 rounded-full border-destructive/25 bg-white/70 text-destructive hover:bg-white">Try again</Button> : null}</div> : digest ? <><div className="mt-6 grid gap-3 sm:grid-cols-4"><DigestStat label="Minutes" value={digest.totalMinutes} /><DigestStat label="Quizzes" value={digest.quizzesTaken} /><DigestStat label="Cards reviewed" value={digest.cardsReviewed} /><DigestStat label="Ready now" value={digest.dueCards} /></div>{digest.subjects.length ? <div className="mt-5 grid gap-3 md:grid-cols-2">{digest.subjects.map(subject => <button key={subject.subjectId} onClick={() => onOpenSubject(subject.subjectId)} className="group rounded-2xl border border-white bg-white/60 p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-center justify-between"><p className="font-serif text-xl text-[#4a4357]">{subject.subjectName}</p><ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" /></div><p className="mt-2 text-xs leading-5 text-muted-foreground">{subject.minutes} min · {subject.cardsReviewed} cards reviewed · {subject.quizzesTaken ? `${subject.quizAverage}% quiz average` : "no quiz yet"}</p>{subject.dueCards ? <p className="mt-3 text-xs font-semibold text-primary">{subject.dueCards} card{subject.dueCards === 1 ? "" : "s"} ready to revisit</p> : null}</button>)}</div> : <p className="mt-5 rounded-2xl bg-white/60 p-4 text-sm leading-6 text-muted-foreground">Your first study session will turn this space into a helpful weekly reflection.</p>}</> : null}
  </section>;
}

function DigestStat({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl bg-white/65 p-4"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">{label}</p><p className="mt-1 font-serif text-2xl text-[#4a4357]">{value}</p></div>; }
