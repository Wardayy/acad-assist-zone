import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function dayKey(iso: string) {
  return new Date(iso).toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Overview: study streak, this-week vs last-week activity, activity breakdown,
 * task completion rate. One call, one round trip — keeps the page fast.
 */
export const getAnalyticsOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const since = daysAgo(60).toISOString(); // enough history for a meaningful streak
    const weekStart = daysAgo(7).toISOString();
    const twoWeeksStart = daysAgo(14).toISOString();

    const tables = [
      "quiz_attempts",
      "math_solutions",
      "chat_conversations",
      "notes_summaries",
      "learning_explanations",
    ] as const;

    const results = await Promise.all(
      tables.map((t) =>
        (supabase as any)
          .from(t)
          .select("created_at")
          .eq("user_id", userId)
          .gte("created_at", since)
      )
    );

    for (const r of results) {
      if (r.error) throw new Error(r.error.message);
    }

    const allDates: string[] = [];
    const byFeature: Record<string, number> = {
      "Quiz Generator": 0,
      "Math Tutor": 0,
      "AI Chat": 0,
      "Notes Summarizer": 0,
      "AI Learning Mode": 0,
    };
    const labels = ["Quiz Generator", "Math Tutor", "AI Chat", "Notes Summarizer", "AI Learning Mode"];

    let thisWeekCount = 0;
    let lastWeekCount = 0;

    results.forEach((r, i) => {
      const rows = (r.data ?? []) as { created_at: string }[];
      byFeature[labels[i]] = rows.length;
      for (const row of rows) {
        allDates.push(dayKey(row.created_at));
        if (row.created_at >= weekStart) thisWeekCount++;
        else if (row.created_at >= twoWeeksStart) lastWeekCount++;
      }
    });

    // Study streak: walk back from today, counting consecutive active days.
    const activeDays = new Set(allDates);
    let streak = 0;
    for (let i = 0; ; i++) {
      const key = dayKey(daysAgo(i).toISOString());
      if (activeDays.has(key)) streak++;
      else break;
    }

    const { data: tasks, error: taskErr } = await supabase
      .from("study_tasks")
      .select("completed")
      .eq("user_id", userId);
    if (taskErr) throw new Error(taskErr.message);

    const totalTasks = tasks?.length ?? 0;
    const completedTasks = tasks?.filter((t: any) => t.completed).length ?? 0;

    return {
      streak,
      thisWeekCount,
      lastWeekCount,
      activityBreakdown: labels.map((label) => ({ name: label, value: byFeature[label] })),
      taskCompletion: {
        total: totalTasks,
        completed: completedTasks,
        rate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      },
    };
  });

/**
 * Quiz score trend — most recent attempts first from the DB, returned oldest-first
 * so the chart reads left-to-right chronologically.
 */
export const getQuizTrend = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data, error } = await supabase
      .from("quiz_attempts")
      .select("score, total, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);

    const rows = (data ?? []).reverse();
    return {
      trend: rows.map((r: any, i: number) => ({
        attempt: i + 1,
        percentage: r.total > 0 ? Math.round((r.score / r.total) * 100) : 0,
        date: dayKey(r.created_at),
      })),
    };
  });
