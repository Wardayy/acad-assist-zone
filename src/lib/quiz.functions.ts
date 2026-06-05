import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

type Profile = {
  full_name: string | null;
  education_level: string | null;
  preferred_language: string | null;
  study_goals: string[] | null;
  favorite_subjects: string[] | null;
};

export type QuizQuestion = {
  id: string;
  type: "mcq" | "true_false" | "short";
  question: string;
  options?: string[];
  answer: string;
  explanation?: string;
};

function quizSystem(profile: Profile | null) {
  const lvl = profile?.education_level || "general";
  const lang = profile?.preferred_language || "English";
  const subj = (profile?.favorite_subjects ?? []).join(", ") || "general subjects";
  return `You are StudyBloom AI, a quiz generator. Education level: ${lvl}. Language: ${lang}. Favorite subjects context: ${subj}.
Generate clear, exam-style questions. Reply in ${lang}.
Return STRICT JSON only with shape:
{ "title": string, "questions": [
  { "id": string, "type": "mcq"|"true_false"|"short", "question": string,
    "options": string[] (4 for mcq, ["True","False"] for true_false, omit for short),
    "answer": string (must equal one of options for mcq/true_false; for short, the canonical short answer),
    "explanation": string }
]}
No markdown, no commentary, JSON only.`;
}

async function callAIJson(messages: { role: string; content: string }[]) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages, response_format: { type: "json_object" } }),
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("Rate limit reached — try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Please add credits to your Lovable workspace.");
    throw new Error(`AI error (${res.status}): ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content as string;
  try {
    return JSON.parse(content);
  } catch {
    const m = content.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error("AI returned invalid JSON");
  }
}

export const listQuizzes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("quizzes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { quizzes: data ?? [] };
  });

export const getQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: quiz, error } = await supabase
      .from("quizzes")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!quiz) throw new Error("Quiz not found");
    const { data: attempts } = await supabase
      .from("quiz_attempts")
      .select("*")
      .eq("quiz_id", data.id)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    return { quiz, attempts: attempts ?? [] };
  });

export const generateQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    topic: string;
    sourceText?: string;
    count: number;
    difficulty: "easy" | "medium" | "hard";
    types: ("mcq" | "true_false" | "short")[];
  }) =>
    z
      .object({
        topic: z.string().min(1).max(200),
        sourceText: z.string().max(40000).optional(),
        count: z.number().int().min(3).max(20),
        difficulty: z.enum(["easy", "medium", "hard"]),
        types: z.array(z.enum(["mcq", "true_false", "short"])).min(1),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name,education_level,preferred_language,study_goals,favorite_subjects")
      .eq("id", userId)
      .maybeSingle();

    const userPrompt = `Create a ${data.difficulty} quiz titled around "${data.topic}" with exactly ${data.count} questions.
Use these question types (mix freely): ${data.types.join(", ")}.
${data.sourceText ? `Base questions strictly on these notes:\n\n${data.sourceText}` : `Use general knowledge about the topic.`}`;

    const parsed = await callAIJson([
      { role: "system", content: quizSystem(profile as Profile | null) },
      { role: "user", content: userPrompt },
    ]);

    const questions: QuizQuestion[] = (parsed.questions ?? []).map((q: any, i: number) => ({
      id: String(q.id ?? i + 1),
      type: q.type === "true_false" || q.type === "short" ? q.type : "mcq",
      question: String(q.question ?? ""),
      options: Array.isArray(q.options) ? q.options.map(String) : undefined,
      answer: String(q.answer ?? ""),
      explanation: q.explanation ? String(q.explanation) : undefined,
    })).filter((q: QuizQuestion) => q.question && q.answer);

    if (questions.length === 0) throw new Error("Failed to generate questions, please try again.");

    const title = String(parsed.title ?? data.topic).slice(0, 200);

    const { data: row, error } = await supabase
      .from("quizzes")
      .insert({
        user_id: userId,
        title,
        topic: data.topic,
        source_text: data.sourceText ?? null,
        difficulty: data.difficulty,
        questions,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { quiz: row };
  });

export const submitQuizAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { quizId: string; answers: Record<string, string> }) =>
    z
      .object({
        quizId: z.string().uuid(),
        answers: z.record(z.string(), z.string().max(2000)),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: quiz, error: qerr } = await supabase
      .from("quizzes")
      .select("*")
      .eq("id", data.quizId)
      .eq("user_id", userId)
      .maybeSingle();
    if (qerr) throw new Error(qerr.message);
    if (!quiz) throw new Error("Quiz not found");

    const questions = (quiz.questions as unknown as QuizQuestion[]) ?? [];
    let score = 0;
    const details: Record<string, { correct: boolean; expected: string; given: string }> = {};
    for (const q of questions) {
      const given = (data.answers[q.id] ?? "").trim();
      const expected = q.answer.trim();
      const correct =
        q.type === "short"
          ? given.toLowerCase() === expected.toLowerCase()
          : given.toLowerCase() === expected.toLowerCase();
      if (correct) score += 1;
      details[q.id] = { correct, expected, given };
    }

    const total = questions.length;
    const best = Math.max(quiz.best_score ?? 0, score);

    const { error: aerr } = await supabase.from("quiz_attempts").insert({
      user_id: userId,
      quiz_id: quiz.id,
      score,
      total,
      answers: { responses: data.answers, details },
    });
    if (aerr) throw new Error(aerr.message);

    const { error: uerr } = await supabase
      .from("quizzes")
      .update({
        last_score: score,
        best_score: best,
        attempts_count: (quiz.attempts_count ?? 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", quiz.id)
      .eq("user_id", userId);
    if (uerr) throw new Error(uerr.message);

    return { score, total, details };
  });

export const deleteQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("quizzes")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
