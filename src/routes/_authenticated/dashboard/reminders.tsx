import { createFileRoute } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { ComingSoon } from "@/components/dashboard/ComingSoon";
export const Route = createFileRoute("/_authenticated/dashboard/reminders")({
  component: () => <ComingSoon title="Reminders" description="Smart reminders for exams, quizzes, assignments and study sessions." icon={Bell} />,
});
