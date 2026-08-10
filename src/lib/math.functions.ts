import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const MODEL = "gemini-2.5-flash";
const BUCKET = "math-images";

function parseDataUrl(dataUrl: string): { bytes: Uint8Array; mime: string; ext: string } | null {
  const m = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (!m) return null;
  const mime = m[1];
  const binary = atob(m[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const ext = mime.split("/")[1].replace("jpeg", "jpg");
  return { bytes, mime, ext };
}

const SYSTEM_PROMPT = `You are StudyBloom Math Tutor, an expert in Algebra, Geometry, Trigonometry, Calculus, Statistics, and Linear Algebra.

For every problem:
1. Restate the problem briefly.
2. Show clear step-by-step reasoning. Use short markdown headings like "## Step 1".
3. Format ALL mathematical expressions using LaTeX:
   - Inline math wrapped in single dollar signs: $a^2 + b^2 = c^2$
   - Display math wrapped in double dollar signs: $$\\int_0^1 x^2\\,dx = \\frac{1}{3}$$
   - Use standard LaTeX commands: \\frac{}{}, \\sqrt{}, \\int, \\sum, \\lim, \\vec{}, \\begin{pmatrix}...\\end{pmatrix}, etc.
4. End with a section titled "## Final Answer" containing the clearly labeled result in LaTeX.

Be accurate, concise, and pedagogical. If the question is unclear or not mathematical, ask for clarification.`;

export const solveMath = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { question: string; images?: string[] }) =>
    z
      .object({
        question: z.string().max(4000),
        images: z.array(z.string().startsWith("data:image/")).max(2).optional(),
      })
      .refine((v) => v.question.trim().length > 0 || (v.images && v.images.length > 0), {
        message: "Provide a question or at least one image.",
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) throw new Error("GOOGLE_AI_API_KEY is not configured");

    const userText =
      data.question.trim().length > 0
        ? data.question
        : "Please solve the mathematical problem shown in the attached image(s).";

    const content: Array<Record<string, unknown>> = [{ type: "text", text: userText }];
    for (const img of data.images ?? []) {
      content.push({ type: "image_url", image_url: { url: img } });
    }

    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content },
        ],
      }),
    });


    if (!res.ok) {
      const text = await res.text();
      if (res.status === 429) throw new Error("Rate limit reached — please try again in a moment.");
      if (res.status === 402) throw new Error("AI quota exceeded. Please check your Google AI Studio usage limits.");
      throw new Error(`AI error (${res.status}): ${text.slice(0, 200)}`);
    }

    const json = await res.json();
    const solution = json.choices?.[0]?.message?.content as string;
    if (!solution) throw new Error("No solution returned by AI.");

    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("math_solutions")
      .insert({ user_id: userId, question: data.question.trim() || `[Image problem] ${(data.images?.length ?? 0)} image(s)`, solution })
      .select("id,created_at")
      .single();
    if (error) throw new Error(error.message);

    // Persist uploaded images to private storage (best-effort)
    const paths: string[] = [];
    const imgs = data.images ?? [];
    for (let i = 0; i < imgs.length; i++) {
      try {
        const parsed = parseDataUrl(imgs[i]);
        if (!parsed) continue;
        const path = `${userId}/${row.id}/${i}.${parsed.ext}`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, parsed.bytes, { contentType: parsed.mime, upsert: true });
        if (!upErr) paths.push(path);
      } catch {
        // ignore individual upload failures
      }
    }
    if (paths.length) {
      await supabase.from("math_solutions").update({ image_paths: paths }).eq("id", row.id).eq("user_id", userId);
    }

    return { solution, id: row.id, created_at: row.created_at };
  });

export const listMathSolutions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("math_solutions")
      .select("id,question,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { solutions: data ?? [] };
  });

export const getMathSolution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("math_solutions")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Solution not found");

    const paths = ((row as { image_paths?: string[] }).image_paths ?? []) as string[];
    let imageUrls: string[] = [];
    if (paths.length) {
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600);
      imageUrls = (signed ?? []).map((s) => s.signedUrl).filter(Boolean) as string[];
    }

    return { solution: row, imageUrls };
  });

export const deleteMathSolution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("math_solutions")
      .select("image_paths")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    const paths = ((row as { image_paths?: string[] } | null)?.image_paths ?? []) as string[];
    if (paths.length) {
      await supabase.storage.from(BUCKET).remove(paths);
    }
    const { error } = await supabase
      .from("math_solutions")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
