import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.6-flash";

const LEARNING_MODES = [
  "explain_simply",
  "explain_like_10",
  "university",
  "interview",
  "exam",
] as const;
const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;
const LENGTHS = ["short", "medium", "detailed"] as const;

type Profile = {
  full_name: string | null;
  education_level: string | null;
  preferred_language: string | null;
  study_goals: string[] | null;
  favorite_subjects: string[] | null;
};

function modeInstruction(mode: string) {
  switch (mode) {
    case "explain_simply":
      return "Explain in simple, beginner-friendly language. Avoid jargon. Be warm and clear.";
    case "explain_like_10":
      return "Teach this as if explaining to a curious 10-year-old. Use fun analogies, playful examples, very simple words and short sentences.";
    case "university":
      return "Provide a rigorous, academic, university-level explanation. Use proper terminology, precise definitions, and structured reasoning.";
    case "interview":
      return "Frame the explanation for an interview candidate. Emphasize practical understanding. Include: Common Interview Questions, Practical Applications, Common Mistakes, and Interview Tips as clearly separated sections.";
    case "exam":
      return "Frame the explanation for exam preparation. Include clearly separated sections: Key Concepts, Important Definitions, Formulas (if applicable), Points to Remember, Exam Tips, Frequently Asked Questions, and a Quick Revision Box summarizing everything in bullet points.";
    default:
      return "Explain clearly.";
  }
}

function lengthInstruction(len: string) {
  if (len === "short") return "Keep the response concise — around 150–250 words.";
  if (len === "detailed") return "Provide a thorough, detailed response — 700+ words if useful.";
  return "Aim for a balanced medium length — around 350–500 words.";
}

function difficultyInstruction(d: string) {
  if (d === "beginner") return "Assume the reader is a complete beginner.";
  if (d === "advanced") return "Assume the reader is advanced and comfortable with deep technical detail.";
  return "Assume an intermediate background.";
}

function buildSystemPrompt(
  profile: Profile | null,
  mode: string,
  difficulty: string,
  length: string,
  opts: {
    examples: boolean;
    stepByStep: boolean;
    analogies: boolean;
    keywords: boolean;
    revision: boolean;
  },
) {
  const name = profile?.full_name || "the student";
  const lvl = profile?.education_level || "general";
  const lang = profile?.preferred_language || "English";
  const subj = (profile?.favorite_subjects ?? []).join(", ") || "general subjects";

  const optionLines: string[] = [];
  if (opts.examples) optionLines.push("- Include real-life examples.");
  if (opts.stepByStep) optionLines.push("- Explain step-by-step with numbered steps.");
  if (opts.analogies) optionLines.push("- Use vivid analogies to make ideas memorable.");
  if (opts.keywords) optionLines.push("- **Bold** the most important keywords throughout.");
  if (opts.revision) optionLines.push("- End with a 'Quick Revision Notes' section as a tight bullet list.");

  return `You are StudyBloom AI in **Learning Mode** — a personal AI tutor.
Student: ${name}. Education level: ${lvl}. Preferred language: ${lang}. Favorite subjects: ${subj}.

Mode: ${modeInstruction(mode)}
Difficulty: ${difficultyInstruction(difficulty)}
Length: ${lengthInstruction(length)}

Formatting rules:
- Use markdown with clear ## headings and bullet lists.
- Start with a short intro paragraph.
- Highlight important keywords in **bold**.
- Be encouraging and friendly.
${optionLines.join("\n")}

Reply in ${lang} when the student writes in ${lang}; otherwise reply in English.`;
}

async function callAI(messages: { role: string; content: string }[]) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { "Lovable-API-Key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages }),
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("Rate limit reached — please try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Please add credits to your Lovable workspace.");
    throw new Error(`AI error (${res.status}): ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content as string;
}

export const generateExplanation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    input: string;
    learningMode: string;
    difficulty: string;
    responseLength: string;
    options: {
      examples: boolean;
      stepByStep: boolean;
      analogies: boolean;
      keywords: boolean;
      revision: boolean;
    };
  }) =>
    z
      .object({
        input: z.string().min(2).max(8000),
        learningMode: z.enum(LEARNING_MODES),
        difficulty: z.enum(DIFFICULTIES),
        responseLength: z.enum(LENGTHS),
        options: z.object({
          examples: z.boolean(),
          stepByStep: z.boolean(),
          analogies: z.boolean(),
          keywords: z.boolean(),
          revision: z.boolean(),
        }),
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

    const system = buildSystemPrompt(
      profile as Profile | null,
      data.learningMode,
      data.difficulty,
      data.responseLength,
      data.options,
    );

    const explanation = await callAI([
      { role: "system", content: system },
      { role: "user", content: data.input },
    ]);

    const { data: row, error } = await supabase
      .from("learning_explanations")
      .insert({
        user_id: userId,
        input: data.input,
        learning_mode: data.learningMode,
        difficulty: data.difficulty,
        response_length: data.responseLength,
        options: data.options,
        explanation,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    return { explanation: row };
  });

export const listExplanations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("learning_explanations")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { explanations: data ?? [] };
  });

export const deleteExplanation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("learning_explanations")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
