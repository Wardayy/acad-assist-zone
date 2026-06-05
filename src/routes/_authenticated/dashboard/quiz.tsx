import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Brain, Loader2, Sparkles, Trash2, CheckCircle2, XCircle, RotateCcw, Plus, History } from "lucide-react";
import { toast } from "sonner";
import {
  listQuizzes,
  getQuiz,
  generateQuiz,
  submitQuizAttempt,
  deleteQuiz,
  type QuizQuestion,
} from "@/lib/quiz.functions";

export const Route = createFileRoute("/_authenticated/dashboard/quiz")({
  head: () => ({ meta: [{ title: "Quiz Generator — StudyBloom AI" }] }),
  component: QuizPage,
});

type Mode = "create" | "take" | "results";

function QuizPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listQuizzes);
  const getFn = useServerFn(getQuiz);
  const genFn = useServerFn(generateQuiz);
  const subFn = useServerFn(submitQuizAttempt);
  const delFn = useServerFn(deleteQuiz);

  const list = useQuery({ queryKey: ["quizzes"], queryFn: () => listFn() });

  const [mode, setMode] = useState<Mode>("create");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ score: number; total: number; details: Record<string, { correct: boolean; expected: string; given: string }> } | null>(null);
  const [loading, setLoading] = useState(false);

  // Create form state
  const [topic, setTopic] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [types, setTypes] = useState<("mcq" | "true_false" | "short")[]>(["mcq"]);

  const activeQ = useQuery({
    queryKey: ["quiz", activeId],
    queryFn: () => getFn({ data: { id: activeId! } }),
    enabled: !!activeId,
  });

  const quiz = activeQ.data?.quiz;
  const questions = useMemo<QuizQuestion[]>(
    () => ((quiz?.questions as unknown as QuizQuestion[]) ?? []),
    [quiz],
  );

  function toggleType(t: "mcq" | "true_false" | "short") {
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  async function onGenerate() {
    if (!topic.trim()) return toast.error("Add a topic");
    if (types.length === 0) return toast.error("Pick at least one question type");
    setLoading(true);
    try {
      const res = await genFn({
        data: {
          topic: topic.trim(),
          sourceText: sourceText.trim() || undefined,
          count,
          difficulty,
          types,
        },
      });
      qc.invalidateQueries({ queryKey: ["quizzes"] });
      setActiveId(res.quiz.id);
      setAnswers({});
      setResult(null);
      setMode("take");
      toast.success("Quiz ready — good luck!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit() {
    if (!activeId) return;
    const unanswered = questions.filter((q) => !answers[q.id]?.trim()).length;
    if (unanswered > 0 && !confirm(`${unanswered} unanswered question(s). Submit anyway?`)) return;
    setLoading(true);
    try {
      const res = await subFn({ data: { quizId: activeId, answers } });
      setResult(res);
      setMode("results");
      qc.invalidateQueries({ queryKey: ["quizzes"] });
      qc.invalidateQueries({ queryKey: ["quiz", activeId] });
      toast.success(`Scored ${res.score}/${res.total}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  function retake() {
    setAnswers({});
    setResult(null);
    setMode("take");
  }

  function openQuiz(id: string) {
    setActiveId(id);
    setAnswers({});
    setResult(null);
    setMode("take");
  }

  async function removeQuiz(id: string) {
    if (!confirm("Delete this quiz and all attempts?")) return;
    await delFn({ data: { id } });
    if (activeId === id) {
      setActiveId(null);
      setMode("create");
    }
    qc.invalidateQueries({ queryKey: ["quizzes"] });
  }

  const quizzes = list.data?.quizzes ?? [];
  const attempts = activeQ.data?.attempts ?? [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <Brain className="h-7 w-7 text-primary" /> Quiz Generator
          </h1>
          <p className="text-muted-foreground mt-1">
            Generate personalized quizzes from a topic or your notes — auto-graded with explanations.
          </p>
        </div>
        <button
          onClick={() => { setMode("create"); setActiveId(null); setResult(null); }}
          className="rounded-full bg-card border border-border px-4 py-2 text-sm font-medium hover:bg-accent flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> New quiz
        </button>
      </header>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-4">
          {mode === "create" && (
            <div className="rounded-3xl bg-card border border-border/60 shadow-card p-5 space-y-4">
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Topic (e.g. Newton's Laws of Motion)"
                className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-primary/20"
              />
              <textarea
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                rows={8}
                placeholder="Optional — paste notes to base the quiz on..."
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-primary/20"
              />
              <div className="grid sm:grid-cols-3 gap-3">
                <label className="text-sm">
                  <span className="text-muted-foreground block mb-1">Questions</span>
                  <input
                    type="number"
                    min={3}
                    max={20}
                    value={count}
                    onChange={(e) => setCount(Math.max(3, Math.min(20, Number(e.target.value) || 5)))}
                    className="w-full rounded-2xl border border-border bg-background px-3 py-2"
                  />
                </label>
                <label className="text-sm">
                  <span className="text-muted-foreground block mb-1">Difficulty</span>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}
                    className="w-full rounded-2xl border border-border bg-background px-3 py-2"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </label>
                <div className="text-sm">
                  <span className="text-muted-foreground block mb-1">Types</span>
                  <div className="flex flex-wrap gap-2">
                    {([
                      ["mcq", "MCQ"],
                      ["true_false", "T/F"],
                      ["short", "Short"],
                    ] as const).map(([k, label]) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => toggleType(k)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium border ${
                          types.includes(k)
                            ? "bg-gradient-primary text-primary-foreground border-transparent"
                            : "bg-background border-border hover:bg-accent"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={onGenerate}
                disabled={loading}
                className="rounded-full bg-gradient-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft hover:shadow-glow disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generate quiz
              </button>
            </div>
          )}

          {(mode === "take" || mode === "results") && quiz && (
            <article className="rounded-3xl bg-card border border-border/60 shadow-card p-6 space-y-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="font-display text-2xl font-bold">{quiz.title}</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    {questions.length} questions · {quiz.difficulty}
                    {quiz.best_score != null && ` · best ${quiz.best_score}/${questions.length}`}
                  </p>
                </div>
                {mode === "results" && result && (
                  <div className="rounded-2xl bg-gradient-primary text-primary-foreground px-4 py-2 text-sm font-semibold shadow-soft">
                    Score: {result.score} / {result.total}
                  </div>
                )}
              </div>

              <ol className="space-y-5">
                {questions.map((q, idx) => {
                  const given = answers[q.id] ?? "";
                  const detail = result?.details[q.id];
                  return (
                    <li key={q.id} className="rounded-2xl border border-border/60 p-4 bg-background/40">
                      <div className="flex items-start gap-2">
                        <span className="text-sm font-semibold text-primary">{idx + 1}.</span>
                        <p className="text-sm font-medium flex-1">{q.question}</p>
                        {detail && (detail.correct ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                        ) : (
                          <XCircle className="h-5 w-5 text-destructive shrink-0" />
                        ))}
                      </div>

                      <div className="mt-3 space-y-2">
                        {q.type === "short" ? (
                          <input
                            value={given}
                            onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                            disabled={mode === "results"}
                            placeholder="Your answer..."
                            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:opacity-70"
                          />
                        ) : (
                          (q.options ?? []).map((opt) => {
                            const selected = given === opt;
                            const isCorrect = mode === "results" && opt === q.answer;
                            const isWrongPick = mode === "results" && selected && opt !== q.answer;
                            return (
                              <label
                                key={opt}
                                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm cursor-pointer transition ${
                                  isCorrect
                                    ? "border-emerald-500/60 bg-emerald-500/10"
                                    : isWrongPick
                                      ? "border-destructive/60 bg-destructive/10"
                                      : selected
                                        ? "border-primary bg-primary/10"
                                        : "border-border hover:bg-accent/50"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={q.id}
                                  value={opt}
                                  checked={selected}
                                  disabled={mode === "results"}
                                  onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                                  className="accent-primary"
                                />
                                <span>{opt}</span>
                              </label>
                            );
                          })
                        )}
                      </div>

                      {mode === "results" && detail && !detail.correct && (
                        <p className="mt-3 text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">Correct answer:</span> {q.answer}
                          {q.explanation && <> — {q.explanation}</>}
                        </p>
                      )}
                      {mode === "results" && detail?.correct && q.explanation && (
                        <p className="mt-3 text-xs text-muted-foreground">{q.explanation}</p>
                      )}
                    </li>
                  );
                })}
              </ol>

              <div className="flex items-center gap-3">
                {mode === "take" && (
                  <button
                    onClick={onSubmit}
                    disabled={loading}
                    className="rounded-full bg-gradient-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft hover:shadow-glow disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Submit answers
                  </button>
                )}
                {mode === "results" && (
                  <button
                    onClick={retake}
                    className="rounded-full bg-card border border-border px-4 py-2 text-sm font-medium hover:bg-accent flex items-center gap-2"
                  >
                    <RotateCcw className="h-4 w-4" /> Retake
                  </button>
                )}
              </div>

              {attempts.length > 0 && (
                <div className="pt-3 border-t border-border/60">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2">
                    <History className="h-3.5 w-3.5" /> Past attempts
                  </div>
                  <ul className="space-y-1 text-sm">
                    {attempts.map((a) => (
                      <li key={a.id} className="flex items-center justify-between text-muted-foreground">
                        <span>{new Date(a.created_at).toLocaleString()}</span>
                        <span className="font-medium text-foreground">{a.score}/{a.total}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          )}

          {activeQ.isLoading && activeId && (
            <div className="rounded-3xl bg-card border border-border/60 p-10 grid place-items-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
        </div>

        <aside className="rounded-3xl bg-card border border-border/60 shadow-card p-3 h-fit">
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            My quizzes
          </div>
          <div className="space-y-1 max-h-[70vh] overflow-y-auto">
            {quizzes.length === 0 && (
              <div className="text-sm text-muted-foreground p-3">No quizzes yet — generate one!</div>
            )}
            {quizzes.map((q) => {
              const total = Array.isArray(q.questions) ? q.questions.length : 0;
              return (
                <div
                  key={q.id}
                  onClick={() => openQuiz(q.id)}
                  className={`group rounded-2xl p-3 cursor-pointer ${
                    activeId === q.id ? "bg-accent" : "hover:bg-accent/60"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <Brain className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{q.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {total} q · {q.difficulty}
                        {q.best_score != null && ` · best ${q.best_score}/${total}`}
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeQuiz(q.id); }}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}
