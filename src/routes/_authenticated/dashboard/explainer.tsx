import { createFileRoute } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { ComingSoon } from "@/components/dashboard/ComingSoon";
export const Route = createFileRoute("/_authenticated/dashboard/explainer")({
  component: () => <ComingSoon title="Topic Explainer" description="Type any topic and get a step-by-step explanation tailored to your level." icon={BookOpen} />,
});
