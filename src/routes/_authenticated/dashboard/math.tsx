import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Calculator, ImagePlus, Sparkles, Loader2 } from "lucide-react";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import { solveMath } from "@/lib/math.functions";

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
    // basic bold
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
  // Split by block math $$...$$ first
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
  const solve = useServerFn(solveMath);
  const [question, setQuestion] = useState("");
  const [solution, setSolution] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  async function handleSolve() {
    setError("");
    const q = question.trim();
    if (!q) {
      setError("Please enter a mathematical question first.");
      return;
    }
    setLoading(true);
    setSolution("");
    try {
      const res = await solve({ data: { question: q } });
      setSolution(res.solution);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Calculator className="h-7 w-7 text-primary" /> Math Tutor
        </h1>
        <p className="text-muted-foreground mt-1">
          Solve mathematical problems with step-by-step AI explanations.
        </p>
      </header>

      <section className="rounded-3xl bg-card border border-border/60 shadow-card p-5 space-y-4">
        <textarea
          rows={8}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Type your mathematical question here... (Algebra, Geometry, Trigonometry, Calculus, Statistics, Linear Algebra)"
          className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-primary/20"
        />

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
          <div className="rounded-2xl border border-border/60 bg-background/40 p-6">
            <MathContent text={solution} />
          </div>
        ) : (
          <div className="rounded-2xl border border-border/60 bg-background/40 p-10 grid place-items-center text-sm text-muted-foreground">
            {loading ? "Working on your solution..." : "Your mathematical solution will appear here."}
          </div>
        )}
      </section>
    </div>
  );
}
