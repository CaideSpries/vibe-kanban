import { useState, useEffect } from "react";

interface Workspace {
  id: string;
  name: string;
}

export interface WorkspaceDropdownProps {
  currentWorkspaceId: string | null;
  onChange: (workspaceId: string | null) => void;
  disabled?: boolean;
}

export function WorkspaceDropdown({
  currentWorkspaceId,
  onChange,
  disabled,
}: WorkspaceDropdownProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    fetch("/api/workspaces")
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json();
      })
      .then((json) => {
        // /api/workspaces returns a plain array (Spike 001 confirmed)
        const list: Workspace[] = Array.isArray(json)
          ? json
          : (json.data ?? []);
        setWorkspaces(list);
        setStatus("ok");
      })
      .catch(() => setStatus("error"));
  }, []);

  return (
    <select
      className="h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg-secondary-default)] px-3 text-sm text-[var(--text-high)] disabled:opacity-60"
      value={currentWorkspaceId ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      disabled={disabled || status !== "ok"}
      aria-label="Linked Workspace"
    >
      {status === "loading" && <option>Loading…</option>}
      {status === "error" && <option>Could not load workspaces</option>}
      {status === "ok" && (
        <>
          <option value="">None</option>
          {workspaces.map((ws) => (
            <option key={ws.id} value={ws.id}>
              {ws.name}
            </option>
          ))}
        </>
      )}
    </select>
  );
}

export default WorkspaceDropdown;
