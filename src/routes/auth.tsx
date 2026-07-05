import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import { EDUCATION_LEVELS, LANGUAGES, STUDY_GOALS, SUBJECTS } from "@/lib/study-options";

type Search = { mode?: "signup" | "login" };

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    mode: s.mode === "signup" ? "signup" : "login",
  }),
  head: () => ({
    meta: [
      { title: "Sign in to StudyBloom AI" },
      { name: "description", content: "Sign in or create your StudyBloom AI account to start studying smarter." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const isSignup = mode === "signup";

  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fullName, setFullName] = useState("");
  const [educationLevel, setEducationLevel] = useState<string>("College");
  const [language, setLanguage] = useState<string>("English");
  const [goals, setGoals] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);

  // Redirect signed-in users
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  const toggle = (arr: string[], v: string, set: (a: string[]) => void) => {
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignup) {
        if (password !== confirm) {
          toast.error("Passwords don't match");
          return;
        }
        if (!fullName.trim()) {
          toast.error("Please enter your full name");
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: {
              full_name: fullName,
              education_level: educationLevel,
              preferred_language: language,
              study_goals: goals,
              favorite_subjects: subjects,
            },
          },
        });
        if (error) throw error;
        toast.success("Welcome! Account created.");
        navigate({ to: "/dashboard", replace: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate({ to: "/dashboard", replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <aside className="hidden lg:flex relative bg-gradient-hero p-12 flex-col justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-2xl bg-gradient-primary grid place-items-center shadow-soft">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold">StudyBloom AI</span>
        </Link>
        <div>
          <h2 className="font-display text-4xl font-bold leading-tight">
            Your cozy<br />AI study<br />workspace.
          </h2>
          <p className="mt-4 text-muted-foreground max-w-sm">
            Personalized to your subjects, education level and language — so every study session feels
            made just for you.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">© StudyBloom AI</p>
      </aside>

      <main className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="h-9 w-9 rounded-2xl bg-gradient-primary grid place-items-center shadow-soft">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold">StudyBloom AI</span>
          </div>

          <h1 className="font-display text-3xl font-bold">{isSignup ? "Create your account" : "Welcome back"}</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            {isSignup ? "A few details so the AI can personalize your study." : "Sign in to continue learning."}
          </p>

          <div className="mt-6" />



          <form onSubmit={onSubmit} className="space-y-4">
            {isSignup && (
              <Field label="Full name">
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} required className="auth-input" placeholder="Ayesha Khan" />
              </Field>
            )}
            <Field label="Email">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="auth-input" placeholder="you@example.com" />
            </Field>
            <Field label="Password">
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="auth-input" placeholder="••••••••" />
            </Field>
            {isSignup && (
              <>
                <Field label="Confirm password">
                  <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} className="auth-input" placeholder="••••••••" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Education level">
                    <select value={educationLevel} onChange={(e) => setEducationLevel(e.target.value)} className="auth-input">
                      {EDUCATION_LEVELS.map((l) => <option key={l}>{l}</option>)}
                    </select>
                  </Field>
                  <Field label="Preferred language">
                    <select value={language} onChange={(e) => setLanguage(e.target.value)} className="auth-input">
                      {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Study goals">
                  <Chips options={STUDY_GOALS as readonly string[]} selected={goals} onToggle={(v) => toggle(goals, v, setGoals)} />
                </Field>
                <Field label="Favorite subjects">
                  <Chips options={SUBJECTS as readonly string[]} selected={subjects} onToggle={(v) => toggle(subjects, v, setSubjects)} />
                </Field>
              </>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-gradient-primary py-3 text-sm font-semibold text-primary-foreground shadow-soft hover:shadow-glow disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSignup ? "Create account" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isSignup ? "Already have an account? " : "New here? "}
            <Link
              to="/auth"
              search={{ mode: isSignup ? "login" : "signup" }}
              className="font-semibold text-primary hover:underline"
            >
              {isSignup ? "Sign in" : "Create an account"}
            </Link>
          </p>
        </div>
      </main>

      <style>{`
        .auth-input { width: 100%; padding: 0.65rem 0.9rem; border-radius: 0.85rem; border: 1px solid var(--border); background: var(--card); font-size: 0.9rem; outline: none; transition: box-shadow .15s, border-color .15s; }
        .auth-input:focus { border-color: var(--ring); box-shadow: 0 0 0 4px color-mix(in oklab, var(--primary) 18%, transparent); }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-foreground/80 mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

function Chips({ options, selected, onToggle }: { options: readonly string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = selected.includes(o);
        return (
          <button
            type="button"
            key={o}
            onClick={() => onToggle(o)}
            className={`text-xs px-3 py-1.5 rounded-full border transition ${
              active
                ? "bg-gradient-primary text-primary-foreground border-transparent shadow-soft"
                : "bg-card text-foreground border-border hover:bg-accent"
            }`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}
