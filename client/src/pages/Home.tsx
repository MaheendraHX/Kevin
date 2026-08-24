import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import { ArrowRight, BookOpenCheck, BrainCircuit, FileText, Moon, ShieldCheck, Sparkles, Sun } from "lucide-react";
import { useLocation } from "wouter";

const benefits = [
  { icon: FileText, title: "Keep your sources close", text: "Upload a PDF or paste your notes. Kevin keeps each material inside its subject workspace." },
  { icon: BrainCircuit, title: "Study from what you know", text: "Ask focused questions, generate summaries, and practise recall without drifting beyond your source material." },
  { icon: ShieldCheck, title: "Grounded by design", text: "Every AI answer points back to the material used, so you can verify what you are learning." },
];

export default function Home() {
  const { isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [, setLocation] = useLocation();
  const enterWorkspace = () => isAuthenticated ? setLocation("/workspace") : startLogin();

  return (
    <div className="min-h-screen overflow-hidden bg-[var(--canvas)] text-foreground">
      <div className="dream-orb dream-orb-lavender" />
      <div className="dream-orb dream-orb-blush" />
      <div className="dream-orb dream-orb-mint" />
      <div className="editorial-lines" aria-hidden="true" />

      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-7 sm:px-8 lg:px-12">
        <button onClick={() => setLocation("/")} className="group flex items-center gap-3 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <span className="grid size-10 place-items-center rounded-2xl border border-white/60 bg-white/45 font-serif text-xl italic text-primary shadow-sm backdrop-blur">K</span>
          <span className="font-serif text-2xl tracking-tight text-[#47415c]">Kevin</span>
        </button>
        <div className="flex items-center gap-1.5">
          <button onClick={toggleTheme} className="grid size-9 place-items-center rounded-full border border-white/60 bg-white/35 text-primary hover:bg-white/70" aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`} title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}>
            {theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
          </button>
          <Button variant="ghost" onClick={enterWorkspace} className="text-xs font-semibold uppercase tracking-[0.18em] text-[#514b65] hover:bg-white/45 hover:text-primary">
            {isAuthenticated ? "Open workspace" : "Sign in"}
          </Button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-5 pb-20 sm:px-8 lg:px-12">
        <section className="relative grid min-h-[630px] items-center gap-14 py-16 lg:grid-cols-[1.08fr_0.92fr] lg:py-20">
          <div className="max-w-2xl">
            <div className="mb-7 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.24em] text-primary/80">
              <Sparkles className="size-3.5" /> Your materials, thoughtfully transformed
            </div>
            <h1 className="font-serif text-5xl leading-[0.98] tracking-[-0.04em] text-[#3f394f] sm:text-6xl lg:text-7xl">
              A quieter place to <em className="font-normal text-primary">learn deeply.</em>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-8 text-[#625d70] sm:text-lg">
              Kevin turns the notes and readings you choose into a personal study space: organized subjects, source-aware answers, recall cards, and fair practice quizzes.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button onClick={enterWorkspace} size="lg" className="h-13 rounded-full bg-primary px-7 text-base shadow-[0_10px_32px_rgba(105,82,162,0.25)] transition-all hover:-translate-y-0.5 hover:bg-primary/90">
                {isAuthenticated ? "Continue studying" : "Create your workspace"} <ArrowRight className="ml-2 size-4" />
              </Button>
              <p className="px-2 text-xs leading-5 text-muted-foreground">No public feed, no generic answers — just your own material and a clear path forward.</p>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="absolute -left-8 top-12 h-64 w-64 rounded-full bg-[#e6d8fa]/70 blur-3xl" />
            <div className="relative rounded-[2.3rem] border border-white/80 bg-white/60 p-5 shadow-[0_24px_65px_rgba(80,65,105,0.14)] backdrop-blur-xl sm:p-7">
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Today’s studio</p>
                  <p className="mt-1 font-serif text-2xl text-[#47415c]">Neuroscience</p>
                </div>
                <span className="grid size-10 place-items-center rounded-full bg-[#eee7ff] text-primary"><BookOpenCheck className="size-5" /></span>
              </div>
              <div className="space-y-3">
                <div className="rounded-2xl border border-white bg-white/70 p-4 shadow-sm">
                  <div className="flex items-center justify-between text-xs"><span className="font-semibold text-[#4e475f]">Cognitive systems notes</span><span className="text-primary">Ready</span></div>
                  <div className="mt-3 h-1.5 rounded-full bg-[#ebe7f1]"><div className="h-full w-3/4 rounded-full bg-gradient-to-r from-[#aa93dc] to-[#88cdbd]" /></div>
                </div>
                <div className="rounded-2xl border border-primary/10 bg-[#f6f1ff]/75 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary/75">Ask Kevin</p>
                  <p className="mt-2 font-serif text-lg leading-snug text-[#4b455a]">How does working memory connect to attention?</p>
                  <div className="mt-4 flex gap-2"><span className="rounded-full bg-white px-2.5 py-1 text-[10px] text-muted-foreground">Notes · p. 12</span><span className="rounded-full bg-white px-2.5 py-1 text-[10px] text-muted-foreground">Notes · p. 13</span></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-[#edf9f4] p-4"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#558e7f]">Review</p><p className="mt-1.5 font-serif text-xl text-[#40594f]">8 cards</p></div>
                  <div className="rounded-2xl bg-[#fff0f3] p-4"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#ae7582]">Practice</p><p className="mt-1.5 font-serif text-xl text-[#684c57]">5 questions</p></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 pb-12 md:grid-cols-3">
          {benefits.map((benefit, index) => (
            <article key={benefit.title} className="relative rounded-3xl border border-white/70 bg-white/35 p-7 backdrop-blur-sm transition-transform duration-300 hover:-translate-y-1">
              <span className="absolute right-5 top-5 text-xs font-serif italic text-primary/50">0{index + 1}</span>
              <div className="mb-5 grid size-10 place-items-center rounded-2xl bg-white/70 text-primary"><benefit.icon className="size-5" /></div>
              <h2 className="font-serif text-2xl text-[#494255]">{benefit.title}</h2>
              <p className="mt-3 text-sm leading-6 text-[#676171]">{benefit.text}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
