import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DIFFICULTY = ["easy", "medium", "hard"] as const;
const STATUS = ["not_started", "in_progress", "completed"] as const;

const itemSchema = z.object({
  title: z.string().min(1).max(200),
  subject: z.string().max(120).optional().default(""),
  category: z.string().min(1).max(80),
  description: z.string().max(4000).optional().nullable(),
  tags: z.array(z.string().max(40)).max(30).default([]),
  difficulty: z.enum(DIFFICULTY).default("medium"),
  status: z.enum(STATUS).default("not_started"),
  favorite: z.boolean().default(false),
  archived: z.boolean().default(false),
  summary_id: z.string().uuid().nullable().optional(),
  quiz_id: z.string().uuid().nullable().optional(),
  explanation_id: z.string().uuid().nullable().optional(),
  planner_task_id: z.string().uuid().nullable().optional(),
});

export type CatalogItemInput = z.infer<typeof itemSchema>;

export const listCatalogItems = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await (supabase as any)
      .from("catalog_items")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { items: data ?? [] };
  });

export const listLinkableContent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [summaries, quizzes, explanations, tasks] = await Promise.all([
      (supabase as any).from("notes_summaries").select("id,title,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
      (supabase as any).from("quizzes").select("id,title,topic,best_score,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
      (supabase as any).from("learning_explanations").select("id,input,learning_mode,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
      (supabase as any).from("study_tasks").select("id,topic,subject,study_date,completed").eq("user_id", userId).order("study_date", { ascending: false }).limit(100),
    ]);
    return {
      summaries: summaries.data ?? [],
      quizzes: quizzes.data ?? [],
      explanations: explanations.data ?? [],
      tasks: tasks.data ?? [],
    };
  });

export const createCatalogItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: CatalogItemInput) => itemSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await (supabase as any)
      .from("catalog_items")
      .insert({ ...data, user_id: userId })
      .select("*").single();
    if (error) throw new Error(error.message);
    return { item: row };
  });

export const updateCatalogItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; patch: Partial<CatalogItemInput> & { last_studied_at?: string | null } }) =>
    z.object({
      id: z.string().uuid(),
      patch: itemSchema.partial().extend({ last_studied_at: z.string().nullable().optional() }),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await (supabase as any)
      .from("catalog_items")
      .update(data.patch)
      .eq("id", data.id)
      .eq("user_id", userId)
      .select("*").single();
    if (error) throw new Error(error.message);
    return { item: row };
  });

export const deleteCatalogItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await (supabase as any)
      .from("catalog_items").delete().eq("id", data.id).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const duplicateCatalogItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: src, error: e1 } = await (supabase as any)
      .from("catalog_items").select("*").eq("id", data.id).eq("user_id", userId).single();
    if (e1) throw new Error(e1.message);
    const { id, created_at, updated_at, ...rest } = src;
    const { data: row, error } = await (supabase as any)
      .from("catalog_items")
      .insert({ ...rest, title: `${rest.title} (copy)` })
      .select("*").single();
    if (error) throw new Error(error.message);
    return { item: row };
  });
