// Cloud sync removed (BloopAI shutdown). Local SQLite replaces Electric sync.
// Re-export from the new local hook so existing imports can be updated incrementally.
export { useLocalProjects as useOrganizationProjects, useCreateLocalProject } from './useLocalProjects';
export type { LocalProject } from './useLocalProjects';
