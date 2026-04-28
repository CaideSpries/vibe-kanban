import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  useLocalTasks,
  useCreateLocalTask,
  usePatchTaskWorkspace,
} from "@/shared/hooks/useLocalTasks";
import type { LocalTask, DerivedStatus } from "@/shared/hooks/useLocalTasks";
import { Button } from "@vibe/ui/components/Button";
import { Input } from "@vibe/ui/components/Input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@vibe/ui/components/Dialog";
import { WorkspaceDropdown } from "@/features/tasks/ui/WorkspaceDropdown";

// ─── Status Badge ────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<DerivedStatus, string> = {
  pending: "bg-[#6B7280] text-white",
  running: "bg-[#F59E0B] text-white",
  done: "bg-[#10B981] text-white",
  failed: "bg-[#EF4444] text-white",
};

function StatusBadge({
  status,
  ariaLive,
}: {
  status: DerivedStatus;
  ariaLive?: "polite" | "off";
}) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-normal ${STATUS_STYLES[status]}`}
      aria-label={label}
      aria-live={ariaLive}
    >
      <span className="inline-block h-1 w-1 rounded-full bg-white opacity-80" />
      {label}
    </span>
  );
}

// ─── Task Card ───────────────────────────────────────────────────────────────

function TaskCard({
  task,
  selected,
  onClick,
}: {
  task: LocalTask;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`w-full rounded border border-[var(--border)] px-4 py-3 text-left transition-colors ${
        selected
          ? "bg-[var(--bg-secondary-default)] ring-1 ring-[var(--brand)]"
          : "bg-[var(--bg-panel-default)] hover:bg-[var(--bg-secondary-default)]"
      }`}
      onClick={onClick}
    >
      <p className="text-sm font-normal text-[var(--text-high)]">{task.name}</p>
      <div className="mt-1">
        <StatusBadge status={task.derived_status} />
      </div>
    </button>
  );
}

// ─── New Task Dialog ─────────────────────────────────────────────────────────

function NewTaskDialog({
  projectId,
  open,
  onOpenChange,
}: {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createMutation = useCreateLocalTask(projectId);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [nameError, setNameError] = useState("");

  function handleCreate() {
    if (!name.trim()) {
      setNameError("Task name is required.");
      return;
    }
    setNameError("");
    createMutation.mutate(
      { name: name.trim(), description: description.trim() || undefined },
      {
        onSuccess: () => {
          onOpenChange(false);
          setName("");
          setDescription("");
        },
      }
    );
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setName("");
      setDescription("");
      setNameError("");
    }
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Task</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="task-name-input" className="text-xs text-[var(--text-normal)]">
              Task name
            </label>
            <Input
              id="task-name-input"
              placeholder="Task name"
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              aria-describedby={nameError ? "task-name-error" : undefined}
            />
            {nameError && (
              <p id="task-name-error" className="text-xs" style={{ color: "var(--error)" }}>
                {nameError}
              </p>
            )}
            {createMutation.isError && (
              <p className="text-xs" style={{ color: "var(--error)" }}>
                Could not create task. Try again.
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="task-description-input" className="text-xs text-[var(--text-normal)]">
              Description (optional)
            </label>
            <textarea
              id="task-description-input"
              rows={3}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-secondary-default)] px-3 py-2 text-sm text-[var(--text-high)] placeholder:text-[var(--text-low)]"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>
            Discard
          </Button>
          <Button onClick={handleCreate} disabled={createMutation.isPending}>
            {createMutation.isPending ? "…" : "Create Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Project Dialog ────────────────────────────────────────────────────

function DeleteProjectDialog({
  projectId,
  taskCount,
  open,
  onOpenChange,
}: {
  projectId: string;
  taskCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function handleDelete() {
    setIsDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setDeleteError(`Could not delete project (HTTP ${res.status}). Try again.`);
        setIsDeleting(false);
        return;
      }
      onOpenChange(false);
      void navigate({ to: "/projects" });
    } catch {
      setDeleteError("Could not delete project. Try again.");
      setIsDeleting(false);
    }
  }

  const bodyText =
    taskCount > 0
      ? `This will permanently delete this project and all ${taskCount} tasks. This cannot be undone.`
      : "This will permanently delete this project. This cannot be undone.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete project?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-[var(--text-normal)]">{bodyText}</p>
        {deleteError && (
          <p className="text-xs" style={{ color: "var(--error)" }}>
            {deleteError}
          </p>
        )}
        <DialogFooter>
          <Button
            variant="ghost"
            autoFocus
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Keep Project
          </Button>
          <Button
            style={{ backgroundColor: "var(--error)", color: "white" }}
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "…" : "Delete Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Task Detail Panel ────────────────────────────────────────────────────────

function TaskDetailPanel({
  task,
  projectId,
  onClose,
}: {
  task: LocalTask;
  projectId: string;
  onClose: () => void;
}) {
  const patchWorkspace = usePatchTaskWorkspace(projectId);
  const [name, setName] = useState(task.name);
  const [description, setDescription] = useState(task.description ?? "");
  const [patchError, setPatchError] = useState("");

  // Keep local state in sync if task prop changes (e.g. after polling)
  // Only update if task id or server-modified name/description changes
  const [lastTaskId, setLastTaskId] = useState(task.id);
  if (task.id !== lastTaskId) {
    setLastTaskId(task.id);
    setName(task.name);
    setDescription(task.description ?? "");
  }

  async function saveField(field: "name" | "description", value: string) {
    setPatchError("");
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field === "name" ? "name" : "description"]: value }),
      });
      if (!res.ok) {
        setPatchError(`Could not save ${field}. Try again.`);
      }
    } catch {
      setPatchError(`Could not save ${field}. Try again.`);
    }
  }

  function handleWorkspaceChange(workspaceId: string | null) {
    patchWorkspace.mutate({ taskId: task.id, workspaceId });
  }

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  }

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-4 bg-[var(--bg-panel-default)] border-l border-[var(--border)]" style={{ minWidth: 320 }}>
      {/* Panel header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-[var(--text-high)]">Task</h2>
        <button
          type="button"
          aria-label="Close task panel"
          className="rounded p-1 text-[var(--text-low)] hover:text-[var(--text-high)]"
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      {/* Status badge */}
      <div>
        <StatusBadge status={task.derived_status} ariaLive="polite" />
      </div>

      {/* Name field */}
      <div className="flex flex-col gap-1">
        <label htmlFor={`task-name-${task.id}`} className="text-xs text-[var(--text-normal)]">
          Name
        </label>
        <Input
          id={`task-name-${task.id}`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => saveField("name", name.trim())}
        />
      </div>

      {/* Description field */}
      <div className="flex flex-col gap-1">
        <label htmlFor={`task-desc-${task.id}`} className="text-xs text-[var(--text-normal)]">
          Description
        </label>
        <textarea
          id={`task-desc-${task.id}`}
          rows={3}
          className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-secondary-default)] px-3 py-2 text-sm text-[var(--text-high)] placeholder:text-[var(--text-low)]"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => saveField("description", description)}
        />
      </div>

      {/* Workspace dropdown */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label htmlFor={`task-workspace-${task.id}`} className="text-xs text-[var(--text-normal)]">
            Linked Workspace
          </label>
          {task.workspace_id && (
            <button
              type="button"
              aria-label="Unlink workspace"
              className="text-xs text-[var(--text-low)] hover:text-[var(--text-high)]"
              onClick={() => handleWorkspaceChange(null)}
            >
              ✕
            </button>
          )}
        </div>
        <WorkspaceDropdown
          currentWorkspaceId={task.workspace_id}
          onChange={handleWorkspaceChange}
          disabled={patchWorkspace.isPending}
        />
        {patchWorkspace.isError && (
          <p className="text-xs" style={{ color: "var(--error)" }}>
            Could not update workspace link. Try again.
          </p>
        )}
      </div>

      {patchError && (
        <p className="text-xs" style={{ color: "var(--error)" }}>
          {patchError}
        </p>
      )}

      {/* Timestamps */}
      <div className="flex flex-col gap-1 text-xs text-[var(--text-low)]">
        <span>Created {formatDate(task.created_at)}</span>
        <span>Updated {formatDate(task.updated_at)}</span>
      </div>
    </div>
  );
}

// ─── Column ──────────────────────────────────────────────────────────────────

const COLUMN_STATUSES: DerivedStatus[] = ["pending", "running", "done"];

function KanbanColumn({
  status,
  tasks,
  selectedTaskId,
  onSelectTask,
}: {
  status: DerivedStatus;
  tasks: LocalTask[];
  selectedTaskId: string | null;
  onSelectTask: (task: LocalTask) => void;
}) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <div className="flex flex-1 flex-col gap-4 min-w-0">
      <h3
        className="text-xs font-normal text-[var(--text-normal)] border-b border-[var(--border)] pb-2"
        aria-label={`${label}, ${tasks.length} tasks`}
      >
        {label} ({tasks.length})
      </h3>
      <div className="flex flex-col gap-2">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            selected={task.id === selectedTaskId}
            onClick={() => onSelectTask(task)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── LocalTaskKanban ──────────────────────────────────────────────────────────

export function LocalTaskKanban({ projectId }: { projectId: string }) {
  const { data: tasks, isLoading, isError } = useLocalTasks(projectId);
  const [selectedTask, setSelectedTask] = useState<LocalTask | null>(null);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Keep selected task state fresh after polling updates
  const freshSelectedTask =
    selectedTask && tasks
      ? (tasks.find((t) => t.id === selectedTask.id) ?? null)
      : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <p aria-live="polite" className="text-[var(--text-low)]">
          Loading tasks…
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <p className="text-[var(--text-low)]">
          Could not load tasks. Check that the VK server is running and try again.
        </p>
      </div>
    );
  }

  const taskList = tasks ?? [];

  // Empty project state
  if (taskList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full gap-4">
        <p className="text-base font-semibold text-[var(--text-high)]">No tasks yet</p>
        <p className="text-sm text-[var(--text-low)]">
          Create a task to start tracking your work.
        </p>
        <Button onClick={() => setIsNewTaskOpen(true)}>New Task</Button>
        <NewTaskDialog
          projectId={projectId}
          open={isNewTaskOpen}
          onOpenChange={setIsNewTaskOpen}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div />
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            style={{ color: "var(--error)" }}
            onClick={() => setIsDeleteOpen(true)}
          >
            Delete Project
          </Button>
          <Button onClick={() => setIsNewTaskOpen(true)}>New Task</Button>
        </div>
      </div>

      {/* Board + optional detail panel */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Kanban columns */}
        <div className="flex flex-1 gap-8 overflow-auto p-4">
          {COLUMN_STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={taskList.filter((t) => t.derived_status === status)}
              selectedTaskId={freshSelectedTask?.id ?? null}
              onSelectTask={setSelectedTask}
            />
          ))}
        </div>

        {/* Task detail sidebar */}
        {freshSelectedTask && (
          <TaskDetailPanel
            key={freshSelectedTask.id}
            task={freshSelectedTask}
            projectId={projectId}
            onClose={() => setSelectedTask(null)}
          />
        )}
      </div>

      <NewTaskDialog
        projectId={projectId}
        open={isNewTaskOpen}
        onOpenChange={setIsNewTaskOpen}
      />
      <DeleteProjectDialog
        projectId={projectId}
        taskCount={taskList.length}
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
      />
    </div>
  );
}
