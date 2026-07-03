import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProfile } from "@/lib/profile.functions";
import { FileText, Brain, BookOpen, MessageCircle, CalendarDays, ListChecks, BarChart3, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — StudyBloom AI" }] }),
  component: DashboardHome,
});

const tools = [
  { to: "/dashboard/chat", label: "AI Study Chatbot", icon: MessageCircle, desc: "Ask anything — get personalized answers." },
  { to: "/dashboard/summarize", label: "Notes Summarizer", icon: FileText, desc: "Paste notes, get exam-ready summaries." },
  { to: "/dashboard/quiz", label: "Quiz Generator", icon: Brain, desc: "Create MCQs from any topic." },
  { to: "/dashboard/explainer", label: "Topic Explainer", icon: BookOpen, desc: "Learn anything, your level." },
  { to: "/dashboard/planner", label: "Study Planner", icon: CalendarDays, desc: "Plan sessions & get reminders." },
  { to: "/dashboard/tasks", label: "Task Catalog", icon: ListChecks, desc: "Plan your study day." },
  { to: "/dashboard/analytics", label: "Analytics", icon: BarChart3, desc: "Track streaks & progress." },
] as const;

function DashboardHome() {
  const getProfileFn = useServerFn(getProfile);
  const { data } = useQuery({ queryKey: ["profile"], queryFn: () => getProfileFn() });
  const name = data?.profile?.full_name || "there";

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="rounded-3xl bg-gradient-hero p-8 md:p-10 shadow-card relative overflow-hidden">
        <Sparkles className="absolute right-6 top-6 h-20 w-20 text-primary/20" />
        <p className="text-sm font-medium text-primary">Welcome back ✨</p>
        <h1 className="mt-2 font-display text-3xl md:text-4xl font-bold">
          Hi {name.split(" ")[0]}, ready to bloom today?
        </h1>
        <p className="mt-2 text-muted-foreground max-w-xl">
          Pick a tool below or jump straight into a chat with your AI study tutor.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/dashboard/chat" className="rounded-full bg-gradient-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft">
            Start a chat
          </Link>
          <Link to="/dashboard/summarize" className="rounded-full glass px-6 py-2.5 text-sm font-semibold shadow-card">
            Summarize notes
          </Link>
        </div>
      </div>

      <div>
        <h2 className="font-display text-xl font-bold mb-4">Your study tools</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              className="group rounded-3xl bg-card p-5 border border-border/60 shadow-card hover:-translate-y-1 hover:shadow-glow transition-all"
            >
              <div className="h-11 w-11 rounded-2xl bg-gradient-primary grid place-items-center mb-3 shadow-soft group-hover:scale-110 transition-transform">
                <t.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="font-semibold">{t.label}</div>
              <div className="text-sm text-muted-foreground mt-1">{t.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
