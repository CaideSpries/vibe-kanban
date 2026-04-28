import { createFileRoute, useParams } from "@tanstack/react-router";
import { LocalTaskKanban } from "@/pages/kanban/LocalTaskKanban";
import { projectSearchValidator } from "@vibe/web-core/project-search";

function LocalProjectRoute() {
  const { projectId } = useParams({ strict: false });
  if (!projectId) return null;
  return <LocalTaskKanban projectId={projectId} />;
}

export const Route = createFileRoute("/_app/projects/$projectId")({
  validateSearch: projectSearchValidator,
  component: LocalProjectRoute,
});
