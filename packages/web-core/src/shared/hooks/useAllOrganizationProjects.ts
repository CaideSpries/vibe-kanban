// Cloud sync removed (BloopAI shutdown). Multi-org concept not applicable for local VK.
// Re-export useLocalProjects as both names for incremental migration compatibility.
import { useLocalProjects } from './useLocalProjects';
export type { LocalProject } from './useLocalProjects';

// useAllOrganizationProjects: accepts optional {enabled?: boolean} for backwards compat.
// In local mode, we always fetch all projects - the enabled flag is ignored.
export function useAllOrganizationProjects(_opts?: { enabled?: boolean }) {
  return useLocalProjects();
}

export { useLocalProjects };
