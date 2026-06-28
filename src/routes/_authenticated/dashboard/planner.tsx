import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarDays, List, Plus, Search, CheckCircle2, Clock, AlertTriangle, Flame,
  TrendingUp, Copy, Trash2, Pencil, BellRing, BellOff, Sparkles, X,
} from "lucide-react";
import {
  createStudyTask, listStudyTasks, updateStudyTask, deleteStudyTask, duplicateStudyTask,
  type StudyTaskInput,
} from "@/lib/planner.functions";

export const Route = createFileRoute("/_authenticated/dashboard/planner")({
  head: () => ({ meta: [{ title: "Study Planner — StudyBloom AI" }] }),
  component: PlannerPage,
});

type Task = StudyTaskInput & {
  id: string;
  user_id: string;
  completed: boolean;
  completed_at: string | null;
  ai_suggestions: any;
  created_at: string;
  updated_at: string;
};

const PRIORITIES = [
  { v: "low", label: "Low" }, { v: "medium", label: "Medium" }, { v: "high", label: "High" },
] as const;
const DIFFICULTIES = [
  { v: "easy", label: "Easy" }, { v: "medium", label: "Medium" }, { v: "hard", label: "Hard" },
] as const;
const CATEGORIES = [
  { v: "revision", label: "Revision" },
  { v: "new_topic", label: "New Topic" },
  { v: "assignment", label: "Assignment" },
  { v: "quiz_practice", label: "Quiz Practice" },
  { v: "exam_prep", label: "Exam Preparation" },
  { v: "custom", label: "Custom" },
] as const;
const REMINDER_OPTS = [
  { v: 10, label: "10 minutes before" },
  { v: 30, label: "30 minutes before" },
  { v: 60, label: "1 hour before" },
  { v: 1440, label: "1 day before" },
] as const;

const todayStr = () => new Date().toISOString().slice(0, 10);

function emptyForm(): StudyTaskInput {
  return {
    subject: "",
    topic: "",
    description: "",
    study_date: todayStr(),
    study_time: "18:00",
    duration_minutes: 45,
    priority: "medium",
    difficulty: "medium",
    category: "new_topic",
    reminder_enabled: true,
    reminder_minutes_before: 30,
  };
}

function taskDateTime(t: { study_date: string; study_time: string }) {
  return new Date(`${t.study_date}T${t.study_time}`);
}

function PlannerPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listStudyTasks);
  const createFn = useServerFn(createStudyTask);
  const updateFn = useServerFn(updateStudyTask);
  const deleteFn = useServerFn(deleteStudyTask);
  const duplicateFn = useServerFn(duplicateStudyTask);

  const { data, isLoading } = useQuery({
    queryKey: ["study-tasks"],
    queryFn: () => listFn(),
  });
  const tasks: Task[] = (data?.tasks as Task[]) ?? [];

  const [view, setView] = useState<"list" | "calendar">("list");
  const [search, setSearch] = useState("");
  const [fSubject, setFSubject] = useState<string>("all");
  const [fCategory, setFCategory] = useState<string>("all");
  const [fPriority, setFPriority] = useState<string>("all");
  const [fStatus, setFStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "priority" | "newest" | "oldest">("date");

  const [form, setForm] = useState<StudyTaskInput>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openSuggestion, setOpenSuggestion] = useState<Task | null>(null);

  // Reminder system
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
    const fired = new Set<string>(JSON.parse(sessionStorage.getItem("fired-reminders") || "[]"));
    const iv = window.setInterval(() => {
      const now = Date.now();
      tasks.forEach((t) => {
        if (!t.reminder_enabled || t.completed) return;
        const due = taskDateTime(t).getTime() - t.reminder_minutes_before * 60_000;
        if (now >= due && now < due + 60_000 && !fired.has(t.id)) {
          fired.add(t.id);
          sessionStorage.setItem("fired-reminders", JSON.stringify([...fired]));
          const title = `📚 ${t.subject}: ${t.topic}`;
          const body = `Starts at ${t.study_time.slice(0, 5)} — ${t.duration_minutes} min`;
          if ("Notification" in window && Notification.permission === "granted") {
            try { new Notification(title, { body }); } catch {}
          }
          toast(title, { description: body });
        }
      });
    }, 30_000);
    return () => clearInterval(iv);
  }, [tasks]);

  const createMut = useMutation({
    mutationFn: (input: StudyTaskInput) => createFn({ data: input }),
    onSuccess: (r) => {
      toast.success("Study task added");
      qc.invalidateQueries({ queryKey: ["study-tasks"] });
      setForm(emptyForm()); setEditingId(null);
      if (r?.task?.ai_suggestions) setOpenSuggestion(r.task as Task);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to add task"),
  });
  const updateMut = useMutation({
    mutationFn: (vars: { id: string; patch: any }) => updateFn({ data: vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["study-tasks"] }),
    onError: (e: any) => toast.error(e.message ?? "Update failed"),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => { toast.success("Task deleted"); qc.invalidateQueries({ queryKey: ["study-tasks"] }); },
  });
  const dupMut = useMutation({
    mutationFn: (id: string) => duplicateFn({ data: { id } }),
    onSuccess: () => { toast.success("Task duplicated"); qc.invalidateQueries({ queryKey: ["study-tasks"] }); },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.subject.trim() || !form.topic.trim()) {
      toast.error("Subject and topic are required"); return;
    }
    if (editingId) {
      updateMut.mutate({ id: editingId, patch: form });
      setEditingId(null); setForm(emptyForm());
      toast.success("Task updated");
    } else {
      createMut.mutate(form);
    }
  }

  function startEdit(t: Task) {
    setEditingId(t.id);
    setForm({
      subject: t.subject, topic: t.topic, description: t.description ?? "",
      study_date: t.study_date, study_time: t.study_time.slice(0, 5),
      duration_minutes: t.duration_minutes, priority: t.priority,
      difficulty: t.difficulty, category: t.category,
      reminder_enabled: t.reminder_enabled, reminder_minutes_before: t.reminder_minutes_before,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Derived
  const now = new Date();
  const today = todayStr();
  const subjects = useMemo(() => Array.from(new Set(tasks.map((t) => t.subject))), [tasks]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = tasks.filter((t) => {
      if (q && !(t.subject.toLowerCase().includes(q) || t.topic.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q))) return false;
      if (fSubject !== "all" && t.subject !== fSubject) return false;
      if (fCategory !== "all" && t.category !== fCategory) return false;
      if (fPriority !== "all" && t.priority !== fPriority) return false;
      if (fStatus === "completed" && !t.completed) return false;
      if (fStatus === "pending" && t.completed) return false;
      if (fStatus === "overdue" && (t.completed || taskDateTime(t) >= now)) return false;
      return true;
    });
    const pOrd = { high: 0, medium: 1, low: 2 } as Record<string, number>;
    list = list.slice().sort((a, b) => {
      if (sortBy === "priority") return pOrd[a.priority] - pOrd[b.priority];
      if (sortBy === "newest") return b.created_at.localeCompare(a.created_at);
      if (sortBy === "oldest") return a.created_at.localeCompare(b.created_at);
      return taskDateTime(a).getTime() - taskDateTime(b).getTime();
    });
    return list;
  }, [tasks, search, fSubject, fCategory, fPriority, fStatus, sortBy, now]);

  const stats = useMemo(() => {
    const completed = tasks.filter((t) => t.completed).length;
    const upcoming = tasks.filter((t) => !t.completed && taskDateTime(t) >= now).length;
    const overdue = tasks.filter((t) => !t.completed && taskDateTime(t) < now).length;
    const rate = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
    // Streak: consecutive days ending today where at least one task was completed
    const completedDays = new Set(
      tasks.filter((t) => t.completed && t.completed_at).map((t) => (t.completed_at as string).slice(0, 10)),
    );
    let streak = 0;
    const d = new Date();
    while (completedDays.has(d.toISOString().slice(0, 10))) {
      streak++; d.setDate(d.getDate() - 1);
    }
    return { completed, upcoming, overdue, rate, streak };
  }, [tasks, now]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-hero p-8 shadow-card relative overflow-hidden">
        <CalendarDays className="absolute right-6 top-6 h-20 w-20 text-primary/20" />
        <p className="text-sm font-medium text-primary">Study Planner ✨</p>
        <h1 className="mt-2 font-display text-3xl md:text-4xl font-bold">Smart Study Planner & Reminders</h1>
        <p className="mt-2 text-muted-foreground max-w-2xl">
          Plan your learning, stay consistent, and never miss a study session.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={CheckCircle2} label="Completed" value={stats.completed} tint="text-emerald-600" />
        <StatCard icon={Clock} label="Upcoming" value={stats.upcoming} tint="text-primary" />
        <StatCard icon={AlertTriangle} label="Overdue" value={stats.overdue} tint="text-rose-500" />
        <StatCard icon={TrendingUp} label="Completion" value={`${stats.rate}%`} tint="text-violet-500" />
        <StatCard icon={Flame} label="Streak" value={`${stats.streak}d`} tint="text-amber-500" />
      </div>

      {/* Add / Edit form */}
      <form onSubmit={submit} className="rounded-3xl bg-card border border-border/60 shadow-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Plus className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-bold">{editingId ? "Edit Study Task" : "Add Study Task"}</h2>
          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm()); }} className="ml-auto text-xs text-muted-foreground hover:text-foreground">
              Cancel edit
            </button>
          )}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Subject">
            <input className={inputCls} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Mathematics" />
          </Field>
          <Field label="Topic">
            <input className={inputCls} value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="e.g. Integration by parts" />
          </Field>
          <Field label="Description (optional)" className="md:col-span-2">
            <textarea className={inputCls + " min-h-[80px]"} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What do you want to cover?" />
          </Field>
          <Field label="Study Date">
            <input type="date" className={inputCls} value={form.study_date} onChange={(e) => setForm({ ...form, study_date: e.target.value })} />
          </Field>
          <Field label="Study Time">
            <input type="time" className={inputCls} value={form.study_time.slice(0, 5)} onChange={(e) => setForm({ ...form, study_time: e.target.value })} />
          </Field>
          <Field label="Estimated Duration (minutes)">
            <input type="number" min={5} max={600} className={inputCls} value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) || 30 })} />
          </Field>
          <Field label="Priority">
            <select className={inputCls} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as any })}>
              {PRIORITIES.map((p) => <option key={p.v} value={p.v}>{p.label}</option>)}
            </select>
          </Field>
          <Field label="Difficulty">
            <select className={inputCls} value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value as any })}>
              {DIFFICULTIES.map((p) => <option key={p.v} value={p.v}>{p.label}</option>)}
            </select>
          </Field>
          <Field label="Category">
            <select className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as any })}>
              {CATEGORIES.map((p) => <option key={p.v} value={p.v}>{p.label}</option>)}
            </select>
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border/50">
          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
            <input type="checkbox" className="h-4 w-4 accent-primary" checked={form.reminder_enabled}
              onChange={(e) => setForm({ ...form, reminder_enabled: e.target.checked })} />
            {form.reminder_enabled ? <BellRing className="h-4 w-4 text-primary" /> : <BellOff className="h-4 w-4 text-muted-foreground" />}
            Reminder
          </label>
          {form.reminder_enabled && (
            <select className={inputCls + " max-w-xs"} value={form.reminder_minutes_before} onChange={(e) => setForm({ ...form, reminder_minutes_before: Number(e.target.value) })}>
              {REMINDER_OPTS.map((r) => <option key={r.v} value={r.v}>{r.label}</option>)}
            </select>
          )}
          <button type="submit" disabled={createMut.isPending}
            className="ml-auto rounded-full bg-gradient-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft hover:opacity-95 disabled:opacity-50">
            {createMut.isPending ? "Saving…" : editingId ? "Save Changes" : "Add Study Task"}
          </button>
        </div>
      </form>

      {/* Toolbar */}
      <div className="rounded-3xl bg-card border border-border/60 shadow-card p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input className={inputCls + " pl-9"} placeholder="Search tasks…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className={inputCls + " max-w-[140px]"} value={fSubject} onChange={(e) => setFSubject(e.target.value)}>
          <option value="all">All subjects</option>
          {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className={inputCls + " max-w-[140px]"} value={fCategory} onChange={(e) => setFCategory(e.target.value)}>
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => <option key={c.v} value={c.v}>{c.label}</option>)}
        </select>
        <select className={inputCls + " max-w-[140px]"} value={fPriority} onChange={(e) => setFPriority(e.target.value)}>
          <option value="all">All priorities</option>
          {PRIORITIES.map((p) => <option key={p.v} value={p.v}>{p.label}</option>)}
        </select>
        <select className={inputCls + " max-w-[140px]"} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="overdue">Overdue</option>
        </select>
        <select className={inputCls + " max-w-[140px]"} value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
          <option value="date">Sort: Date</option>
          <option value="priority">Sort: Priority</option>
          <option value="newest">Sort: Newest</option>
          <option value="oldest">Sort: Oldest</option>
        </select>
        <div className="flex rounded-full bg-muted p-1">
          <ViewBtn active={view === "list"} onClick={() => setView("list")} icon={List} label="List" />
          <ViewBtn active={view === "calendar"} onClick={() => setView("calendar")} icon={CalendarDays} label="Calendar" />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading…</div>
      ) : view === "list" ? (
        <ListView
          tasks={filtered} today={today} now={now}
          onToggle={(t) => updateMut.mutate({ id: t.id, patch: { completed: !t.completed } })}
          onEdit={startEdit}
          onDelete={(id) => deleteMut.mutate(id)}
          onDuplicate={(id) => dupMut.mutate(id)}
          onReschedule={(t) => {
            const d = prompt("Reschedule to date (YYYY-MM-DD):", t.study_date);
            if (!d) return;
            const time = prompt("New time (HH:MM):", t.study_time.slice(0, 5)) || t.study_time.slice(0, 5);
            updateMut.mutate({ id: t.id, patch: { study_date: d, study_time: time } });
            toast.success("Rescheduled");
          }}
          onOpenSuggestions={(t) => setOpenSuggestion(t)}
        />
      ) : (
        <CalendarView tasks={filtered} onSelect={(t) => setOpenSuggestion(t)} />
      )}

      {openSuggestion && (
        <SuggestionModal task={openSuggestion} onClose={() => setOpenSuggestion(null)} />
      )}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition";

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">{label}</span>
      {children}
    </label>
  );
}

function StatCard({ icon: Icon, label, value, tint }: { icon: any; label: string; value: any; tint: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border/60 p-4 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${tint}`} />
      </div>
      <div className="mt-1 font-display text-2xl font-bold">{value}</div>
    </div>
  );
}

function ViewBtn({ active, onClick, icon: Icon, label }: any) {
  return (
    <button type="button" onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition ${active ? "bg-card shadow-soft text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

function priorityBadge(p: string) {
  const map: Record<string, string> = {
    high: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
    medium: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    low: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  };
  return map[p] || map.medium;
}
function categoryLabel(c: string) {
  return CATEGORIES.find((x) => x.v === c)?.label ?? c;
}

function ListView({ tasks, today, now, onToggle, onEdit, onDelete, onDuplicate, onReschedule, onOpenSuggestions }: any) {
  if (!tasks.length) {
    return (
      <div className="rounded-3xl bg-card border border-dashed border-border p-12 text-center text-muted-foreground">
        No study tasks yet — add your first session above ✨
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {tasks.map((t: Task) => {
        const isToday = t.study_date === today;
        const isOverdue = !t.completed && taskDateTime(t) < now;
        const ring = t.completed
          ? "border-emerald-300/60 bg-emerald-50/30 dark:bg-emerald-500/5"
          : isOverdue
          ? "border-rose-300/60 bg-rose-50/30 dark:bg-rose-500/5"
          : isToday
          ? "border-primary/50 bg-primary/5"
          : "border-border/60";
        return (
          <div key={t.id} className={`rounded-2xl border ${ring} p-4 shadow-card transition-all hover:-translate-y-0.5`}>
            <div className="flex flex-wrap items-start gap-3">
              <button onClick={() => onToggle(t)} className="mt-1 shrink-0" aria-label="Toggle complete">
                <CheckCircle2 className={`h-6 w-6 ${t.completed ? "text-emerald-500 fill-emerald-500/20" : "text-muted-foreground hover:text-primary"}`} />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`font-semibold ${t.completed ? "line-through text-muted-foreground" : ""}`}>
                    {t.subject} · {t.topic}
                  </span>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${priorityBadge(t.priority)}`}>{t.priority}</span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{categoryLabel(t.category)}</span>
                  {isToday && !t.completed && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-primary/15 text-primary">Today</span>}
                  {isOverdue && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600">Overdue</span>}
                </div>
                {t.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{t.description}</p>}
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{t.study_date}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{t.study_time.slice(0, 5)} · {t.duration_minutes}m</span>
                  {t.reminder_enabled && <span className="flex items-center gap-1"><BellRing className="h-3.5 w-3.5" />{t.reminder_minutes_before < 60 ? `${t.reminder_minutes_before}m` : t.reminder_minutes_before === 1440 ? "1d" : `${t.reminder_minutes_before / 60}h`} before</span>}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                {t.ai_suggestions && (
                  <IconBtn title="AI suggestions" onClick={() => onOpenSuggestions(t)}><Sparkles className="h-4 w-4 text-primary" /></IconBtn>
                )}
                <IconBtn title="Reschedule" onClick={() => onReschedule(t)}><Clock className="h-4 w-4" /></IconBtn>
                <IconBtn title="Edit" onClick={() => onEdit(t)}><Pencil className="h-4 w-4" /></IconBtn>
                <IconBtn title="Duplicate" onClick={() => onDuplicate(t.id)}><Copy className="h-4 w-4" /></IconBtn>
                <IconBtn title="Delete" onClick={() => confirm("Delete this task?") && onDelete(t.id)}><Trash2 className="h-4 w-4 text-rose-500" /></IconBtn>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function IconBtn({ children, ...p }: any) {
  return (
    <button type="button" {...p} className="h-8 w-8 grid place-items-center rounded-full hover:bg-accent transition">
      {children}
    </button>
  );
}

function CalendarView({ tasks, onSelect }: { tasks: Task[]; onSelect: (t: Task) => void }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const year = cursor.getFullYear(); const month = cursor.getMonth();
  const first = new Date(year, month, 1); const firstDow = first.getDay();
  const daysIn = new Date(year, month + 1, 0).getDate();
  const today = todayStr();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysIn; d++) cells.push(d);

  const byDate = new Map<string, Task[]>();
  tasks.forEach((t) => {
    const arr = byDate.get(t.study_date) || []; arr.push(t); byDate.set(t.study_date, arr);
  });

  function dateStr(day: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  return (
    <div className="rounded-3xl bg-card border border-border/60 shadow-card p-5">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="rounded-full px-3 py-1 hover:bg-accent">‹</button>
        <h3 className="font-display font-bold text-lg">{cursor.toLocaleString(undefined, { month: "long", year: "numeric" })}</h3>
        <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="rounded-full px-3 py-1 hover:bg-accent">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground mb-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} className="aspect-square" />;
          const ds = dateStr(d);
          const items = byDate.get(ds) || [];
          const isToday = ds === today;
          return (
            <div key={i} className={`aspect-square rounded-xl border p-1.5 flex flex-col gap-0.5 text-left overflow-hidden ${isToday ? "border-primary bg-primary/5" : "border-border/40"}`}>
              <div className={`text-xs font-semibold ${isToday ? "text-primary" : ""}`}>{d}</div>
              <div className="flex-1 overflow-hidden space-y-0.5">
                {items.slice(0, 3).map((t) => (
                  <button key={t.id} onClick={() => onSelect(t)}
                    className={`w-full text-[10px] truncate rounded px-1 py-0.5 text-left ${t.completed ? "bg-emerald-500/15 text-emerald-700 line-through" : taskDateTime(t) < new Date() ? "bg-rose-500/15 text-rose-700" : "bg-primary/15 text-primary"}`}>
                    {t.study_time.slice(0, 5)} {t.topic}
                  </button>
                ))}
                {items.length > 3 && <div className="text-[10px] text-muted-foreground">+{items.length - 3} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SuggestionModal({ task, onClose }: { task: Task; onClose: () => void }) {
  const s = task.ai_suggestions || {};
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-3xl bg-card border border-border shadow-glow p-6 space-y-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wide"><Sparkles className="h-4 w-4" /> AI Recommendation</div>
            <h3 className="font-display text-xl font-bold mt-1">{task.subject} · {task.topic}</h3>
          </div>
          <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-full hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        {!task.ai_suggestions ? (
          <p className="text-sm text-muted-foreground">No AI suggestions available for this task.</p>
        ) : (
          <div className="space-y-4 text-sm">
            {s.estimated_study_time && (
              <div><div className="font-semibold mb-1">⏱ Estimated study time</div><div className="text-muted-foreground">{s.estimated_study_time}</div></div>
            )}
            {Array.isArray(s.study_order) && s.study_order.length > 0 && (
              <div>
                <div className="font-semibold mb-1">📋 Suggested study order</div>
                <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">{s.study_order.map((x: string, i: number) => <li key={i}>{x}</li>)}</ol>
              </div>
            )}
            {Array.isArray(s.learning_tips) && s.learning_tips.length > 0 && (
              <div>
                <div className="font-semibold mb-1">💡 Learning tips</div>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">{s.learning_tips.map((x: string, i: number) => <li key={i}>{x}</li>)}</ul>
              </div>
            )}
            {s.recommended_quiz && (
              <div><div className="font-semibold mb-1">🧠 Recommended quiz</div><div className="text-muted-foreground">{s.recommended_quiz}</div></div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
