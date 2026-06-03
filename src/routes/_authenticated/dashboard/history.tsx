import { createFileRoute } from "@tanstack/react-router";
import { History } from "lucide-react";
import { ComingSoon } from "@/components/dashboard/ComingSoon";
export const Route = createFileRoute("/_authenticated/dashboard/history")({
  component: () => <ComingSoon title="Learning History" description="All your AI chats, summaries and quizzes — searchable and reopenable." icon={History} />,
});
