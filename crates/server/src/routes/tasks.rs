use axum::{
    Router,
    extract::{Path, State},
    response::Json as ResponseJson,
    routing::{get, patch},
};
use db::models::task::{Task, TaskWithStatus};
use deployment::Deployment;
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    DeploymentImpl,
    error::ApiError,
};
use utils::response::ApiResponse;

// Request body for POST /api/projects/:project_id/tasks
// "name" in API maps to "title" in DB (D-01 naming; see task.rs create() binding)
#[derive(Deserialize)]
pub struct CreateTaskRequest {
    pub name: String,
    pub description: Option<String>,
}

// Request body for PATCH /api/tasks/:task_id
// workspace_id: None means clear the link; Some(uuid) means set it
#[derive(Deserialize)]
pub struct PatchTaskRequest {
    pub workspace_id: Option<Uuid>,
}

// GET /api/projects/:project_id/tasks
// Returns tasks for a project with derived_status (pending/running/done)
pub async fn list_tasks(
    State(deployment): State<DeploymentImpl>,
    Path(project_id): Path<Uuid>,
) -> Result<ResponseJson<ApiResponse<Vec<TaskWithStatus>>>, ApiError> {
    let tasks = TaskWithStatus::find_by_project(&deployment.db().pool, project_id).await?;
    Ok(ResponseJson(ApiResponse::success(tasks)))
}

// POST /api/projects/:project_id/tasks
// Creates a new task; returns 422 if name is blank
pub async fn create_task(
    State(deployment): State<DeploymentImpl>,
    Path(project_id): Path<Uuid>,
    ResponseJson(payload): ResponseJson<CreateTaskRequest>,
) -> Result<ResponseJson<ApiResponse<Task>>, ApiError> {
    if payload.name.trim().is_empty() {
        return Err(ApiError::BadRequest("Task name is required".to_string()));
    }
    let task = Task::create(
        &deployment.db().pool,
        project_id,
        &payload.name,
        payload.description.as_deref(),
    )
    .await?;
    Ok(ResponseJson(ApiResponse::success(task)))
}

// PATCH /api/tasks/:task_id
// Sets or clears workspace_id. Called by queue runner (D-08) and user via sidebar (D-09).
pub async fn patch_task(
    State(deployment): State<DeploymentImpl>,
    Path(task_id): Path<Uuid>,
    ResponseJson(payload): ResponseJson<PatchTaskRequest>,
) -> Result<ResponseJson<ApiResponse<Task>>, ApiError> {
    let task = Task::patch_workspace_id(
        &deployment.db().pool,
        task_id,
        payload.workspace_id,
    )
    .await?;
    Ok(ResponseJson(ApiResponse::success(task)))
}

pub fn router() -> Router<DeploymentImpl> {
    Router::new()
        .route("/projects/{project_id}/tasks", get(list_tasks).post(create_task))
        .route("/tasks/{task_id}", patch(patch_task))
}
