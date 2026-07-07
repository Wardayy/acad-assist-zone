import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Calculator, ImagePlus, Sparkles, Loader2, History, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import {
  solveMath,
  listMathSolutions,
  getMathSolution,
  deleteMathSolution,
} from "@/lib/math.functions";

export const Route = createFileRoute("/_authenticated/dashboard/math")({
  head: () => ({ meta: [{ title: "Math Tutor — StudyBloom AI" }] }),
  component: MathTutorPage,
});

function renderInline(text: string, keyBase: string) {
  const parts = text.split(/(\$[^$\n]+\$)/g);
  return parts.map((p, i) => {
    if (p.startsWith("$") && p.endsWith("$") && p.length > 2) {
      try {
        return <InlineMath key={`${keyBase}-${i}`} math={p.slice(1, -1)} />;
      } catch {
        return <span key={`${keyBase}-${i}`}>{p}</span>;
      }
    }
    const boldSplit = p.split(/(\*\*[^*]+\*\*)/g);
    return (
      <span key={`${keyBase}-${i}`}>
        {boldSplit.map((b, j) =>
          b.startsWith("**") && b.endsWith("**") ? (
            <strong key={j} className="font-semibold text-foreground">{b.slice(2, -2)}</strong>
          ) : (
            <span key={j}>{b}</span>
          ),
        )}
      </span>
    );
  });
}

function MathContent({ text }: { text: string }) {
  const blocks = text.split(/(\$\$[\s\S]+?\$\$)/g);
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {blocks.map((block, bi) => {
        if (block.startsWith("$$") && block.endsWith("$$")) {
          const math = block.slice(2, -2).trim();
          try {
            return (
              <div key={bi} className="my-3 overflow-x-auto">
                <BlockMath math={math} />
              </div>
            );
          } catch {
            return <div key={bi}>{block}</div>;
          }
        }
        const lines = block.split("\n");
        return (
          <div key={bi}>
            {lines.map((line, li) => {
              const trimmed = line.trim();
              if (!trimmed) return <div key={li} className="h-2" />;
              const h = trimmed.match(/^(#{1,4})\s+(.*)$/);
              if (h) {
                const lvl = h[1].length;
                const cls =
                  lvl === 1
                    ? "text-xl font-display font-bold mt-4 mb-2"
                    : lvl === 2
                    ? "text-lg font-display font-bold mt-3 mb-1.5"
                    : "text-base font-semibold mt-2 mb-1";
                return (
                  <div key={li} className={cls}>
                    {renderInline(h[2], `${bi}-${li}`)}
                  </div>
                );
              }
              const li_ = trimmed.match(/^[-*]\s+(.*)$/);
              if (li_) {
                return (
                  <div key={li} className="flex gap-2 pl-2">
                    <span className="text-primary">•</span>
                    <div>{renderInline(li_[1], `${bi}-${li}`)}</div>
                  </div>
                );
              }
              return <p key={li}>{renderInline(line, `${bi}-${li}`)}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
}

function MathTutorPage() {
  const qc = useQueryClient();
  const solve = useServerFn(solveMath);
  const listFn = useServerFn(listMathSolutions);
  const getFn = useServerFn(getMathSolution);
  const delFn = useServerFn(deleteMathSolution);

  const [question, setQuestion] = useState("");
  const [solution, setSolution] = useState<string>("");
  const [activeQuestion, setActiveQuestion] = useState<string>("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const list = useQuery({ queryKey: ["math_solutions"], queryFn: () => listFn() });

  async function handleSolve() {
    setError("");
    const q = question.trim();
    if (!q) {
      setError("Please enter a mathematical question first.");
      return;
    }
    setLoading(true);
    setSolution("");
    setActiveId(null);
    try {
      const res = await solve({ data: { question: q } });
      setSolution(res.solution);
      setActiveQuestion(q);
      setActiveId(res.id);
      qc.invalidateQueries({ queryKey: ["math_solutions"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function openSolution(id: string) {
    setError("");
    setLoading(true);
    setSolution("");
    try {
      const res = await getFn({ data: { id } });
      setSolution(res.solution.solution);
      setActiveQuestion(res.solution.question);
      setQuestion(res.solution.question);
      setActiveId(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load solution");
    } finally {
      setLoading(false);
    }
  }

  async function removeSolution(id: string) {
    if (!confirm("Delete this solution from history?")) return;
    try {
      await delFn({ data: { id } });
      if (activeId === id) {
        setActiveId(null);
        setSolution("");
        setActiveQuestion("");
      }
      qc.invalidateQueries({ queryKey: ["math_solutions"] });
      toast.success("Deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  function newSolve() {
    setActiveId(null);
    setSolution("");
    setActiveQuestion("");
    setQuestion("");
    setError("");
  }

  const solutions = list.data?.solutions ?? [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <Calculator className="h-7 w-7 text-primary" /> Math Tutor
          </h1>
          <p className="text-muted-foreground mt-1">
            Solve mathematical problems with step-by-step AI explanations.
          </p>
        </div>
        <button
          onClick={newSolve}
          className="rounded-full bg-card border border-border px-4 py-2 text-sm font-medium hover:bg-accent flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> New problem
        </button>
      </header>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6">
          <section className="rounded-3xl bg-card border border-border/60 shadow-card p-5 space-y-4">
            <textarea
              rows={8}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Type your mathematical question here... (Algebra, Geometry, Trigonometry, Calculus, Statistics, Linear Algebra)"
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-primary/20"
            />

            <div className="flex flex-wrap gap-2">
              {["Algebra", "Geometry", "Statistics", "Calculus", "Trigonometry", "Linear Algebra"].map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() =>
                    setQuestion((prev) =>
                      prev.trim().length === 0 ? `${topic}: ` : `${topic}: ${prev}`,
                    )
                  }
                  className="text-xs px-3 py-1.5 rounded-full border border-border bg-card text-foreground hover:bg-accent transition"
                >
                  {topic}
                </button>
              ))}
            </div>



            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Upload images (up to 2)
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {[0, 1].map((i) => (
                  <div
                    key={i}
                    className="rounded-2xl border-2 border-dashed border-border bg-background/40 p-6 grid place-items-center text-center text-muted-foreground hover:bg-accent/40 transition cursor-pointer"
                  >
                    <ImagePlus className="h-6 w-6 mb-2 text-primary" />
                    <div className="text-sm font-medium">Upload image {i + 1}</div>
                    <div className="text-xs">PNG, JPG — coming soon</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSolve}
                disabled={loading}
                className="rounded-full bg-gradient-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft hover:shadow-glow flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Solving...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Solve
                  </>
                )}
              </button>
              {error && <div className="text-sm text-destructive">{error}</div>}
            </div>
          </section>

          <section className="rounded-3xl bg-card border border-border/60 shadow-card p-6">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Solution
            </div>
            {solution ? (
              <div className="space-y-4">
                {activeQuestion && (
                  <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      Question
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{activeQuestion}</p>
                  </div>
                )}
                <div className="rounded-2xl border border-border/60 bg-background/40 p-6">
                  <MathContent text={solution} />
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-border/60 bg-background/40 p-10 grid place-items-center text-sm text-muted-foreground">
                {loading ? "Working on your solution..." : "Your mathematical solution will appear here."}
              </div>
            )}
          </section>
        </div>

        <aside className="rounded-3xl bg-card border border-border/60 shadow-card p-3 h-fit">
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <History className="h-3.5 w-3.5" /> Past solutions
          </div>
          <div className="space-y-1 max-h-[70vh] overflow-y-auto">
            {list.isLoading && (
              <div className="p-3 text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading...
              </div>
            )}
            {!list.isLoading && solutions.length === 0 && (
              <div className="text-sm text-muted-foreground p-3">
                No solutions yet — solve a problem to save it here.
              </div>
            )}
            {solutions.map((s) => (
              <div
                key={s.id}
                onClick={() => openSolution(s.id)}
                className={`group rounded-2xl p-3 cursor-pointer ${
                  activeId === s.id ? "bg-accent" : "hover:bg-accent/60"
                }`}
              >
                <div className="flex items-start gap-2">
                  <Calculator className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium line-clamp-2">{s.question}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {new Date(s.created_at).toLocaleString()}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeSolution(s.id); }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
