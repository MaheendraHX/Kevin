import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { GitCompareArrows, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type TextMaterial = { id: number; title: string; sourceType: "pdf" | "text"; version: number; supersedesMaterialId: number | null; archivedAt: Date | null };

export function getRevisionLineage(materials: TextMaterial[], selectedId: number) {
  const byId = new Map(materials.map(material => [material.id, material]));
  let root = byId.get(selectedId);
  while (root?.supersedesMaterialId && byId.get(root.supersedesMaterialId)) root = byId.get(root.supersedesMaterialId);
  if (!root) return [];
  const lineage = [root];
  let next = materials.filter(material => material.supersedesMaterialId === root!.id).sort((a, b) => a.version - b.version)[0];
  while (next) {
    lineage.push(next);
    next = materials.filter(material => material.supersedesMaterialId === next!.id).sort((a, b) => a.version - b.version)[0];
  }
  return lineage;
}

export function MaterialVersionPanel({ materials, onChanged }: { materials: TextMaterial[]; onChanged: () => void }) {
  const sources = useMemo(() => materials.filter(material => material.sourceType === "text" && !material.archivedAt), [materials]);
  const [materialId, setMaterialId] = useState<number | null>(sources[0]?.id || null);
  const [content, setContent] = useState("");
  const createVersion = trpc.study.createTextVersion.useMutation({ onSuccess: () => { toast.success("New source version saved."); setContent(""); onChanged(); }, onError: error => toast.error(error.message) });
  if (!sources.length) return null;
  const selected = sources.find(source => source.id === materialId) || sources[0];
  const lineage = selected ? getRevisionLineage(materials, selected.id) : [];
  return <section className="mt-6 rounded-[1.8rem] border border-white/80 bg-[linear-gradient(145deg,rgba(239,249,245,0.8),rgba(249,244,255,0.76))] p-5 sm:p-6"><div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white/70 text-primary"><GitCompareArrows className="size-5" /></span><div><p className="text-[10px] font-bold uppercase tracking-[0.17em] text-muted-foreground">Source version history</p><h2 className="mt-1 font-serif text-2xl text-[#4a4357]">Keep a clear revision trail</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">When your notes change, save a new version instead of replacing the original. Kevin keeps the original source and its study history intact.</p></div></div><div className="mt-5 grid gap-3"><div className="space-y-2"><Label htmlFor="revision-source">Source to revise</Label><select id="revision-source" value={materialId || ""} onChange={event => setMaterialId(Number(event.target.value))} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm">{sources.map(source => <option key={source.id} value={source.id}>{source.title} · current v{source.version}</option>)}</select></div>{lineage.length ? <div className="rounded-2xl border border-white/70 bg-white/60 p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Visible revision trail</p><div className="mt-3 flex flex-wrap items-center gap-2">{lineage.map((version, index) => <span key={version.id} className="flex items-center gap-2 text-xs text-[#51495f]"><span className={`rounded-full px-2.5 py-1 ${version.id === selected.id ? "bg-primary text-primary-foreground" : "bg-[#f2ecfa]"}`}>v{version.version}</span>{index < lineage.length - 1 ? <span className="text-muted-foreground">→</span> : null}</span>)}</div></div> : null}<div className="space-y-2"><Label htmlFor="revision-content">Updated source text</Label><Textarea id="revision-content" value={content} onChange={event => setContent(event.target.value)} placeholder="Paste the revised version of these notes here…" className="min-h-32" maxLength={90000} /><p className="text-right text-xs text-muted-foreground">{content.length.toLocaleString()} / 90,000</p></div><Button type="button" onClick={() => materialId && createVersion.mutate({ materialId, content })} disabled={!materialId || content.trim().length < 80 || createVersion.isPending} className="w-fit rounded-full">{createVersion.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <GitCompareArrows className="mr-2 size-4" />} Save new source version</Button></div></section>;
}
