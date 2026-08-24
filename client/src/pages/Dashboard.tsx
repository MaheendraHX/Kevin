import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { BookOpen, ChevronRight, Clock3, FileText, Plus, Sparkles, Trophy } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const accentOptions = ["lavender", "blush", "mint"] as const;

function SubjectDialog({ onCreated }: { onCreated: (id: number) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [accent, setAccent] = useState<(typeof accentOptions)[number]>("lavender");
  const createSubject = trpc.study.createSubject.useMutation({
    onSuccess: subject => {
      toast.success("Subject created");
      setOpen(false); setName(""); setDescription(""); onCreated(subject.id);
    },
    onError: error => toast.error(error.message),
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    createSubject.mutate({ name, description: description || undefined, accent });
  };
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button className="rounded-full px-5"><Plus className="mr-2 size-4" /> New subject</Button></DialogTrigger>
    <DialogContent className="border-white/70 bg-[#fcfbff]/95 sm:max-w-md">
      <form onSubmit={submit} className="space-y-5">
        <DialogHeader><DialogTitle className="font-serif text-3xl text-[#484156]">Make space for a subject</DialogTitle><DialogDescription>Give this study area a calm, clear starting point.</DialogDescription></DialogHeader>
        <div className="space-y-2"><Label htmlFor="subject-name">Subject name</Label><Input id="subject-name" value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Cognitive Psychology" autoFocus maxLength={120} required /></div>
        <div className="space-y-2"><Label htmlFor="subject-description">A small intention <span className="text-muted-foreground">(optional)</span></Label><Textarea id="subject-description" value={description} onChange={event => setDescription(event.target.value)} placeholder="What are you working toward?" maxLength={700} /></div>
        <fieldset className="space-y-2"><legend className="text-sm font-medium">Tone</legend><div className="flex gap-2">{accentOptions.map(option => <button type="button" key={option} onClick={() => setAccent(option)} className={`size-9 rounded-full border-2 transition-transform hover:scale-105 ${accent === option ? "border-primary ring-2 ring-primary/20" : "border-white"} accent-${option}`} aria-label={`Use ${option} accent`} />)}</div></fieldset>
        <DialogFooter><Button type="submit" disabled={createSubject.isPending} className="rounded-full px-5">{createSubject.isPending ? "Creating…" : "Create subject"}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}

export default function Dashboard() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const dashboard = trpc.study.dashboard.useQuery(undefined, { enabled: isAuthenticated });
  const data = dashboard.data;
  const created = (id: number) => { utils.study.dashboard.invalidate(); setLocation(`/subject/${id}`); };

  return <DashboardLayout>
    <div className="mx-auto w-full max-w-6xl space-y-8 pb-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/45 px-6 py-8 shadow-[0_16px_48px_rgba(79,64,103,0.09)] backdrop-blur-sm sm:px-8">
        <div className="absolute -right-24 -top-20 size-64 rounded-full bg-[#eadbff]/65 blur-3xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary/75">Your learning studio</p><h1 className="mt-2 font-serif text-4xl tracking-tight text-[#463f53] sm:text-5xl">Give your thinking room.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Organize the materials that matter, then return to them through small, grounded moments of practice.</p></div>
          <SubjectDialog onCreated={created} />
        </div>
      </section>

      {dashboard.isLoading ? <div className="grid gap-4 md:grid-cols-3">{[1, 2, 3].map(value => <div key={value} className="h-36 animate-pulse rounded-3xl bg-white/45" />)}</div> : dashboard.isError ? <div role="alert" className="rounded-3xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive"><p>Your workspace could not load.</p><Button variant="outline" onClick={() => dashboard.refetch()} className="mt-4 rounded-full border-destructive/25 bg-white/70 text-destructive hover:bg-white">Try again</Button></div> : data ? <>
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={BookOpen} label="Subjects" value={data.subjects.length} tint="lavender" />
          <Stat icon={FileText} label="Materials" value={data.recentMaterials.length} tint="mint" />
          <Stat icon={Trophy} label="Quiz average" value={data.attempts.length ? `${data.averageQuizScore}%` : "—"} tint="blush" />
          <Stat icon={Clock3} label="Study minutes" value={data.studyMinutes || "—"} tint="lavender" />
        </section>

        <section className="grid gap-7 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-[1.8rem] border border-white/80 bg-white/50 p-5 sm:p-7">
            <div className="mb-5 flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Your subjects</p><h2 className="mt-1 font-serif text-2xl text-[#484156]">Where you are studying</h2></div><Sparkles className="size-5 text-primary/55" /></div>
            {data.subjects.length ? <div className="space-y-3">{data.subjects.map(subject => <button key={subject.id} onClick={() => setLocation(`/subject/${subject.id}`)} className="group flex w-full items-center gap-4 rounded-2xl border border-white bg-white/60 p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><span className={`grid size-11 place-items-center rounded-2xl accent-${subject.accent}`}><BookOpen className="size-5 text-[#5d5670]" /></span><span className="min-w-0 flex-1"><span className="block truncate font-serif text-xl text-[#4a4357]">{subject.name}</span><span className="mt-1 block truncate text-xs text-muted-foreground">{subject.description || "A quiet place to collect your learning."}</span></span><ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" /></button>)}</div> : <div className="rounded-2xl border border-dashed border-primary/20 bg-[#f8f5fc]/70 p-8 text-center"><BookOpen className="mx-auto size-6 text-primary/55" /><p className="mt-3 font-serif text-xl text-[#51495f]">Start with one subject.</p><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Create a subject for the class or topic you want to make easier to revisit.</p><div className="mt-5"><SubjectDialog onCreated={created} /></div></div>}
          </div>
          <div className="rounded-[1.8rem] border border-white/80 bg-[linear-gradient(145deg,rgba(240,249,246,0.78),rgba(255,246,249,0.68))] p-6"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#65867e]">Study rhythm</p><h2 className="mt-1 font-serif text-2xl text-[#49485a]">Small steps add up.</h2><div className="mt-8 space-y-6"><div><div className="flex items-baseline justify-between"><span className="text-sm text-muted-foreground">Flashcard reflections</span><span className="font-serif text-2xl text-[#4f665f]">{data.reviewCount}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/80"><div className="h-full rounded-full bg-[#89c8b7]" style={{ width: `${Math.min(100, data.reviewCount * 7)}%` }} /></div></div><p className="rounded-2xl bg-white/60 p-4 text-sm leading-6 text-[#636170]">Kevin keeps your generated study work within the subject where it belongs — ready when you are.</p></div></div>
        </section>
      </> : null}
    </div>
  </DashboardLayout>;
}

function Stat({ icon: Icon, label, value, tint }: { icon: typeof BookOpen; label: string; value: string | number; tint: string }) {
  return <div className="rounded-3xl border border-white/80 bg-white/50 p-5"><div className={`grid size-9 place-items-center rounded-2xl accent-${tint}`}><Icon className="size-4 text-[#5d5670]" /></div><p className="mt-5 text-[10px] font-bold uppercase tracking-[0.17em] text-muted-foreground">{label}</p><p className="mt-1 font-serif text-3xl text-[#4a4357]">{value}</p></div>;
}
