import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { FileText, Loader2, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { listSummaries, summarizeNotes, deleteSummary } from "@/lib/ai.functions";
import { Markdown } from "@/components/Markdown";

export const Route = createFileRoute("/_authenticated/dashboard/summarize")({
  head: () => ({ meta: [{ title: "Notes Summarizer — StudyBloom AI" }] }),
  component: SummarizePage,
});

function SummarizePage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listSummaries);
  const sumFn = useServerFn(summarizeNotes);
  const delFn = useServerFn(deleteSummary);

  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  const q = useQuery({ queryKey: ["summaries"], queryFn: () => listFn() });

  async function run() {
    if (!title.trim() || text.trim().length < 20) {
      toast.error("Add a title and at least 20 characters of notes");
      return;
    }
    setLoading(true);
    try {
      const res = await sumFn({ data: { title, text } });
      setTitle(""); setText("");
      setActive(res.summary.id);
      qc.invalidateQueries({ queryKey: ["summaries"] });
      toast.success("Summary ready!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    await delFn({ data: { id } });
    if (active === id) setActive(null);
    qc.invalidateQueries({ queryKey: ["summaries"] });
  }

  const summaries = q.data?.summaries ?? [];
  const selected = summaries.find((s) => s.id === active);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <FileText className="h-7 w-7 text-primary" /> Notes Summarizer
        </h1>
        <p className="text-muted-foreground mt-1">Paste your lecture notes — get key concepts, definitions, formulas, and 5 exam questions.</p>
      </header>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-4">
          <div className="rounded-3xl bg-card border border-border/60 shadow-card p-5 space-y-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title (e.g. Photosynthesis chapter)"
              className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-primary/20"
            />
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={12}
              placeholder="Paste your notes here..."
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-primary/20"
            />
            <button
              onClick={run}
              disabled={loading}
              className="rounded-full bg-gradient-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft hover:shadow-glow disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Summarize
            </button>
          </div>

          {selected && (
            <article className="rounded-3xl bg-card border border-border/60 shadow-card p-6">
              <h2 className="font-display text-2xl font-bold">{selected.title}</h2>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(selected.created_at).toLocaleString()}
              </p>
              <div className="mt-4">
                <Markdown text={selected.summary} />
              </div>
            </article>
          )}
        </div>

        <aside className="rounded-3xl bg-card border border-border/60 shadow-card p-3 h-fit">
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Recent summaries
          </div>
          <div className="space-y-1 max-h-[60vh] overflow-y-auto">
            {summaries.length === 0 && (
              <div className="text-sm text-muted-foreground p-3">No summaries yet.</div>
            )}
            {summaries.map((s) => (
              <div
                key={s.id}
                onClick={() => setActive(s.id)}
                className={`group flex items-start gap-2 rounded-2xl p-3 cursor-pointer ${
                  active === s.id ? "bg-accent" : "hover:bg-accent/60"
                }`}
              >
                <FileText className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{s.title}</div>
                  <div className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); remove(s.id); }}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                  aria-label="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
