import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { ComingSoon } from "@/components/dashboard/ComingSoon";
export const Route = createFileRoute("/_authenticated/dashboard/analytics")({
  component: () => <ComingSoon title="Study Analytics" description="Track your streaks, study time, quiz scores and productivity trends." icon={BarChart3} />,
});
