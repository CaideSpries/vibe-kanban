import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface LocalProject {
    id: string;
    name: string;
    default_agent_working_dir?: string | null;
    created_at: string;
    updated_at: string;
}

async function fetchProjects(): Promise<LocalProject[]> {
    const res = await fetch('/api/projects');
    if (!res.ok) throw new Error(`Failed to fetch projects: ${res.status}`);
    const json = await res.json();
    return json.data ?? json;
}

async function postProject(name: string): Promise<LocalProject> {
    const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
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

// VKP-02: Create a local project and invalidate the list cache on success
export function useCreateLocalProject() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (name: string) => postProject(name),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['local-projects'] }),
    });
}
