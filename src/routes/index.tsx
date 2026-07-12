import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, BookOpen, Brain, ListChecks, MessageCircle, BarChart3, FileText, Calculator, UserPlus, MousePointerClick, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StudyBloom AI — Your Personalized AI Study Companion" },
      { name: "description", content: "Summarize notes, generate quizzes, explain any topic and stay organized — all in one pastel AI workspace built for students." },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: FileText, title: "Notes Summarizer", desc: "Turn dense notes into clean revision sheets." },
  { icon: Brain, title: "Quiz Generator", desc: "MCQs, true/false and short questions from any text." },
  { icon: BookOpen, title: "Topic Explainer", desc: "Friendly explanations adapted to your level." },
  { icon: MessageCircle, title: "AI Study Chatbot", desc: "A tutor that knows your subjects and goals." },
  { icon: Calculator, title: "Math Tutor", desc: "Step-by-step solutions, typed or from a photo." },
  { icon: ListChecks, title: "Study Planner", desc: "Schedule exams, quizzes and assignments with reminders." },
  { icon: BarChart3, title: "Study Analytics", desc: "See your streaks, scores and study time." },
  
];

const steps = [
  { icon: UserPlus, title: "Sign up", desc: "Create your free account in a few seconds — no credit card needed." },
  { icon: MousePointerClick, title: "Pick a tool", desc: "Choose from summarizer, quiz generator, math tutor, chat and more." },
  { icon: Zap, title: "Get instant AI help", desc: "Get step-by-step answers, explanations and study plans right away." },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 backdrop-blur-md bg-background/60 border-b border-border/60">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-2xl bg-gradient-primary grid place-items-center shadow-soft">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight">StudyBloom <span className="text-primary">AI</span></span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link to="/auth" className="text-sm font-medium text-muted-foreground hover:text-foreground">Sign in</Link>
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="rounded-full bg-gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-soft hover:shadow-glow transition-shadow"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 pt-20 pb-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium text-primary mb-6 shadow-card">
            <Sparkles className="h-3.5 w-3.5" />
            Powered by AI
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight leading-[1.05]">
            Study smarter,{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">bloom brighter</span>.
          </h1>
          <p className="mt-6 mx-auto max-w-2xl text-lg text-muted-foreground">
            Your personalized AI study companion 
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="rounded-full bg-gradient-primary px-7 py-3 text-base font-semibold text-primary-foreground shadow-glow hover:scale-[1.02] transition-transform"
            >
              Start studying free
            </Link>
            <Link
              to="/auth"
              className="rounded-full glass px-7 py-3 text-base font-semibold text-foreground shadow-card"
            >
              I already have an account
            </Link>
          </div>

          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {features.slice(0, 4).map((f) => (
              <div key={f.title} className="glass rounded-3xl p-5 text-left shadow-card hover:shadow-glow transition-shadow">
                <div className="h-10 w-10 rounded-2xl bg-blush grid place-items-center mb-3">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="font-semibold text-sm">{f.title}</div>
                <div className="text-xs text-muted-foreground mt-1">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-12">
          How it <span className="text-primary">works</span>
        </h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {steps.map((s, i) => (
            <div key={s.title} className="relative rounded-3xl bg-card p-6 shadow-card border border-border/60 text-center">
              <div className="absolute -top-3 -left-3 h-8 w-8 rounded-full bg-gradient-primary grid place-items-center text-xs font-bold text-primary-foreground shadow-soft">
                {i + 1}
              </div>
              <div className="h-12 w-12 rounded-2xl bg-blush grid place-items-center mb-4 mx-auto">
                <s.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">{s.title}</h3>
              <p className="text-sm text-muted-foreground mt-1.5">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-12">
          Everything you need to <span className="text-primary">ace your tasks</span>
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-3xl bg-card p-6 shadow-card border border-border/60 hover:-translate-y-1 transition-transform">
              <div className="h-11 w-11 rounded-2xl bg-gradient-primary grid place-items-center mb-4 shadow-soft">
                <f.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-1.5">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/60 py-10">
        <div className="mx-auto max-w-6xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-gradient-primary grid place-items-center shadow-soft">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <div className="font-display text-sm font-bold">StudyBloom <span className="text-primary">AI</span></div>
              <div className="text-xs text-muted-foreground">Made with 💜 for students</div>
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link to="/auth" className="hover:text-foreground">Sign in</Link>
            <Link to="/auth" search={{ mode: "signup" }} className="hover:text-foreground">Get started</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
