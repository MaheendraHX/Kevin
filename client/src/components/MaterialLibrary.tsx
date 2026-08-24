import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Archive, ArchiveRestore, FileText, Pencil, Search, Tags, Trash2 } from "lucide-react";
import React, { useMemo, useState } from "react";
import { toast } from "sonner";

type MaterialRecord = {
  id: number;
  title: string;
  sourceType: "pdf" | "text";
  folder: string | null;
  tags: unknown;
  version: number;
  archivedAt: Date | null;
  pageCount: number | null;
  processingStatus: "ready" | "needs_attention";
};

function tags(value: unknown) { return Array.isArray(value) ? value.filter((tag): tag is string => typeof tag === "string") : []; }

export function MaterialLibrary({ subjectId, materials, archivedMaterials, onChanged }: { subjectId: number; materials: MaterialRecord[]; archivedMaterials: MaterialRecord[]; onChanged: () => void }) {
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<MaterialRecord | null>(null);
  const [title, setTitle] = useState("");
  const [folder, setFolder] = useState("");
  const [tagText, setTagText] = useState("");
  const archive = trpc.study.archiveMaterial.useMutation({ onSuccess: () => { toast.success("Material library updated."); onChanged(); }, onError: error => toast.error(error.message) });
  const remove = trpc.study.deleteMaterial.useMutation({ onSuccess: () => { toast.success("Material deleted."); onChanged(); }, onError: error => toast.error(error.message) });
  const update = trpc.study.updateMaterial.useMutation({ onSuccess: () => { toast.success("Material details saved."); setEditing(null); onChanged(); }, onError: error => toast.error(error.message) });
  const source = showArchived ? archivedMaterials : materials;
  const visible = useMemo(() => source.filter(material => `${material.title} ${material.folder || ""} ${tags(material.tags).join(" ")}`.toLowerCase().includes(query.toLowerCase())), [source, query]);
  const openEditor = (material: MaterialRecord) => { setEditing(material); setTitle(material.title); setFolder(material.folder || ""); setTagText(tags(material.tags).join(", ")); };
  const save = () => { if (!editing || !title.trim()) return; update.mutate({ materialId: editing.id, title: title.trim(), folder: folder.trim() || null, tags: tagText.split(",").map(tag => tag.trim()).filter(Boolean) }); };
  return <section className="mt-6 rounded-[1.8rem] border border-white/80 bg-white/55 p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.17em] text-muted-foreground">Organized source library</p><h2 className="mt-1 font-serif text-2xl text-[#4a4357]">Find the right material</h2></div><Button type="button" variant="outline" onClick={() => setShowArchived(value => !value)} className="rounded-full border-primary/20 bg-white/65 text-primary hover:bg-primary/5">{showArchived ? <ArchiveRestore className="mr-2 size-4" /> : <Archive className="mr-2 size-4" />}{showArchived ? "Back to active" : `Archive (${archivedMaterials.length})`}</Button></div><div className="relative mt-5"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search titles, folders, or tags" className="rounded-2xl bg-white/70 pl-9" /></div><div className="mt-4 space-y-3">{visible.length ? visible.map(material => <article id={`material-${material.id}`} key={material.id} className="flex flex-col gap-3 rounded-2xl border border-white bg-white/65 p-4 sm:flex-row sm:items-center"><span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#f1eaff] text-primary"><FileText className="size-4" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-semibold text-[#50495d]">{material.title}</p><Badge variant="secondary" className="rounded-full bg-[#f3effb] text-[10px] text-primary">v{material.version}</Badge>{material.archivedAt ? <Badge variant="secondary" className="rounded-full bg-[#f7edf0] text-[10px] text-[#9c6172]">Archived</Badge> : null}</div><p className="mt-1 text-xs text-muted-foreground">{material.sourceType === "pdf" ? `${material.pageCount || "—"} pages · PDF` : "Pasted text"} · {material.processingStatus === "ready" ? "Ready" : "Needs attention"}{material.folder ? ` · ${material.folder}` : ""}</p>{tags(material.tags).length ? <div className="mt-2 flex flex-wrap gap-1">{tags(material.tags).map(tag => <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-[#eef8f4] px-2 py-0.5 text-[10px] font-medium text-[#527d70]"><Tags className="size-2.5" />{tag}</span>)}</div> : null}</div><div className="flex flex-wrap gap-2"><Button size="sm" type="button" variant="outline" onClick={() => openEditor(material)} className="rounded-full"><Pencil className="mr-1 size-3.5" /> Edit</Button><Button size="sm" type="button" variant="outline" onClick={() => archive.mutate({ materialId: material.id, archived: !material.archivedAt })} className="rounded-full">{material.archivedAt ? <ArchiveRestore className="mr-1 size-3.5" /> : <Archive className="mr-1 size-3.5" />}{material.archivedAt ? "Restore" : "Archive"}</Button><Button size="sm" type="button" variant="ghost" onClick={() => { if (window.confirm(`Delete ${material.title}? This also removes its saved source chunks.`)) remove.mutate({ materialId: material.id }); }} className="rounded-full text-[#9c6172] hover:bg-[#fff0f3] hover:text-[#9c6172]"><Trash2 className="mr-1 size-3.5" /> Delete</Button></div></article>) : <div className="rounded-2xl bg-[#faf8fd] p-5 text-sm text-muted-foreground">No {showArchived ? "archived" : "active"} materials match this search.</div>}</div><Dialog open={Boolean(editing)} onOpenChange={open => !open && setEditing(null)}><DialogContent className="border-white/80 bg-[#fcfbff]/95"><DialogHeader><DialogTitle className="font-serif text-3xl text-[#484156]">Organize material</DialogTitle></DialogHeader><div className="space-y-4"><div className="space-y-2"><Label htmlFor="material-library-title">Title</Label><Input id="material-library-title" value={title} onChange={event => setTitle(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="material-library-folder">Folder</Label><Input id="material-library-folder" value={folder} onChange={event => setFolder(event.target.value)} placeholder="e.g. Week 4 or Core concepts" /></div><div className="space-y-2"><Label htmlFor="material-library-tags">Tags</Label><Input id="material-library-tags" value={tagText} onChange={event => setTagText(event.target.value)} placeholder="e.g. attention, definitions, chapter 2" /><p className="text-xs text-muted-foreground">Separate tags with commas. Kevin uses these only to help you organize your own materials.</p></div></div><DialogFooter><Button type="button" onClick={save} disabled={update.isPending || !title.trim()} className="rounded-full">Save details</Button></DialogFooter></DialogContent></Dialog></section>;
}
