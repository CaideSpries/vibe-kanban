use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, SqlitePool, Type};
use strum_macros::{Display, EnumString};
use ts_rs::TS;
use uuid::Uuid;

#[derive(
    Debug, Clone, Type, Serialize, Deserialize, PartialEq, TS, EnumString, Display, Default,
)]
#[sqlx(type_name = "task_status", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
#[strum(serialize_all = "lowercase")]
pub enum TaskStatus {
    #[default]
    Todo,
    InProgress,
    InReview,
    Done,
    Cancelled,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, TS)]
pub struct Task {
    pub id: Uuid,
    pub project_id: Uuid, // Foreign key to Project
    pub title: String,
    pub description: Option<String>,
    pub status: TaskStatus,
    pub workspace_id: Option<Uuid>, // Foreign key to parent Workspace (renamed from parent_workspace_id)
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
pub struct TaskWithStatus {
    pub id: Uuid,
    pub project_id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub workspace_id: Option<Uuid>,
    pub derived_status: String, // "pending" | "running" | "done"
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Task {
    pub async fn find_all(pool: &SqlitePool) -> Result<Vec<Self>, sqlx::Error> {
        sqlx::query_as!(
            Task,
            r#"SELECT id as "id!: Uuid", project_id as "project_id!: Uuid", title, description, status as "status!: TaskStatus", workspace_id as "workspace_id: Uuid", created_at as "created_at!: DateTime<Utc>", updated_at as "updated_at!: DateTime<Utc>"
               FROM tasks
               ORDER BY created_at ASC"#
        )
        .fetch_all(pool)
        .await
    }

    pub async fn find_by_id(pool: &SqlitePool, id: Uuid) -> Result<Option<Self>, sqlx::Error> {
        sqlx::query_as!(
            Task,
            r#"SELECT id as "id!: Uuid", project_id as "project_id!: Uuid", title, description, status as "status!: TaskStatus", workspace_id as "workspace_id: Uuid", created_at as "created_at!: DateTime<Utc>", updated_at as "updated_at!: DateTime<Utc>"
               FROM tasks
               WHERE id = $1"#,
            id
        )
        .fetch_optional(pool)
        .await
    }

    pub async fn create(
        pool: &SqlitePool,
        project_id: Uuid,
        name: &str,
        description: Option<&str>,
    ) -> Result<Self, sqlx::Error> {
        // NOTE: No blank-name guard here. Validation belongs in the route handler (Plan 03-03 Task 1).
        // The model layer does not perform business validation.
        let id = Uuid::new_v4();
        sqlx::query_as!(
            Task,
            r#"INSERT INTO tasks (id, project_id, title, description)
               VALUES ($1, $2, $3, $4)
               RETURNING
                   id as "id!: Uuid",
                   project_id as "project_id!: Uuid",
                   title,
                   description,
                   status as "status!: TaskStatus",
                   workspace_id as "workspace_id: Uuid",
                   created_at as "created_at!: DateTime<Utc>",
                   updated_at as "updated_at!: DateTime<Utc>""#,
            id,
            project_id,
            name,
            description
        )
        .fetch_one(pool)
        .await
    }

    pub async fn patch_workspace_id(
        pool: &SqlitePool,
        id: Uuid,
        workspace_id: Option<Uuid>,
    ) -> Result<Self, sqlx::Error> {
        sqlx::query_as!(
            Task,
            r#"UPDATE tasks SET workspace_id = $1, updated_at = datetime('now','subsec')
               WHERE id = $2
               RETURNING
                   id as "id!: Uuid",
                   project_id as "project_id!: Uuid",
                   title,
                   description,
                   status as "status!: TaskStatus",
                   workspace_id as "workspace_id: Uuid",
                   created_at as "created_at!: DateTime<Utc>",
                   updated_at as "updated_at!: DateTime<Utc>""#,
            workspace_id,
            id
        )
        .fetch_one(pool)
        .await
    }
}

impl TaskWithStatus {
    pub async fn find_by_project(
        pool: &SqlitePool,
        project_id: Uuid,
    ) -> Result<Vec<TaskWithStatus>, sqlx::Error> {
        sqlx::query_as!(
            TaskWithStatus,
            r#"SELECT
                   t.id as "id!: Uuid",
                   t.project_id as "project_id!: Uuid",
                   t.title,
                   t.description,
                   t.workspace_id as "workspace_id: Uuid",
                   t.created_at as "created_at!: DateTime<Utc>",
                   t.updated_at as "updated_at!: DateTime<Utc>",
                   CASE
                       WHEN t.workspace_id IS NULL THEN 'pending'
                       WHEN EXISTS (
                           SELECT 1 FROM sessions s
                           JOIN execution_processes ep ON ep.session_id = s.id
                           WHERE s.workspace_id = t.workspace_id
                             AND ep.status = 'running'
                       ) THEN 'running'
                       ELSE 'done'
                   END AS "derived_status!: String"
               FROM tasks t
               WHERE t.project_id = $1
               ORDER BY t.created_at ASC"#,
            project_id
        )
        .fetch_all(pool)
        .await
    }
}
