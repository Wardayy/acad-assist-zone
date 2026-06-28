import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  FileText, Brain, Lightbulb, MessageCircle, Bell, ListChecks, History, BarChart3,
  Settings, Sparkles, LogOut, User, Menu, X, CalendarDays,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { dailyQuote } from "@/lib/study-options";

const nav = [
  { to: "/dashboard", label: "Overview", icon: Sparkles },
  { to: "/dashboard/chat", label: "AI Study Chatbot", icon: MessageCircle },
  { to: "/dashboard/summarize", label: "Notes Summarizer", icon: FileText },
  { to: "/dashboard/quiz", label: "Quiz Generator", icon: Brain },
  { to: "/dashboard/explainer", label: "AI Learning Mode", icon: Lightbulb },
  { to: "/dashboard/planner", label: "Study Planner", icon: CalendarDays },
  { to: "/dashboard/reminders", label: "Reminders", icon: Bell },
  { to: "/dashboard/tasks", label: "Task Catalog", icon: ListChecks },
  { to: "/dashboard/history", label: "Learning History", icon: History },
  { to: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/dashboard/settings", label: "Settings", icon: Settings },
] as const;

export function DashboardLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="min-h-screen">
      {/* Top nav */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-background/70 border-b border-border/60">
        <div className="flex items-center justify-between px-4 lg:px-6 h-16 gap-4">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-xl hover:bg-accent"
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-2xl bg-gradient-primary grid place-items-center shadow-soft">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-display font-bold tracking-tight hidden sm:block">StudyBloom <span className="text-primary">AI</span></span>
            </Link>
          </div>

          <div className="flex-1 max-w-xl mx-auto hidden md:block">
            <div className="glass rounded-full px-5 py-2 text-sm text-center text-muted-foreground italic shadow-card">
              ✨ {dailyQuote()}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/dashboard/settings"
              className="h-9 w-9 grid place-items-center rounded-full bg-card border border-border hover:bg-accent"
              aria-label="Profile"
            >
              <User className="h-4 w-4" />
            </Link>
            <button
              onClick={signOut}
              className="h-9 w-9 grid place-items-center rounded-full bg-card border border-border hover:bg-accent"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`fixed lg:sticky top-16 left-0 z-20 h-[calc(100vh-4rem)] w-64 border-r border-border/60 bg-sidebar/90 backdrop-blur-md transition-transform lg:translate-x-0 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <nav className="p-3 space-y-1 overflow-y-auto h-full">
            {nav.map((n) => {
              const active = path === n.to || (n.to !== "/dashboard" && path.startsWith(n.to));
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all ${
                    active
                      ? "bg-gradient-primary text-primary-foreground shadow-soft"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  }`}
                >
                  <n.icon className="h-4 w-4 shrink-0" />
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {open && (
          <div
            className="fixed inset-0 top-16 bg-foreground/20 z-10 lg:hidden"
            onClick={() => setOpen(false)}
          />
        )}

        <main className="flex-1 min-w-0 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
