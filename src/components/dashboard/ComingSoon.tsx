import { Sparkles, type LucideIcon } from "lucide-react";

export function ComingSoon({
  title, description, icon: Icon = Sparkles,
}: { title: string; description: string; icon?: LucideIcon }) {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="rounded-3xl bg-gradient-hero p-10 text-center shadow-card">
        <div className="h-16 w-16 mx-auto rounded-3xl bg-gradient-primary grid place-items-center shadow-glow">
          <Icon className="h-7 w-7 text-primary-foreground" />
        </div>
        <h1 className="mt-5 font-display text-3xl font-bold">{title}</h1>
        <p className="mt-2 text-muted-foreground max-w-md mx-auto">{description}</p>
        <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary rounded-full glass px-4 py-1.5 shadow-card">
          ✨ Coming soon — under construction
        </div>
      </div>
    </div>
  );
}
