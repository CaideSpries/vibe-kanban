use axum::{
    Router,
    extract::{Path, State},
    response::Json as ResponseJson,
    routing::{delete, get},
};
use db::models::project::Project;
use deployment::Deployment;
use serde::Deserialize;
use utils::response::ApiResponse;
use uuid::Uuid;

use crate::{
    DeploymentImpl,
    error::ApiError,
};

#[derive(Deserialize)]
pub struct CreateProjectRequest {
    pub name: String,
    pub default_agent_working_dir: String,
}

pub async fn list_projects(
    State(deployment): State<DeploymentImpl>,
) -> Result<ResponseJson<ApiResponse<Vec<Project>>>, ApiError> {
    let projects = Project::find_all(&deployment.db().pool).await?;
    Ok(ResponseJson(ApiResponse::success(projects)))
}

pub async fn create_project(
    State(deployment): State<DeploymentImpl>,
    ResponseJson(payload): ResponseJson<CreateProjectRequest>,
) -> Result<ResponseJson<ApiResponse<Project>>, ApiError> {
    if payload.name.trim().is_empty() {
        return Err(ApiError::BadRequest("Project name is required".to_string()));
    }
    if payload.default_agent_working_dir.trim().is_empty() {
        return Err(ApiError::BadRequest(
            "Working directory is required".to_string(),
        ));
    }
    let project = Project::create(
        &deployment.db().pool,
        payload.name.trim(),
        payload.default_agent_working_dir.trim(),
    )
    .await?;
    Ok(ResponseJson(ApiResponse::success(project)))
}

pub async fn delete_project(
    State(deployment): State<DeploymentImpl>,
    Path(project_id): Path<Uuid>,
) -> Result<ResponseJson<ApiResponse<()>>, ApiError> {
    Project::delete(&deployment.db().pool, project_id).await?;
    Ok(ResponseJson(ApiResponse::success(())))
}

pub fn router() -> Router<DeploymentImpl> {
    Router::new()
        .route("/projects", get(list_projects).post(create_project))
        .route("/projects/{id}", delete(delete_project))
}
