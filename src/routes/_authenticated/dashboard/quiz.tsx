import { createFileRoute } from "@tanstack/react-router";
import { Brain } from "lucide-react";
import { ComingSoon } from "@/components/dashboard/ComingSoon";
export const Route = createFileRoute("/_authenticated/dashboard/quiz")({
  component: () => <ComingSoon title="Quiz Generator" description="Generate MCQs, true/false and short questions from any topic — with auto-grading." icon={Brain} />,
});
