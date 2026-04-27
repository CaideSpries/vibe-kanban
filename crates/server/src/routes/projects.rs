use axum::{
    Router,
    extract::State,
    response::Json as ResponseJson,
    routing::get,
};
use db::models::project::Project;
use deployment::Deployment;
use serde::Deserialize;
use utils::response::ApiResponse;

use crate::{
    DeploymentImpl,
    error::ApiError,
};

#[derive(Deserialize)]
pub struct CreateProjectRequest {
    pub name: String,
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
    let project = Project::create(&deployment.db().pool, payload.name.trim()).await?;
    Ok(ResponseJson(ApiResponse::success(project)))
}

pub fn router() -> Router<DeploymentImpl> {
    Router::new()
        .route("/projects", get(list_projects).post(create_project))
}
