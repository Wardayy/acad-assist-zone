import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Lightbulb, Sparkles, Loader2, Copy, RefreshCw, Save, Download, Share2,
  Search, Trash2, GraduationCap, Baby, BookOpen, Briefcase, ClipboardCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  generateExplanation,
  listExplanations,
  deleteExplanation,
} from "@/lib/learning.functions";
import { Markdown } from "@/components/Markdown";

export const Route = createFileRoute("/_authenticated/dashboard/explainer")({
  head: () => ({ meta: [{ title: "AI Learning Mode — StudyBloom AI" }] }),
  component: AILearningMode,
});

const MODES = [
  { id: "explain_simply", label: "Explain Simply", desc: "Beginner-friendly language.", icon: Sparkles },
  { id: "explain_like_10", label: "Explain Like I'm 10", desc: "Fun, playful & simple.", icon: Baby },
  { id: "university", label: "University Level", desc: "Academic & rigorous.", icon: GraduationCap },
  { id: "interview", label: "Interview Prep", desc: "Practical & question-driven.", icon: Briefcase },
  { id: "exam", label: "Exam Preparation", desc: "Revision-oriented.", icon: ClipboardCheck },
] as const;

type Mode = (typeof MODES)[number]["id"];

const DEFAULT_OPTS = {
  examples: true,
  stepByStep: true,
  analogies: true,
  keywords: true,
  revision: false,
};

function AILearningMode() {
  const qc = useQueryClient();
  const generateFn = useServerFn(generateExplanation);
  const listFn = useServerFn(listExplanations);
  const deleteFn = useServerFn(deleteExplanation);

  const [input, setInput] = useState("");
  const [mode, setMode] = useState<Mode>("explain_simply");
  const [difficulty, setDifficulty] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [length, setLength] = useState<"short" | "medium" | "detailed">("medium");
  const [opts, setOpts] = useState(DEFAULT_OPTS);
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);

  const { data: historyData } = useQuery({
    queryKey: ["learning-explanations"],
    queryFn: () => listFn(),
  });

  const history = historyData?.explanations ?? [];

  const filteredHistory = useMemo(() => {
    if (!search.trim()) return history;
    const q = search.toLowerCase();
    return history.filter(
      (h: any) =>
        h.input?.toLowerCase().includes(q) ||
        h.explanation?.toLowerCase().includes(q),
    );
  }, [history, search]);

  const generate = useMutation({
    mutationFn: () =>
      generateFn({
        data: {
          input: input.trim(),
          learningMode: mode,
          difficulty,
          responseLength: length,
          options: opts,
        },
      }),
    onSuccess: (res) => {
      setExplanation(res.explanation.explanation);
      setActiveId(res.explanation.id);
      qc.invalidateQueries({ queryKey: ["learning-explanations"] });
      toast.success("Explanation generated ✨");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to generate"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["learning-explanations"] });
      toast.success("Deleted");
    },
  });

  function handleGenerate() {
    if (!input.trim()) {
      toast.error("Please enter a topic or concept first.");
      return;
    }
    generate.mutate();
  }

  function openHistoryItem(h: any) {
    setActiveId(h.id);
    setExplanation(h.explanation);
    setInput(h.input);
    setMode(h.learning_mode);
    setDifficulty(h.difficulty);
    setLength(h.response_length);
    if (h.options) setOpts({ ...DEFAULT_OPTS, ...h.options });
  }

  async function copyExp() {
    if (!explanation) return;
    await navigator.clipboard.writeText(explanation);
    toast.success("Copied to clipboard");
  }

  function downloadTxt() {
    if (!explanation) return;
    const blob = new Blob([explanation], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `explanation-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function share() {
    if (!explanation) return;
    const title = "StudyBloom AI Explanation";
    if (navigator.share) {
      try {
        await navigator.share({ title, text: explanation });
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(explanation);
      toast.success("Copied — share away!");
    }
  }

  function saveAgain() {
    if (!explanation) return;
    toast.success("Saved to your history");
  }

  return (
    <div className="max-w-7xl mx-auto grid lg:grid-cols-[1fr_320px] gap-6">
      {/* Main */}
      <div className="space-y-6 min-w-0">
        {/* Header */}
        <div className="rounded-3xl bg-gradient-hero p-6 md:p-8 shadow-card relative overflow-hidden">
          <Lightbulb className="absolute right-6 top-6 h-16 w-16 text-primary/20" />
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Lightbulb className="h-4 w-4" /> AI Learning Mode
          </div>
          <h1 className="mt-2 font-display text-3xl md:text-4xl font-bold">
            Learn any concept, your way
          </h1>
          <p className="mt-2 text-muted-foreground max-w-2xl">
            Understand any concept in the learning style that suits you best.
          </p>
        </div>

        {/* Input */}
        <div className="rounded-3xl bg-card border border-border/60 shadow-card p-5 md:p-6 space-y-5">
          <div>
            <label className="text-sm font-semibold mb-2 block">What do you want to learn?</label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter any topic, notes, concept, or question..."
              className="w-full min-h-[140px] rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y"
            />
          </div>

          {/* Mode picker */}
          <div>
            <div className="text-sm font-semibold mb-2">Learning style</div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {MODES.map((m) => {
                const active = mode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMode(m.id)}
                    className={`text-left rounded-2xl p-3 border transition-all ${
                      active
                        ? "bg-gradient-primary text-primary-foreground border-transparent shadow-soft"
                        : "bg-background/60 border-border hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <m.icon className="h-4 w-4 shrink-0" />
                      <span className="font-semibold text-sm">{m.label}</span>
                    </div>
                    <div className={`text-xs mt-1 ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                      {m.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Difficulty + Length */}
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-semibold mb-1.5 block">Difficulty</span>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold mb-1.5 block">Response length</span>
              <select
                value={length}
                onChange={(e) => setLength(e.target.value as any)}
                className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="short">Short</option>
                <option value="medium">Medium</option>
                <option value="detailed">Detailed</option>
              </select>
            </label>
          </div>

          {/* Options */}
          <div>
            <div className="text-sm font-semibold mb-2">Additional options</div>
            <div className="grid sm:grid-cols-2 gap-2">
              {[
                ["examples", "Include real-life examples"],
                ["stepByStep", "Explain step-by-step"],
                ["analogies", "Use analogies"],
                ["keywords", "Highlight important keywords"],
                ["revision", "Generate quick revision notes"],
              ].map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center gap-2 rounded-xl border border-border bg-background/40 px-3 py-2 text-sm cursor-pointer hover:bg-accent/40"
                >
                  <input
                    type="checkbox"
                    checked={(opts as any)[key]}
                    onChange={(e) =>
                      setOpts((p) => ({ ...p, [key as string]: e.target.checked }))
                    }
                    className="h-4 w-4 rounded accent-primary"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generate.isPending}
            className="w-full sm:w-auto rounded-full bg-gradient-primary px-7 py-3 text-sm font-semibold text-primary-foreground shadow-soft disabled:opacity-60 inline-flex items-center gap-2"
          >
            {generate.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Generating explanation...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Generate Explanation
              </>
            )}
          </button>
        </div>

        {/* Response */}
        {generate.isError && !generate.isPending && (
          <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-center">
            <p className="text-sm text-destructive mb-3">
              Something went wrong while generating. {(generate.error as any)?.message}
            </p>
            <button
              onClick={handleGenerate}
              className="rounded-full bg-gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground inline-flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" /> Retry
            </button>
          </div>
        )}

        {explanation ? (
          <div className="rounded-3xl bg-card border border-border/60 shadow-card p-6 md:p-8 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BookOpen className="h-4 w-4 text-primary" />
                <span className="capitalize">
                  {MODES.find((m) => m.id === mode)?.label} · {difficulty} · {length}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <ActionBtn icon={Copy} label="Copy" onClick={copyExp} />
                <ActionBtn icon={RefreshCw} label="Regenerate" onClick={handleGenerate} />
                <ActionBtn icon={Save} label="Save" onClick={saveAgain} />
                <ActionBtn icon={Download} label="TXT" onClick={downloadTxt} />
                <ActionBtn icon={Share2} label="Share" onClick={share} />
              </div>
            </div>
            <div className="prose-sm max-w-none">
              <Markdown text={explanation} />
            </div>
          </div>
        ) : !generate.isPending && !generate.isError ? (
          <div className="rounded-3xl bg-card/60 border border-dashed border-border p-10 text-center">
            <div className="mx-auto h-16 w-16 rounded-3xl bg-gradient-primary grid place-items-center shadow-soft mb-4">
              <Lightbulb className="h-8 w-8 text-primary-foreground" />
            </div>
            <h3 className="font-display text-lg font-bold">Ready when you are</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Start learning by entering any topic above.
            </p>
          </div>
        ) : null}
      </div>

      {/* History sidebar */}
      <aside className="space-y-3 lg:sticky lg:top-20 self-start">
        <div className="rounded-3xl bg-card border border-border/60 shadow-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search history…"
              className="flex-1 bg-transparent text-sm focus:outline-none"
            />
          </div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2 px-1">
            Your explanations
          </div>
          <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
            {filteredHistory.length === 0 && (
              <p className="text-xs text-muted-foreground italic px-1 py-4">
                No saved explanations yet.
              </p>
            )}
            {filteredHistory.map((h: any) => {
              const active = h.id === activeId;
              return (
                <div
                  key={h.id}
                  className={`group rounded-2xl border px-3 py-2 text-sm cursor-pointer transition-all ${
                    active
                      ? "border-primary/50 bg-primary/5"
                      : "border-border/60 hover:bg-accent/40"
                  }`}
                  onClick={() => openHistoryItem(h)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{h.input}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {MODES.find((m) => m.id === h.learning_mode)?.label} ·{" "}
                        {new Date(h.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        remove.mutate(h.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-destructive"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
}

function ActionBtn({
  icon: Icon,
  label,
  onClick,
}: {
  icon: any;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full bg-background border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}
