import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { BrainCircuit, PencilLine, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Card = { id: string; front: string; back: string };
type StudySet = { id: number; kind: "summary" | "flashcards" | "quiz"; payload: unknown };

function cards(payload: unknown): Card[] { return payload && typeof payload === "object" && Array.isArray((payload as { cards?: unknown[] }).cards) ? (payload as { cards: Card[] }).cards : []; }

export function PracticeStudio({ subjectId, studySets, edits, onChanged }: { subjectId: number; studySets: StudySet[]; edits: Array<{ studySetId: number; cardIndex: number; front: string; back: string }>; onChanged: () => void }) {
  const flashSet = useMemo(() => studySets.find(set => set.kind === "flashcards"), [studySets]);
  const deck = useMemo(() => cards(flashSet?.payload).map((card, index) => { const edit = edits.find(item => item.studySetId === flashSet?.id && item.cardIndex === index); return edit ? { ...card, front: edit.front, back: edit.back } : card; }), [flashSet, edits]);
  const [cardIndex, setCardIndex] = useState(0);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [rating, setRating] = useState<"easy" | "hard" | "review_again">("hard");
  const [confidence, setConfidence] = useState<"low" | "steady" | "high">("steady");
  const selected = deck[cardIndex];
  useEffect(() => { setCardIndex(index => Math.min(index, Math.max(0, deck.length - 1))); }, [deck.length]);
  useEffect(() => { setFront(selected?.front || ""); setBack(selected?.back || ""); }, [selected?.id]);
  const quiz = trpc.study.generateQuiz.useMutation({ onSuccess: () => { toast.success("Your grounded quiz is ready."); onChanged(); }, onError: error => toast.error(error.message) });
  const edit = trpc.study.editFlashcard.useMutation({ onSuccess: () => { toast.success("Flashcard wording updated."); onChanged(); }, onError: error => toast.error(error.message) });
  const review = trpc.study.reviewFlashcard.useMutation({ onSuccess: () => { toast.success("Confidence-aware review saved."); onChanged(); }, onError: error => toast.error(error.message) });
  return <section className="mt-6 rounded-[1.8rem] border border-white/80 bg-white/55 p-5 sm:p-6"><p className="text-[10px] font-bold uppercase tracking-[0.17em] text-muted-foreground">Refine your practice</p><h2 className="mt-1 font-serif text-3xl text-[#4a4357]">Set the challenge, then make it yours</h2><div className="mt-5 grid gap-6 lg:grid-cols-2"><div className="rounded-2xl bg-[#f4effc] p-5"><BrainCircuit className="size-5 text-primary" /><h3 className="mt-3 font-serif text-2xl text-[#4a4357]">Choose quiz difficulty</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Each option still uses only the sources in this subject.</p><div className="mt-4 flex flex-wrap gap-2">{([['gentle', 'Gentle'], ['standard', 'Standard'], ['challenging', 'Challenging']] as const).map(([difficulty, label]) => <Button key={difficulty} type="button" variant={difficulty === "standard" ? "default" : "outline"} disabled={quiz.isPending} onClick={() => quiz.mutate({ subjectId, count: 5, difficulty })} className="rounded-full">{quiz.isPending ? <Sparkles className="mr-1.5 size-3.5 animate-spin" /> : null}{label}</Button>)}</div></div><div className="rounded-2xl border border-white bg-white/65 p-5"><PencilLine className="size-5 text-primary" /><h3 className="mt-3 font-serif text-2xl text-[#4a4357]">Edit your recall deck</h3>{flashSet && selected ? <div className="mt-4 space-y-3"><Label htmlFor="practice-card">Card</Label><select id="practice-card" value={cardIndex} onChange={event => setCardIndex(Number(event.target.value))} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm">{deck.map((card, index) => <option key={card.id} value={index}>Card {index + 1}: {card.front.slice(0, 52)}</option>)}</select><Textarea value={front} onChange={event => setFront(event.target.value)} className="min-h-20" aria-label="Flashcard prompt" /><Textarea value={back} onChange={event => setBack(event.target.value)} className="min-h-24" aria-label="Flashcard answer" /><div className="flex flex-wrap gap-2"><Button type="button" onClick={() => edit.mutate({ studySetId: flashSet.id, cardIndex, front, back })} disabled={edit.isPending || front.trim().length < 2 || back.trim().length < 2} className="rounded-full">Save wording</Button><select value={rating} onChange={event => setRating(event.target.value as typeof rating)} className="h-10 rounded-full border border-input bg-background px-3 text-sm"><option value="review_again">Review again</option><option value="hard">Hard</option><option value="easy">Easy</option></select><select value={confidence} onChange={event => setConfidence(event.target.value as typeof confidence)} className="h-10 rounded-full border border-input bg-background px-3 text-sm"><option value="low">Low confidence</option><option value="steady">Steady confidence</option><option value="high">High confidence</option></select><Button type="button" variant="outline" onClick={() => review.mutate({ studySetId: flashSet.id, cardIndex, rating, confidence })} disabled={review.isPending} className="rounded-full">Log review</Button></div></div> : <p className="mt-4 rounded-2xl bg-[#faf8fd] p-4 text-sm text-muted-foreground">Generate flashcards first, then you can refine the wording and record how confident you felt on each review.</p>}</div></div></section>;
}
