import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.6-flash";

const PRIORITY = ["low", "medium", "high"] as const;
const DIFFICULTY = ["easy", "medium", "hard"] as const;
const CATEGORY = ["revision", "new_topic", "assignment", "quiz_practice", "exam_prep", "custom"] as const;

const taskSchema = z.object({
  subject: z.string().min(1).max(120),
  topic: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  study_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  study_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  duration_minutes: z.number().int().min(5).max(600),
  priority: z.enum(PRIORITY),
  difficulty: z.enum(DIFFICULTY),
  category: z.enum(CATEGORY),
  reminder_enabled: z.boolean(),
  reminder_minutes_before: z.number().int().min(0).max(1440),
});

export type StudyTaskInput = z.infer<typeof taskSchema>;

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
    if (res.status === 429) throw new Error("Rate limit reached — please try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted. Please add credits to your workspace.");
    throw new Error(`AI error (${res.status}): ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content as string;
}

function tryParseJson(text: string): any | null {
  if (!text) return null;
  const cleaned = text.replace(/```json|```/g, "").trim();
  try { return JSON.parse(cleaned); } catch {}
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch {} }
  return null;
}

async function generateSuggestions(task: StudyTaskInput, profile: any) {
  const sys = `You are an expert study coach for StudyBloom AI. Return ONLY valid JSON matching this schema:
{
  "estimated_study_time": "string (e.g. '45-60 minutes')",
  "study_order": ["step 1", "step 2", "step 3", "step 4"],
  "learning_tips": ["tip 1", "tip 2", "tip 3"],
  "recommended_quiz": "string (one specific quiz suggestion based on the topic)"
}
Adapt to the learner's level: ${profile?.education_level ?? "general"}; language: ${profile?.preferred_language ?? "English"}.`;
  const user = `Subject: ${task.subject}
Topic: ${task.topic}
Description: ${task.description ?? "(none)"}
Difficulty: ${task.difficulty}
Priority: ${task.priority}
Category: ${task.category}
Planned duration: ${task.duration_minutes} minutes
Generate the JSON.`;
  const text = await callAI([
    { role: "system", content: sys },
    { role: "user", content: user },
  ]);
  return tryParseJson(text);
}

export const createStudyTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: StudyTaskInput) => taskSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("education_level,preferred_language,favorite_subjects")
      .eq("id", userId)
      .maybeSingle();

    let ai_suggestions: any = null;
    try { ai_suggestions = await generateSuggestions(data, profile); } catch (e) { ai_suggestions = null; }

    const { data: row, error } = await (supabase as any)
      .from("study_tasks")
      .insert({ ...data, user_id: userId, ai_suggestions })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { task: row };
  });

export const listStudyTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await (supabase as any)
      .from("study_tasks")
      .select("*")
      .eq("user_id", userId)
      .order("study_date", { ascending: true })
      .order("study_time", { ascending: true });
    if (error) throw new Error(error.message);
    return { tasks: data ?? [] };
  });

export const updateStudyTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; patch: Partial<StudyTaskInput> & { completed?: boolean } }) =>
    z.object({
      id: z.string().uuid(),
      patch: z.object({
        subject: z.string().min(1).max(120).optional(),
        topic: z.string().min(1).max(200).optional(),
        description: z.string().max(2000).nullable().optional(),
        study_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        study_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
        duration_minutes: z.number().int().min(5).max(600).optional(),
        priority: z.enum(PRIORITY).optional(),
        difficulty: z.enum(DIFFICULTY).optional(),
        category: z.enum(CATEGORY).optional(),
        reminder_enabled: z.boolean().optional(),
        reminder_minutes_before: z.number().int().min(0).max(1440).optional(),
        completed: z.boolean().optional(),
      }),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const patch: any = { ...data.patch };
    if (typeof patch.completed === "boolean") {
      patch.completed_at = patch.completed ? new Date().toISOString() : null;
    }
    const { data: row, error } = await (supabase as any)
      .from("study_tasks")
      .update(patch)
      .eq("id", data.id)
      .eq("user_id", userId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { task: row };
  });

export const deleteStudyTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await (supabase as any)
      .from("study_tasks").delete().eq("id", data.id).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const duplicateStudyTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: src, error: e1 } = await (supabase as any)
      .from("study_tasks").select("*").eq("id", data.id).eq("user_id", userId).single();
    if (e1) throw new Error(e1.message);
    const { id, created_at, updated_at, completed, completed_at, ...rest } = src;
    const { data: row, error } = await (supabase as any)
      .from("study_tasks")
      .insert({ ...rest, completed: false, completed_at: null })
      .select("*").single();
    if (error) throw new Error(error.message);
    return { task: row };
  });
