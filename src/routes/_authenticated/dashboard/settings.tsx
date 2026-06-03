import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProfile } from "@/lib/profile.functions";
import { User, Mail, GraduationCap, Languages, Target, BookOpen } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  head: () => ({ meta: [{ title: "Settings — StudyBloom AI" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const fn = useServerFn(getProfile);
  const { data, isLoading } = useQuery({ queryKey: ["profile"], queryFn: () => fn() });
  const p = data?.profile;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Your profile</h1>
        <p className="text-muted-foreground mt-1">This information personalizes your AI study experience.</p>
      </header>

      {isLoading ? (
        <div className="rounded-3xl bg-card border border-border/60 p-8 shadow-card animate-pulse h-64" />
      ) : (
        <div className="rounded-3xl bg-card border border-border/60 p-6 md:p-8 shadow-card space-y-5">
          <Row icon={User} label="Full name" value={p?.full_name || "—"} />
          <Row icon={Mail} label="Email" value={p?.email || "—"} />
          <Row icon={GraduationCap} label="Education level" value={p?.education_level || "—"} />
          <Row icon={Languages} label="Preferred language" value={p?.preferred_language || "—"} />
          <Row icon={Target} label="Study goals" tags={p?.study_goals ?? []} />
          <Row icon={BookOpen} label="Favorite subjects" tags={p?.favorite_subjects ?? []} />
        </div>
      )}
    </div>
  );
}

function Row({
  icon: Icon, label, value, tags,
}: { icon: typeof User; label: string; value?: string; tags?: string[] }) {
  return (
    <div className="flex items-start gap-4">
      <div className="h-10 w-10 rounded-2xl bg-blush grid place-items-center shrink-0">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</div>
        {tags ? (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {tags.length === 0 ? <span className="text-sm text-muted-foreground">—</span> :
              tags.map((t) => (
                <span key={t} className="text-xs px-3 py-1 rounded-full bg-gradient-primary text-primary-foreground shadow-soft">{t}</span>
              ))}
          </div>
        ) : (
          <div className="mt-0.5 text-sm font-medium">{value}</div>
        )}
      </div>
    </div>
  );
}
