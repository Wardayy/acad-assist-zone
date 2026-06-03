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

function systemPromptFor(profile: Profile | null, mode: "chat" | "summarize") {
  const name = profile?.full_name || "the student";
  const lvl = profile?.education_level || "general";
  const lang = profile?.preferred_language || "English";
  const subj = (profile?.favorite_subjects ?? []).join(", ") || "general subjects";
  const goals = (profile?.study_goals ?? []).join(", ") || "general learning";
  const base = `You are StudyBloom AI, a warm and encouraging personal study tutor.
Student: ${name}. Education level: ${lvl}. Preferred language: ${lang}.
Favorite subjects: ${subj}. Study goals: ${goals}.
Adapt examples and analogies to their favorite subjects. Reply in ${lang} when the student writes in ${lang}; otherwise reply in English. Be clear, concise and structured. Use markdown headings, bullet lists and bold for key terms.`;
  if (mode === "summarize") {
    return base + `\n\nWhen summarizing notes, produce: a short overview, Key Concepts, Important Definitions, Bullet Summary, Important Formulas (if any), and 5 Exam-style Questions. Use markdown.`;
  }
  return base;
}

async function callAI(messages: { role: string; content: string }[]) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
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

/* ----------------------- Chat ----------------------- */

export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("chat_conversations")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { conversations: data ?? [] };
  });

export const getMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { conversationId: string }) =>
    z.object({ conversationId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("user_id", userId)
      .eq("conversation_id", data.conversationId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return { messages: rows ?? [] };
  });

export const sendChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { conversationId: string | null; content: string }) =>
    z
      .object({
        conversationId: z.string().uuid().nullable(),
        content: z.string().min(1).max(8000),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    // Profile for personalization
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name,education_level,preferred_language,study_goals,favorite_subjects")
      .eq("id", userId)
      .maybeSingle();

    // Conversation
    let convId = data.conversationId;
    if (!convId) {
      const title = data.content.slice(0, 60);
      const { data: conv, error } = await supabase
        .from("chat_conversations")
        .insert({ user_id: userId, title })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      convId = conv.id;
    }

    // Insert user message
    const { error: uerr } = await supabase.from("chat_messages").insert({
      conversation_id: convId,
      user_id: userId,
      role: "user",
      content: data.content,
    });
    if (uerr) throw new Error(uerr.message);

    // Build history for AI
    const { data: history } = await supabase
      .from("chat_messages")
      .select("role,content")
      .eq("conversation_id", convId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    const messages = [
      { role: "system", content: systemPromptFor(profile as Profile | null, "chat") },
      ...(history ?? []).map((m) => ({ role: m.role, content: m.content })),
    ];

    const assistant = await callAI(messages);

    const { error: aerr } = await supabase.from("chat_messages").insert({
      conversation_id: convId,
      user_id: userId,
      role: "assistant",
      content: assistant,
    });
    if (aerr) throw new Error(aerr.message);

    return { conversationId: convId, assistant };
  });

export const deleteConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { conversationId: string }) =>
    z.object({ conversationId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("chat_conversations")
      .delete()
      .eq("id", data.conversationId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ----------------------- Summaries ----------------------- */

export const listSummaries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("notes_summaries")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { summaries: data ?? [] };
  });

export const summarizeNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { title: string; text: string }) =>
    z.object({ title: z.string().min(1).max(200), text: z.string().min(20).max(40000) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name,education_level,preferred_language,study_goals,favorite_subjects")
      .eq("id", userId)
      .maybeSingle();

    const summary = await callAI([
      { role: "system", content: systemPromptFor(profile as Profile | null, "summarize") },
      { role: "user", content: `Summarize the following notes titled "${data.title}":\n\n${data.text}` },
    ]);

    const { data: row, error } = await supabase
      .from("notes_summaries")
      .insert({ user_id: userId, title: data.title, source_text: data.text, summary })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { summary: row };
  });

export const deleteSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("notes_summaries")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
