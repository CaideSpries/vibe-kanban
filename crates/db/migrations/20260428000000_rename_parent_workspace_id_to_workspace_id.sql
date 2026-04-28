-- Rename parent_workspace_id to workspace_id on tasks table
-- (column was added as parent_workspace_id in 20251216142123 migration)
ALTER TABLE tasks RENAME COLUMN parent_workspace_id TO workspace_id;

-- Update index (drop old name, create new name)
DROP INDEX IF EXISTS idx_tasks_parent_workspace_id;
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON tasks(workspace_id);
