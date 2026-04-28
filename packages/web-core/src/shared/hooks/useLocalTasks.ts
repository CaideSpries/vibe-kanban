import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Task type returned by GET /api/projects/:id/tasks
// API returns "title" for the task name field (matches DB column name)
export type DerivedStatus = "pending" | "running" | "done" | "failed";

export interface LocalTask {
    id: string;
    project_id: string;
    title: string;
    description: string | null;
    workspace_id: string | null;
    derived_status: DerivedStatus;
    created_at: string;
    updated_at: string;
}

// --- Fetch functions ---

async function fetchTasks(projectId: string): Promise<LocalTask[]> {
    const res = await fetch(`/api/projects/${projectId}/tasks`);
    if (!res.ok) throw new Error(`Failed to fetch tasks: ${res.status}`);
    const json = await res.json();
    return json.data ?? json;
}

async function postTask(
    projectId: string,
    data: { title: string; description?: string }
): Promise<LocalTask> {
    const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Failed to create task: ${res.status}`);
    const json = await res.json();
    return json.data ?? json;
}

async function patchTask(
    taskId: string,
    workspaceId: string | null
): Promise<LocalTask> {
    const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace_id: workspaceId }),
    });
    if (!res.ok) throw new Error(`Failed to patch task: ${res.status}`);
    const json = await res.json();
    return json.data ?? json;
}

// --- Hooks ---

// D-05: poll 5s when any task running, 30s otherwise
// refetchIntervalInBackground defaults to false (pauses when tab hidden) — react-query default
export function useLocalTasks(projectId: string) {
    return useQuery({
        queryKey: ["local-tasks", projectId],
        queryFn: () => fetchTasks(projectId),
        enabled: !!projectId,
        refetchInterval: (query) => {
            const tasks = query.state.data;
            if (!tasks) return 30_000;
            const anyRunning = tasks.some(
                (t) => t.derived_status === "running"
            );
            return anyRunning ? 5_000 : 30_000;
        },
    });
}

// Mutation: create a task in a project
export function useCreateLocalTask(projectId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { title: string; description?: string }) =>
            postTask(projectId, data),
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: ["local-tasks", projectId],
            }),
    });
}

// Mutation: set or clear workspace_id for a task (D-09)
export function usePatchTaskWorkspace(projectId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            taskId,
            workspaceId,
        }: {
            taskId: string;
            workspaceId: string | null;
        }) => patchTask(taskId, workspaceId),
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: ["local-tasks", projectId],
            }),
    });
}
