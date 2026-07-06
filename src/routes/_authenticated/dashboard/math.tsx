import { createFileRoute } from "@tanstack/react-router";
import { Calculator, ImagePlus, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/math")({
  head: () => ({ meta: [{ title: "Math Tutor — StudyBloom AI" }] }),
  component: MathTutorPage,
});

function MathTutorPage() {
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
          placeholder="Type your mathematical question here..."
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

        <button
          type="button"
          className="rounded-full bg-gradient-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft hover:shadow-glow flex items-center gap-2"
        >
          <Sparkles className="h-4 w-4" /> Solve
        </button>
      </section>

      <section className="rounded-3xl bg-card border border-border/60 shadow-card p-6">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Solution
        </div>
        <div className="rounded-2xl border border-border/60 bg-background/40 p-10 grid place-items-center text-sm text-muted-foreground">
          Your mathematical solution will appear here.
        </div>
      </section>
    </div>
  );
}
