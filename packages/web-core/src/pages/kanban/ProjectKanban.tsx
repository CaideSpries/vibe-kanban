import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Group, Layout, Panel, Separator } from 'react-resizable-panels';
import { useProjectContext } from '@/shared/hooks/useProjectContext';
import { useActions } from '@/shared/hooks/useActions';
import { usePageTitle } from '@/shared/hooks/usePageTitle';
import { KanbanContainer } from '@/features/kanban/ui/KanbanContainer';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { ProjectRightSidebarContainer } from './ProjectRightSidebarContainer';
import {
  PERSIST_KEYS,
  usePaneSize,
} from '@/shared/stores/useUiPreferencesStore';
import { useLocalProjects, useCreateLocalProject } from '@/shared/hooks/useLocalProjects';
import { OrgContext } from '@/shared/hooks/useOrgContext';
import { ProjectContext } from '@/shared/hooks/useProjectContext';
import { useCurrentKanbanRouteState } from '@/shared/hooks/useCurrentKanbanRouteState';
import {
  buildKanbanIssueComposerKey,
  closeKanbanIssueComposer,
} from '@/shared/stores/useKanbanIssueComposerStore';
import { useAppNavigation } from '@/shared/hooks/useAppNavigation';
import { Button } from '@vibe/ui/components/Button';
import { Input } from '@vibe/ui/components/Input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@vibe/ui/components/Dialog';

/**
 * Component that registers project mutations with ActionsContext.
 * Must be rendered inside both ActionsProvider and ProjectProvider.
 */
function ProjectMutationsRegistration({ children }: { children: ReactNode }) {
  const { registerProjectMutations } = useActions();
  const { removeIssue, insertIssue, getIssue, getAssigneesForIssue, issues } =
    useProjectContext();

  // Use ref to always access latest issues (avoid stale closure)
  const issuesRef = useRef(issues);
  useEffect(() => {
    issuesRef.current = issues;
  }, [issues]);

  useEffect(() => {
    registerProjectMutations({
      removeIssue: (id) => {
        removeIssue(id);
      },
      duplicateIssue: (issueId) => {
        const issue = getIssue(issueId);
        if (!issue) return;

        // Use ref to get current issues (not stale closure)
        const currentIssues = issuesRef.current;
        const statusIssues = currentIssues.filter(
          (i) => i.status_id === issue.status_id
        );
        const minSortOrder =
          statusIssues.length > 0
            ? Math.min(...statusIssues.map((i) => i.sort_order))
            : 0;

        insertIssue({
          project_id: issue.project_id,
          status_id: issue.status_id,
          title: `${issue.title} (Copy)`,
          description: issue.description,
          priority: issue.priority,
          sort_order: minSortOrder - 1,
          start_date: issue.start_date,
          target_date: issue.target_date,
          completed_at: null,
          parent_issue_id: issue.parent_issue_id,
          parent_issue_sort_order: issue.parent_issue_sort_order,
          extension_metadata: issue.extension_metadata,
        });
      },
      getIssue,
      getAssigneesForIssue,
    });

    return () => {
      registerProjectMutations(null);
    };
  }, [
    registerProjectMutations,
    removeIssue,
    insertIssue,
    getIssue,
    getAssigneesForIssue,
  ]);

  return <>{children}</>;
}

function ProjectKanbanBoard() {
  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="min-h-0 flex-1">
        <KanbanContainer />
      </div>
    </div>
  );
}

function ProjectKanbanLayout({ projectName }: { projectName: string }) {
  const { issueId, isPanelOpen } = useCurrentKanbanRouteState();
  const isMobile = useIsMobile();
  const { getIssue } = useProjectContext();
  const issue = issueId ? getIssue(issueId) : undefined;
  usePageTitle(issue?.title, projectName);
  const [kanbanLeftPanelSize, setKanbanLeftPanelSize] = usePaneSize(
    PERSIST_KEYS.kanbanLeftPanel,
    75
  );

  const isRightPanelOpen = isPanelOpen;

  if (isMobile) {
    return isRightPanelOpen ? (
      <div className="h-full w-full overflow-hidden bg-secondary">
        <ProjectRightSidebarContainer />
      </div>
    ) : (
      <div className="h-full w-full overflow-hidden bg-primary">
        <ProjectKanbanBoard />
      </div>
    );
  }

  const kanbanDefaultLayout: Layout =
    typeof kanbanLeftPanelSize === 'number'
      ? {
          'kanban-left': kanbanLeftPanelSize,
          'kanban-right': 100 - kanbanLeftPanelSize,
        }
      : { 'kanban-left': 75, 'kanban-right': 25 };

  const onKanbanLayoutChange = (layout: Layout) => {
    if (isRightPanelOpen) {
      setKanbanLeftPanelSize(layout['kanban-left']);
    }
  };

  return (
    <Group
      orientation="horizontal"
      className="flex-1 min-w-0 h-full"
      defaultLayout={kanbanDefaultLayout}
      onLayoutChange={onKanbanLayoutChange}
    >
      <Panel
        id="kanban-left"
        minSize="20%"
        className="min-w-0 h-full overflow-hidden bg-primary"
      >
        <ProjectKanbanBoard />
      </Panel>

      {isRightPanelOpen && (
        <Separator
          id="kanban-separator"
          className="w-1 bg-panel outline-none hover:bg-brand/50 transition-colors cursor-col-resize"
        />
      )}

      {isRightPanelOpen && (
        <Panel
          id="kanban-right"
          minSize="400px"
          maxSize="800px"
          className="min-w-0 h-full overflow-hidden bg-secondary"
        >
          <ProjectRightSidebarContainer />
        </Panel>
      )}
    </Group>
  );
}

/**
 * Inner component that renders the Kanban board once we have the org context
 */
/**
 * Stub OrgContext for local mode — supplies local SQLite projects to all
 * consumers (KanbanContainer, issue panels, etc.) without Electric sync.
 */
function LocalOrgProvider({ children }: { children: React.ReactNode }) {
  const { data: localProjects = [], isLoading } = useLocalProjects();

  const projects = useMemo(
    () =>
      localProjects.map((p) => ({
        id: p.id,
        organization_id: '',
        name: p.name,
        color: '',
        sort_order: 0,
        created_at: p.created_at ?? '',
        updated_at: p.created_at ?? '',
      })),
    [localProjects]
  );

  const projectsById = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects]
  );

  const value = useMemo(
    () => ({
      organizationId: '',
      projects,
      isLoading,
      error: null,
      retry: () => {},
      insertProject: () => ({ data: { id: '', organization_id: '', name: '', color: '', sort_order: 0, created_at: '', updated_at: '' }, persisted: Promise.resolve({ id: '', organization_id: '', name: '', color: '', sort_order: 0, created_at: '', updated_at: '' }) }),
      updateProject: () => ({ persisted: Promise.resolve(undefined as any) }),
      removeProject: () => ({ persisted: Promise.resolve(undefined as any) }),
      getProject: (id: string) => projectsById.get(id),
      projectsById,
      membersWithProfilesById: new Map(),
    }),
    [projects, isLoading, projectsById]
  );

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

/**
 * Stub ProjectContext for local mode — supplies default kanban statuses
 * (Todo / In Progress / Done) so the board renders without Electric sync.
 */
function LocalProjectProvider({ projectId, children }: { projectId: string; children: React.ReactNode }) {
  const noop = () => ({ persisted: Promise.resolve(undefined as any) });
  const noopInsert = <T,>(stub: T) => ({ data: stub, persisted: Promise.resolve(stub) });

  const statuses = useMemo(() => [
    { id: `${projectId}-todo`,        project_id: projectId, name: 'Todo',        color: '220 70% 50%', sort_order: 0, hidden: false, created_at: '' },
    { id: `${projectId}-in-progress`, project_id: projectId, name: 'In Progress', color: '40 90% 50%',  sort_order: 1, hidden: false, created_at: '' },
    { id: `${projectId}-done`,        project_id: projectId, name: 'Done',        color: '140 60% 40%', sort_order: 2, hidden: false, created_at: '' },
  ], [projectId]);

  const statusesById = useMemo(() => new Map(statuses.map((s) => [s.id, s])), [statuses]);
  const issuesById = useMemo(() => new Map<string, any>(), []);

  const value = useMemo(() => ({
    projectId,
    issues: [],
    statuses,
    tags: [],
    issueAssignees: [],
    issueFollowers: [],
    issueTags: [],
    issueRelationships: [],
    pullRequests: [],
    pullRequestIssues: [],
    workspaces: [],
    isLoading: false,
    error: null,
    retry: () => {},
    insertIssue: (data: any) => noopInsert({ id: crypto.randomUUID(), ...data }),
    updateIssue: noop,
    removeIssue: noop,
    insertStatus: (data: any) => noopInsert({ id: '', ...data }),
    updateStatus: noop,
    removeStatus: noop,
    insertTag: (data: any) => noopInsert({ id: '', ...data }),
    updateTag: noop,
    removeTag: noop,
    insertIssueAssignee: (data: any) => noopInsert({ id: '', ...data }),
    removeIssueAssignee: noop,
    insertIssueFollower: (data: any) => noopInsert({ id: '', ...data }),
    removeIssueFollower: noop,
    insertIssueTag: (data: any) => noopInsert({ id: '', ...data }),
    removeIssueTag: noop,
    insertIssueRelationship: (data: any) => noopInsert({ id: '', ...data }),
    removeIssueRelationship: noop,
    insertPullRequestIssue: (data: any) => noopInsert({ id: '', ...data }),
    removePullRequestIssue: noop,
    getIssue: (_id: string) => undefined,
    getIssuesForStatus: (_id: string) => [],
    getAssigneesForIssue: (_id: string) => [],
    getFollowersForIssue: (_id: string) => [],
    getTagsForIssue: (_id: string) => [],
    getTagObjectsForIssue: (_id: string) => [],
    getRelationshipsForIssue: (_id: string) => [],
    getStatus: (id: string) => statusesById.get(id),
    getTag: (_id: string) => undefined,
    getPullRequestsForIssue: (_id: string) => [],
    getWorkspacesForIssue: (_id: string) => [],
    issuesById,
    statusesById,
    tagsById: new Map(),
  }), [projectId, statuses, statusesById, issuesById]);

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

function ProjectKanbanInner({ projectId, projectName }: { projectId: string; projectName: string }) {
  return (
    <LocalProjectProvider projectId={projectId}>
      <ProjectMutationsRegistration>
        <ProjectKanbanLayout projectName={projectName} />
      </ProjectMutationsRegistration>
    </LocalProjectProvider>
  );
}

/**
 * Hook to find a local project by ID from SQLite via /api/projects.
 * No auth guard, no organizationId param — unconditional fetch.
 */
function useFindProjectById(projectId: string | undefined) {
  const { data: projects = [], isLoading, isError } = useLocalProjects();

  const project = useMemo(() => {
    if (!projectId) return undefined;
    return projects.find((p) => p.id === projectId);
  }, [projectId, projects]);

  return {
    project,
    isLoading,
    isError,
  };
}

/**
 * Create Project dialog (UI-SPEC §Create Project Dialog)
 */
function CreateProjectDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createMutation = useCreateLocalProject();
  const [projectName, setProjectName] = useState('');
  const [defaultAgentWorkingDir, setDefaultAgentWorkingDir] = useState('');
  const [nameError, setNameError] = useState('');
  const [workingDirError, setWorkingDirError] = useState('');

  function handleCreate() {
    let hasError = false;
    if (!projectName.trim()) {
      setNameError('Project name is required.');
      hasError = true;
    } else {
      setNameError('');
    }
    if (!defaultAgentWorkingDir.trim()) {
      setWorkingDirError('Working directory is required.');
      hasError = true;
    } else {
      setWorkingDirError('');
    }
    if (hasError) return;

    createMutation.mutate(
      {
        name: projectName.trim(),
        default_agent_working_dir: defaultAgentWorkingDir.trim(),
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setProjectName('');
          setDefaultAgentWorkingDir('');
        },
      }
    );
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setProjectName('');
      setDefaultAgentWorkingDir('');
      setNameError('');
      setWorkingDirError('');
    }
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
        </DialogHeader>
        <div>
          <label htmlFor="project-name-input">Name</label>
          <Input
            id="project-name-input"
            placeholder="Project name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
            aria-describedby={nameError ? 'project-name-error' : undefined}
          />
          {nameError && (
            <p id="project-name-error" style={{ color: 'var(--error)' }}>
              {nameError}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="project-working-dir-input">Working directory</label>
          <Input
            id="project-working-dir-input"
            placeholder="e.g. bisonet"
            value={defaultAgentWorkingDir}
            onChange={(e) => setDefaultAgentWorkingDir(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            aria-describedby={workingDirError ? 'project-working-dir-error' : undefined}
          />
          {workingDirError && (
            <p id="project-working-dir-error" style={{ color: 'var(--error)' }}>
              {workingDirError}
            </p>
          )}
          {createMutation.isError && (
            <p style={{ color: 'var(--error)' }}>
              Could not create project. Try again.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>
            Discard
          </Button>
          <Button
            onClick={handleCreate}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? '…' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * ProjectKanban page - displays the Kanban board for a specific project
 *
 * URL patterns:
 * - /projects/:projectId - Kanban board with no issue selected
 * - /projects/:projectId/issues/:issueId - Kanban with issue panel open
 * - /projects/:projectId/issues/:issueId/workspaces/:workspaceId - Kanban with workspace session panel open
 * - /projects/:projectId/issues/:issueId/workspaces/create/:draftId - Kanban with workspace create panel
 *
 * Note: issue creation is composer-store state on top of /projects/:projectId.
 *
 * Note: This component is rendered inside SharedAppLayout which provides
 * NavbarContainer, AppBar, and SyncErrorProvider.
 */
export function ProjectKanban() {
  const { projectId, hostId, hasInvalidWorkspaceCreateDraftId } =
    useCurrentKanbanRouteState();
  const appNavigation = useAppNavigation();
  const issueComposerKey = useMemo(() => {
    if (!projectId) {
      return null;
    }
    return buildKanbanIssueComposerKey(hostId, projectId);
  }, [hostId, projectId]);
  const previousIssueComposerKeyRef = useRef<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useEffect(() => {
    const previousKey = previousIssueComposerKeyRef.current;
    if (previousKey && previousKey !== issueComposerKey) {
      closeKanbanIssueComposer(previousKey);
    }

    previousIssueComposerKeyRef.current = issueComposerKey;
  }, [issueComposerKey]);

  // Redirect invalid workspace-create draft URLs back to the closed project view.
  useEffect(() => {
    if (!projectId) return;

    if (hasInvalidWorkspaceCreateDraftId) {
      appNavigation.goToProject(projectId, {
        replace: true,
      });
    }
  }, [projectId, hasInvalidWorkspaceCreateDraftId, appNavigation]);

  // Find the project using the local SQLite hook — no auth guard, no organizationId required
  const { project, isLoading, isError } = useFindProjectById(
    projectId ?? undefined
  );

  // Show loading while fetching local projects
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <p aria-live="polite" className="text-low">
          Loading projects…
        </p>
      </div>
    );
  }

  // Fetch error — server may not be running
  if (isError) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <p className="text-low">
          Could not load projects. Check that the VK server is running and try again.
        </p>
      </div>
    );
  }

  if (!projectId) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full gap-double">
        <p className="text-high font-semibold">No projects yet</p>
        <p className="text-low">
          Create a project to start organizing your work.
        </p>
        <Button onClick={() => setIsCreateOpen(true)}>New Project</Button>
        <CreateProjectDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      </div>
    );
  }

  // Project not found by ID — show empty state with create option
  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full gap-double">
        <p className="text-high font-semibold">No projects yet</p>
        <p className="text-low">
          Create a project to start organizing your work.
        </p>
        <Button onClick={() => setIsCreateOpen(true)}>New Project</Button>
        <CreateProjectDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      </div>
    );
  }

  return (
    <>
      <LocalOrgProvider>
        <ProjectKanbanInner projectId={projectId} projectName={project.name} />
      </LocalOrgProvider>
      <Button
        onClick={() => setIsCreateOpen(true)}
        style={{ position: 'fixed', bottom: '1rem', right: '1rem', zIndex: 50 }}
      >
        New Project
      </Button>
      <CreateProjectDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </>
  );
}
