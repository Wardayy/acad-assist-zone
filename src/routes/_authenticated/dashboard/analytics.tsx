import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BarChart3, Flame, TrendingUp, ListChecks, Loader2,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell,
} from "recharts";
import { getAnalyticsOverview, getQuizTrend } from "@/lib/analytics.functions";

export const Route = createFileRoute("/_authenticated/dashboard/analytics")({
  component: Analytics,
});

const PIE_COLORS = [
  "var(--primary)",
  "var(--primary-glow)",
  "var(--lavender)",
  "var(--peach)",
  "var(--blush)",
];

function StatCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-3xl bg-card p-5 shadow-card border border-border/60">
      <div className="h-10 w-10 rounded-2xl bg-gradient-primary grid place-items-center mb-3 shadow-soft">
        <Icon className="h-5 w-5 text-primary-foreground" />
      </div>
      <div className="text-2xl font-bold font-display">{value}</div>
      <div className="text-sm text-muted-foreground mt-0.5">{label}</div>
      {sub && <div className="text-xs text-muted-foreground/80 mt-1">{sub}</div>}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="h-56 grid place-items-center text-sm text-muted-foreground text-center px-6">
      {message}
    </div>
  );
}

function Analytics() {
  const overviewFn = useServerFn(getAnalyticsOverview);
  const trendFn = useServerFn(getQuizTrend);

  const overview = useQuery({ queryKey: ["analytics-overview"], queryFn: () => overviewFn() });
  const trend = useQuery({ queryKey: ["analytics-quiz-trend"], queryFn: () => trendFn() });

  const loading = overview.isLoading || trend.isLoading;

  if (loading) {
    return (
      <div className="p-6 lg:p-10 grid place-items-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const o = overview.data;
  const t = trend.data?.trend ?? [];
  const hasActivity = o && (o.thisWeekCount + o.lastWeekCount > 0);
  const hasBreakdown = o && o.activityBreakdown.some((f) => f.value > 0);
  const weekDelta = o ? o.thisWeekCount - o.lastWeekCount : 0;

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" /> Study Analytics
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your streaks, scores and study activity, all in one place.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Flame}
          label="Day streak"
          value={String(o?.streak ?? 0)}
          sub={o && o.streak > 0 ? "Keep it going!" : "Start today"}
        />
        <StatCard
          icon={TrendingUp}
          label="This week's activity"
          value={String(o?.thisWeekCount ?? 0)}
          sub={
            o
              ? weekDelta === 0
                ? "Same as last week"
                : `${weekDelta > 0 ? "+" : ""}${weekDelta} vs last week`
              : undefined
          }
        />
        <StatCard
          icon={ListChecks}
          label="Tasks completed"
          value={`${o?.taskCompletion.completed ?? 0}/${o?.taskCompletion.total ?? 0}`}
          sub={o ? `${o.taskCompletion.rate}% completion rate` : undefined}
        />
        <StatCard
          icon={BarChart3}
          label="Quiz attempts"
          value={String(t.length)}
          sub={t.length > 0 ? `Latest: ${t[t.length - 1].percentage}%` : undefined}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-card p-6 shadow-card border border-border/60">
          <h2 className="font-semibold mb-4">Quiz score trend</h2>
          {t.length === 0 ? (
            <EmptyState message="Take a quiz to start tracking your score trend." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={t} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="attempt" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                <Tooltip
                  formatter={(v: number) => [`${v}%`, "Score"]}
                  labelFormatter={(l) => `Attempt ${l}`}
                  contentStyle={{ borderRadius: 12, border: "1px solid var(--border)" }}
                />
                <Line type="monotone" dataKey="percentage" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-3xl bg-card p-6 shadow-card border border-border/60">
          <h2 className="font-semibold mb-4">Activity by feature</h2>
          {!hasBreakdown ? (
            <EmptyState message="Use a few tools this week to see your activity breakdown here." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={o!.activityBreakdown.filter((f) => f.value > 0)}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {o!.activityBreakdown
                    .filter((f) => f.value > 0)
                    .map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
          {hasBreakdown && (
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 justify-center">
              {o!.activityBreakdown
                .filter((f) => f.value > 0)
                .map((f, i) => (
                  <div key={f.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="h-2 w-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    {f.name} ({f.value})
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {!hasActivity && (
        <div className="rounded-3xl bg-blush/60 p-6 text-center text-sm text-muted-foreground border border-border/60">
          No activity yet — use any of the study tools to start building your analytics.
        </div>
      )}
    </div>
  );
}
