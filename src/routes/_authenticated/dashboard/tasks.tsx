import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ListChecks, Plus, Search, Star, Archive, Copy, Trash2, Pencil, X,
  BookOpen, Brain, Lightbulb, CalendarDays, Filter, Sparkles,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import {
  listCatalogItems, listLinkableContent, createCatalogItem,
  updateCatalogItem, deleteCatalogItem, duplicateCatalogItem,
  type CatalogItemInput,
} from "@/lib/catalog.functions";

export const Route = createFileRoute("/_authenticated/dashboard/tasks")({
  head: () => ({ meta: [{ title: "Task Catalog — StudyBloom AI" }] }),
  component: TaskCatalogPage,
});

type Item = CatalogItemInput & {
  id: string;
  user_id: string;
  last_studied_at: string | null;
  created_at: string;
  updated_at: string;
};

const DEFAULT_CATEGORIES = ["Programming", "Mathematics", "AI", "Physics", "Chemistry"];
const DIFFICULTIES = ["easy", "medium", "hard"] as const;
const STATUSES = [
  { v: "not_started", label: "Not started" },
  { v: "in_progress", label: "In progress" },
  { v: "completed", label: "Completed" },
] as const;

function emptyForm(): CatalogItemInput {
  return {
    title: "", subject: "", category: "Programming", description: "",
    tags: [], difficulty: "medium", status: "not_started",
    favorite: false, archived: false,
    summary_id: null, quiz_id: null, explanation_id: null, planner_task_id: null,
  };
}

function TaskCatalogPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listCatalogItems);
  const linkFn = useServerFn(listLinkableContent);
  const createFn = useServerFn(createCatalogItem);
  const updateFn = useServerFn(updateCatalogItem);
  const deleteFn = useServerFn(deleteCatalogItem);
  const duplicateFn = useServerFn(duplicateCatalogItem);

  const itemsQ = useQuery({ queryKey: ["catalog-items"], queryFn: () => listFn() });
  const linksQ = useQuery({ queryKey: ["catalog-links"], queryFn: () => linkFn() });

  const items: Item[] = itemsQ.data?.items ?? [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ["catalog-items"] });

  const createM = useMutation({
    mutationFn: (input: CatalogItemInput) => createFn({ data: input }),
    onSuccess: () => { invalidate(); toast.success("Item added"); },
    onError: (e: any) => toast.error(e.message ?? "Failed to add"),
  });
  const updateM = useMutation({
    mutationFn: (v: { id: string; patch: any }) => updateFn({ data: v }),
    onSuccess: () => invalidate(),
    onError: (e: any) => toast.error(e.message ?? "Failed to update"),
  });
  const deleteM = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => { invalidate(); toast.success("Deleted"); },
  });
  const duplicateM = useMutation({
    mutationFn: (id: string) => duplicateFn({ data: { id } }),
    onSuccess: () => { invalidate(); toast.success("Duplicated"); },
  });

  const [search, setSearch] = useState("");
  const [fCategory, setFCategory] = useState<string>("all");
  const [fSubject, setFSubject] = useState<string>("");
  const [fTag, setFTag] = useState<string>("");
  const [fDifficulty, setFDifficulty] = useState<string>("all");
  const [sort, setSort] = useState<"newest" | "oldest" | "alpha">("newest");
  const [view, setView] = useState<"all" | "favorites" | "archived">("all");

  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [form, setForm] = useState<CatalogItemInput>(emptyForm());

  const categories = useMemo(() => {
    const s = new Set<string>(DEFAULT_CATEGORIES);
    items.forEach(i => i.category && s.add(i.category));
    return Array.from(s);
  }, [items]);

  const filtered = useMemo(() => {
    let out = items.filter(i => view === "archived" ? i.archived : !i.archived);
    if (view === "favorites") out = out.filter(i => i.favorite);
    if (fCategory !== "all") out = out.filter(i => i.category === fCategory);
    if (fDifficulty !== "all") out = out.filter(i => i.difficulty === fDifficulty);
    if (fSubject.trim()) {
      const q = fSubject.toLowerCase();
      out = out.filter(i => i.subject?.toLowerCase().includes(q));
    }
    if (fTag.trim()) {
      const q = fTag.toLowerCase();
      out = out.filter(i => i.tags?.some(t => t.toLowerCase().includes(q)));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(i =>
        i.title.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q) ||
        i.subject?.toLowerCase().includes(q) ||
        i.tags?.some(t => t.toLowerCase().includes(q))
      );
    }
    out = [...out].sort((a, b) => {
      if (sort === "alpha") return a.title.localeCompare(b.title);
      const at = new Date(a.created_at).getTime();
      const bt = new Date(b.created_at).getTime();
      return sort === "newest" ? bt - at : at - bt;
    });
    return out;
  }, [items, view, fCategory, fDifficulty, fSubject, fTag, search, sort]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setOpenForm(true);
  }
  function openEdit(item: Item) {
    setEditing(item);
    setForm({
      title: item.title, subject: item.subject ?? "", category: item.category,
      description: item.description ?? "", tags: item.tags ?? [],
      difficulty: item.difficulty, status: item.status,
      favorite: item.favorite, archived: item.archived,
      summary_id: item.summary_id ?? null, quiz_id: item.quiz_id ?? null,
      explanation_id: item.explanation_id ?? null, planner_task_id: item.planner_task_id ?? null,
    });
    setOpenForm(true);
  }
  async function submit() {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    if (editing) {
      await updateM.mutateAsync({ id: editing.id, patch: form });
      toast.success("Updated");
    } else {
      await createM.mutateAsync(form);
    }
    setOpenForm(false);
  }

  const stats = useMemo(() => ({
    total: items.filter(i => !i.archived).length,
    favorites: items.filter(i => i.favorite && !i.archived).length,
    completed: items.filter(i => i.status === "completed" && !i.archived).length,
    inProgress: items.filter(i => i.status === "in_progress" && !i.archived).length,
  }), [items]);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
              <ListChecks className="h-7 w-7 text-primary" /> Task Catalog
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Your personal AI-powered study library — organize notes, quizzes, explanations & plans in one place.
            </p>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-primary text-primary-foreground px-4 py-2 text-sm font-medium shadow-soft"
          >
            <Plus className="h-4 w-4" /> New Item
          </button>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total", value: stats.total, icon: BookOpen },
            { label: "Favorites", value: stats.favorites, icon: Star },
            { label: "In Progress", value: stats.inProgress, icon: Sparkles },
            { label: "Completed", value: stats.completed, icon: ListChecks },
          ].map(s => (
            <div key={s.label} className="glass rounded-2xl p-4 shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{s.label}</span>
                <s.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="text-2xl font-display font-bold mt-1">{s.value}</div>
            </div>
          ))}
        </div>

        {/* View tabs */}
        <div className="flex flex-wrap gap-2">
          {(["all", "favorites", "archived"] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border ${
                view === v ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-accent"
              }`}
            >
              {v === "all" ? "All items" : v === "favorites" ? "★ Favorites" : "Archived"}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="glass rounded-2xl p-4 shadow-card grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-2 relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search title, description, tags…"
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-background border border-border text-sm"
            />
          </div>
          <select value={fCategory} onChange={e => setFCategory(e.target.value)}
            className="rounded-xl bg-background border border-border px-3 py-2 text-sm">
            <option value="all">All categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input value={fSubject} onChange={e => setFSubject(e.target.value)}
            placeholder="Subject"
            className="rounded-xl bg-background border border-border px-3 py-2 text-sm" />
          <input value={fTag} onChange={e => setFTag(e.target.value)}
            placeholder="Tag"
            className="rounded-xl bg-background border border-border px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <select value={fDifficulty} onChange={e => setFDifficulty(e.target.value)}
              className="flex-1 rounded-xl bg-background border border-border px-3 py-2 text-sm">
              <option value="all">Any difficulty</option>
              {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={sort} onChange={e => setSort(e.target.value as any)}
              className="flex-1 rounded-xl bg-background border border-border px-3 py-2 text-sm">
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="alpha">A → Z</option>
            </select>
          </div>
        </div>

        {/* Items grid */}
        {itemsQ.isLoading ? (
          <div className="text-center py-10 text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center shadow-card">
            <Filter className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium">No items match your filters.</p>
            <p className="text-sm text-muted-foreground mt-1">Try clearing filters or add a new study item.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(item => (
              <ItemCard
                key={item.id}
                item={item}
                links={linksQ.data}
                onEdit={() => openEdit(item)}
                onDelete={() => { if (confirm("Delete this item?")) deleteM.mutate(item.id); }}
                onDuplicate={() => duplicateM.mutate(item.id)}
                onToggleFav={() => updateM.mutate({ id: item.id, patch: { favorite: !item.favorite } })}
                onToggleArchive={() => updateM.mutate({ id: item.id, patch: { archived: !item.archived } })}
                onStatus={(status) => updateM.mutate({
                  id: item.id,
                  patch: { status, last_studied_at: new Date().toISOString() },
                })}
              />
            ))}
          </div>
        )}
      </div>

      {openForm && (
        <ItemFormModal
          form={form}
          setForm={setForm}
          links={linksQ.data}
          categories={categories}
          editing={!!editing}
          onClose={() => setOpenForm(false)}
          onSubmit={submit}
          submitting={createM.isPending || updateM.isPending}
        />
      )}
    </DashboardLayout>
  );
}

function ItemCard({
  item, links, onEdit, onDelete, onDuplicate, onToggleFav, onToggleArchive, onStatus,
}: {
  item: Item;
  links: any;
  onEdit: () => void; onDelete: () => void; onDuplicate: () => void;
  onToggleFav: () => void; onToggleArchive: () => void;
  onStatus: (s: "not_started" | "in_progress" | "completed") => void;
}) {
  const summary = links?.summaries?.find((s: any) => s.id === item.summary_id);
  const quiz = links?.quizzes?.find((q: any) => q.id === item.quiz_id);
  const explanation = links?.explanations?.find((e: any) => e.id === item.explanation_id);
  const task = links?.tasks?.find((t: any) => t.id === item.planner_task_id);

  const diffColor = item.difficulty === "easy" ? "bg-green-100 text-green-700"
    : item.difficulty === "hard" ? "bg-red-100 text-red-700"
    : "bg-yellow-100 text-yellow-700";
  const statusLabel = STATUSES.find(s => s.v === item.status)?.label ?? item.status;

  return (
    <div className="glass rounded-2xl p-4 shadow-card flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{item.category}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${diffColor}`}>{item.difficulty}</span>
          </div>
          <h3 className="font-display font-semibold text-base mt-2 truncate">{item.title}</h3>
          {item.subject && <p className="text-xs text-muted-foreground">{item.subject}</p>}
        </div>
        <button onClick={onToggleFav} aria-label="Favorite"
          className={`shrink-0 h-8 w-8 grid place-items-center rounded-full ${item.favorite ? "text-yellow-500" : "text-muted-foreground hover:text-yellow-500"}`}>
          <Star className="h-4 w-4" fill={item.favorite ? "currentColor" : "none"} />
        </button>
      </div>

      {item.description && (
        <p className="text-sm text-muted-foreground line-clamp-3">{item.description}</p>
      )}

      {item.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.tags.map(t => (
            <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-accent-foreground">#{t}</span>
          ))}
        </div>
      )}

      {(summary || quiz || explanation || task) && (
        <div className="space-y-1 text-xs border-t border-border/50 pt-2">
          {summary && <div className="flex items-center gap-1.5"><BookOpen className="h-3 w-3 text-primary" /> Summary: <span className="truncate">{summary.title}</span></div>}
          {quiz && <div className="flex items-center gap-1.5"><Brain className="h-3 w-3 text-primary" /> Quiz: <span className="truncate">{quiz.title}</span>{quiz.best_score != null && <span className="text-muted-foreground">· Best {quiz.best_score}</span>}</div>}
          {explanation && <div className="flex items-center gap-1.5"><Lightbulb className="h-3 w-3 text-primary" /> Explanation: <span className="truncate">{explanation.input}</span></div>}
          {task && <div className="flex items-center gap-1.5"><CalendarDays className="h-3 w-3 text-primary" /> Planner: <span className="truncate">{task.topic}</span>{task.completed && <span className="text-green-600">· done</span>}</div>}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={item.status}
          onChange={e => onStatus(e.target.value as any)}
          className="text-xs rounded-full border border-border bg-background px-2 py-1"
        >
          {STATUSES.map(s => <option key={s.v} value={s.v}>{s.label}</option>)}
        </select>
        {item.last_studied_at && (
          <span className="text-[10px] text-muted-foreground">
            Last: {new Date(item.last_studied_at).toLocaleDateString()}
          </span>
        )}
      </div>

      <div className="flex items-center justify-end gap-1 pt-1 border-t border-border/50">
        <IconBtn label="Edit" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></IconBtn>
        <IconBtn label="Duplicate" onClick={onDuplicate}><Copy className="h-3.5 w-3.5" /></IconBtn>
        <IconBtn label={item.archived ? "Unarchive" : "Archive"} onClick={onToggleArchive}><Archive className="h-3.5 w-3.5" /></IconBtn>
        <IconBtn label="Delete" onClick={onDelete}><Trash2 className="h-3.5 w-3.5 text-red-500" /></IconBtn>
      </div>
    </div>
  );
}

function IconBtn({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label={label} title={label}
      className="h-7 w-7 grid place-items-center rounded-lg hover:bg-accent">
      {children}
    </button>
  );
}

function ItemFormModal({
  form, setForm, links, categories, editing, onClose, onSubmit, submitting,
}: {
  form: CatalogItemInput; setForm: (f: CatalogItemInput) => void;
  links: any; categories: string[]; editing: boolean;
  onClose: () => void; onSubmit: () => void; submitting: boolean;
}) {
  const [tagInput, setTagInput] = useState("");
  function addTag() {
    const t = tagInput.trim();
    if (!t) return;
    if (form.tags.includes(t)) return;
    setForm({ ...form, tags: [...form.tags, t] });
    setTagInput("");
  }
  function removeTag(t: string) {
    setForm({ ...form, tags: form.tags.filter(x => x !== t) });
  }

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm grid place-items-center p-4 overflow-y-auto">
      <div className="bg-background rounded-2xl shadow-2xl max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-background z-10">
          <h2 className="font-display text-lg font-bold">{editing ? "Edit Item" : "New Study Item"}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-accent"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <Field label="Title *">
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm" />
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Category">
              <input list="cat-list" value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm" />
              <datalist id="cat-list">
                {categories.map(c => <option key={c} value={c} />)}
              </datalist>
            </Field>
            <Field label="Subject">
              <input value={form.subject ?? ""} onChange={e => setForm({ ...form, subject: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm" />
            </Field>
            <Field label="Difficulty">
              <select value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm">
                {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm">
                {STATUSES.map(s => <option key={s.v} value={s.v}>{s.label}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Description">
            <textarea value={form.description ?? ""} onChange={e => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm" />
          </Field>
          <Field label="Tags">
            <div className="flex gap-2">
              <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                placeholder="Type & press Enter"
                className="flex-1 px-3 py-2 rounded-xl bg-background border border-border text-sm" />
              <button type="button" onClick={addTag}
                className="px-3 py-2 rounded-xl bg-accent text-sm">Add</button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {form.tags.map(t => (
                  <span key={t} className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary flex items-center gap-1">
                    #{t}
                    <button onClick={() => removeTag(t)} type="button"><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </Field>

          <div className="border-t border-border pt-4">
            <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" /> Link existing AI content
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <LinkSelect label="Notes Summary" value={form.summary_id ?? ""}
                options={(links?.summaries ?? []).map((s: any) => ({ v: s.id, label: s.title }))}
                onChange={v => setForm({ ...form, summary_id: v || null })} />
              <LinkSelect label="Quiz" value={form.quiz_id ?? ""}
                options={(links?.quizzes ?? []).map((q: any) => ({ v: q.id, label: q.title }))}
                onChange={v => setForm({ ...form, quiz_id: v || null })} />
              <LinkSelect label="Explanation" value={form.explanation_id ?? ""}
                options={(links?.explanations ?? []).map((e: any) => ({ v: e.id, label: (e.input ?? "").slice(0, 60) }))}
                onChange={v => setForm({ ...form, explanation_id: v || null })} />
              <LinkSelect label="Planner Task" value={form.planner_task_id ?? ""}
                options={(links?.tasks ?? []).map((t: any) => ({ v: t.id, label: `${t.topic} (${t.study_date})` }))}
                onChange={v => setForm({ ...form, planner_task_id: v || null })} />
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.favorite}
                onChange={e => setForm({ ...form, favorite: e.target.checked })} />
              Favorite
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.archived}
                onChange={e => setForm({ ...form, archived: e.target.checked })} />
              Archived
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-2 p-5 border-t border-border sticky bottom-0 bg-background">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-accent text-sm">Cancel</button>
          <button onClick={onSubmit} disabled={submitting}
            className="px-4 py-2 rounded-xl bg-gradient-primary text-primary-foreground text-sm font-medium shadow-soft disabled:opacity-60">
            {submitting ? "Saving…" : editing ? "Save changes" : "Create item"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function LinkSelect({ label, value, options, onChange }: {
  label: string; value: string; options: { v: string; label: string }[]; onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm">
        <option value="">— None —</option>
        {options.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
      </select>
    </Field>
  );
}
