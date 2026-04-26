// Cloud sync removed (BloopAI shutdown). Local SQLite replaces Electric sync.
// Re-export from the new local hook so existing imports can be updated incrementally.
import { useLocalProjects, useCreateLocalProject } from './useLocalProjects';
export type { LocalProject } from './useLocalProjects';
export { useCreateLocalProject };

// useOrganizationProjects: accepts optional organizationId for backwards compat.
// In local mode, we always fetch all projects.
export function useOrganizationProjects(_organizationId?: string | null) {
  return useLocalProjects();
}
