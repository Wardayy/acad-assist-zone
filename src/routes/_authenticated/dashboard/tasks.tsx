import { createFileRoute } from "@tanstack/react-router";
import { ListChecks } from "lucide-react";
import { ComingSoon } from "@/components/dashboard/ComingSoon";
export const Route = createFileRoute("/_authenticated/dashboard/tasks")({
  component: () => <ComingSoon title="Task Catalog" description="Your daily study journal, to-do list and weekly goals — all in one place." icon={ListChecks} />,
});
