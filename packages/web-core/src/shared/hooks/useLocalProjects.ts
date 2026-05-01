import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface LocalProject {
    id: string;
    name: string;
    default_agent_working_dir?: string | null;
    created_at: string;
    updated_at: string;
}

export interface CreateProjectInput {
    name: string;
    default_agent_working_dir: string;
}

async function fetchProjects(): Promise<LocalProject[]> {
    const res = await fetch('/api/projects');
    if (!res.ok) throw new Error(`Failed to fetch projects: ${res.status}`);
    const json = await res.json();
    return json.data ?? json;
}

async function postProject(input: CreateProjectInput): Promise<LocalProject> {
    const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(`Failed to create project: ${res.status}`);
    const json = await res.json();
    return json.data ?? json;
}

// VKP-01: List all local projects from SQLite — NO auth guard, NO organizationId param
export function useLocalProjects() {
    return useQuery({
        queryKey: ['local-projects'],
        queryFn: fetchProjects,
    });
}

// VKP-AUTO-WD-UI: Create a local project with name + default_agent_working_dir, invalidate list cache on success
export function useCreateLocalProject() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (input: CreateProjectInput) => postProject(input),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['local-projects'] }),
    });
}
