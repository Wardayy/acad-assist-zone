import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const MODEL = "gemini-2.5-flash";

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
  .inputValidator((d: { question: string }) =>
    z.object({ question: z.string().min(1).max(4000) }).parse(d),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) throw new Error("GOOGLE_AI_API_KEY is not configured");

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
          { role: "user", content: data.question },
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
    return { solution };
  });
