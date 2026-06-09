use chrono::Local;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::fs;
use std::io::Read;
use std::path::{Component, Path, PathBuf};
use std::time::Duration;
use tauri::AppHandle;
use uuid::Uuid;
use walkdir::WalkDir;

#[derive(Debug, Serialize)]
pub struct SyncError {
    pub path: String,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncState {
    pub database_mode: String,
    pub provider: String,
    pub google_sheet_url: String,
    pub web_app_url: String,
    pub workspace_private_key: String,
    pub device_id: String,
    pub display_name: String,
    pub last_revision: u64,
    pub last_sync_at: Option<String>,
    pub last_remote_updated_at: Option<String>,
    pub last_sync_status: Option<String>,
    pub last_message: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WriteSyncStateRequest {
    pub state: SyncState,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppsScriptRequest {
    pub web_app_url: String,
    pub body: Value,
}

#[derive(Debug, Deserialize)]
pub struct ReplaceDataRequest {
    pub json: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AssetManifestEntry {
    pub relative_path: String,
    pub sha256: String,
    pub mime_type: String,
    pub size_bytes: u64,
}

fn sync_error(path: impl AsRef<Path>, message: impl Into<String>) -> SyncError {
    SyncError {
        path: path.as_ref().display().to_string(),
        message: message.into(),
    }
}

fn executable_dir() -> Result<PathBuf, SyncError> {
    let exe = std::env::current_exe().map_err(|error| sync_error("CraftPlan.exe", format!("Could not locate the app executable: {error}")))?;
    exe.parent()
        .map(Path::to_path_buf)
        .ok_or_else(|| sync_error(&exe, "Could not locate the executable folder."))
}

fn data_dir() -> Result<PathBuf, SyncError> {
    Ok(executable_dir()?.join("CraftPlanData"))
}

fn ensure_dir(path: &Path) -> Result<(), SyncError> {
    fs::create_dir_all(path).map_err(|error| sync_error(path, format!("CraftPlan needs read/write access to this folder: {error}")))
}

fn ensure_storage() -> Result<PathBuf, SyncError> {
    let root = data_dir()?;
    ensure_dir(&root)?;
    ensure_dir(&root.join("assets").join("items"))?;
    ensure_dir(&root.join("backups"))?;
    Ok(root)
}

fn timestamp() -> String {
    Local::now().format("%Y-%m-%d-%H%M%S").to_string()
}

fn default_sync_state() -> SyncState {
    SyncState {
        database_mode: "offline".to_string(),
        provider: "apps-script".to_string(),
        google_sheet_url: String::new(),
        web_app_url: String::new(),
        workspace_private_key: String::new(),
        device_id: Uuid::new_v4().to_string(),
        display_name: String::new(),
        last_revision: 0,
        last_sync_at: None,
        last_remote_updated_at: None,
        last_sync_status: Some("idle".to_string()),
        last_message: None,
    }
}

fn safe_relative_path(path: &Path) -> bool {
    path.components().all(|component| matches!(component, Component::Normal(_) | Component::CurDir))
}

fn mime_for_path(path: &Path) -> &'static str {
    match path.extension().and_then(|value| value.to_str()).unwrap_or("").to_lowercase().as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        _ => "application/octet-stream",
    }
}

fn validate_web_app_url(url: &str) -> Result<(), SyncError> {
    let trimmed = url.trim();
    if trimmed.starts_with("https://script.google.com/macros/s/") && trimmed.contains("/exec") {
        Ok(())
    } else {
        Err(sync_error("sync-state.json", "Enter a valid Apps Script Web App URL."))
    }
}

#[tauri::command]
pub fn read_sync_state(_app: AppHandle) -> Result<SyncState, SyncError> {
    let root = ensure_storage()?;
    let file = root.join("sync-state.json");
    if !file.exists() {
        return Ok(default_sync_state());
    }
    let raw = fs::read_to_string(&file).map_err(|error| sync_error(&file, format!("Could not read sync-state.json: {error}")))?;
    serde_json::from_str::<SyncState>(&raw).map_err(|error| sync_error(&file, format!("sync-state.json is not valid: {error}")))
}

#[tauri::command]
pub fn write_sync_state(_app: AppHandle, request: WriteSyncStateRequest) -> Result<(), SyncError> {
    let root = ensure_storage()?;
    let file = root.join("sync-state.json");
    let json = serde_json::to_string_pretty(&request.state).map_err(|error| sync_error(&file, format!("Could not serialize sync-state.json: {error}")))?;
    // TODO: Move Workspace Private Key storage to the OS secure credential store.
    fs::write(&file, json).map_err(|error| sync_error(&file, format!("Could not write sync-state.json: {error}")))
}

#[tauri::command]
pub async fn call_apps_script(_app: AppHandle, request: AppsScriptRequest) -> Result<Value, SyncError> {
    validate_web_app_url(&request.web_app_url)?;
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(20))
        .redirect(reqwest::redirect::Policy::limited(10))
        .build()
        .map_err(|error| sync_error("Apps Script", format!("Could not create HTTP client: {error}")))?;
    let response = client
        .post(request.web_app_url.trim())
        .json(&request.body)
        .send()
        .await
        .map_err(|error| sync_error("Apps Script", format!("Could not reach Apps Script Web App: {error}")))?;
    let status = response.status();
    let text = response
        .text()
        .await
        .map_err(|error| sync_error("Apps Script", format!("Could not read Apps Script response: {error}")))?;
    if !status.is_success() {
        return Err(sync_error("Apps Script", format!("Apps Script returned HTTP {status}.")));
    }
    serde_json::from_str::<Value>(&text).map_err(|error| sync_error("Apps Script", format!("Apps Script returned invalid JSON: {error}")))
}

#[tauri::command]
pub fn generate_asset_manifest(_app: AppHandle) -> Result<Vec<AssetManifestEntry>, SyncError> {
    let root = ensure_storage()?;
    let items_dir = root.join("assets").join("items");
    let mut manifest = Vec::new();
    if !items_dir.exists() {
        return Ok(manifest);
    }
    for entry in WalkDir::new(&items_dir).into_iter().filter_map(Result::ok).filter(|entry| entry.path().is_file()) {
        let relative = entry
            .path()
            .strip_prefix(&root)
            .map_err(|error| sync_error(entry.path(), format!("Could not build asset path: {error}")))?;
        if !safe_relative_path(relative) {
            continue;
        }
        let mut file = fs::File::open(entry.path()).map_err(|error| sync_error(entry.path(), format!("Could not read asset: {error}")))?;
        let mut bytes = Vec::new();
        file.read_to_end(&mut bytes).map_err(|error| sync_error(entry.path(), format!("Could not read asset: {error}")))?;
        let sha256 = format!("{:x}", Sha256::digest(&bytes));
        manifest.push(AssetManifestEntry {
            relative_path: relative.to_string_lossy().replace('\\', "/"),
            sha256,
            mime_type: mime_for_path(entry.path()).to_string(),
            size_bytes: bytes.len() as u64,
        });
    }
    manifest.sort_by(|left, right| left.relative_path.cmp(&right.relative_path));
    Ok(manifest)
}

#[tauri::command]
pub fn replace_data_from_online(_app: AppHandle, request: ReplaceDataRequest) -> Result<String, SyncError> {
    let root = ensure_storage()?;
    let data_file = root.join("data.json");
    let backup_file = root.join("backups").join(format!("data-before-online-update-{}.json", timestamp()));
    serde_json::from_str::<Value>(&request.json).map_err(|error| sync_error(&data_file, format!("Remote data is not valid JSON: {error}")))?;
    if data_file.exists() {
        fs::copy(&data_file, &backup_file).map_err(|error| sync_error(&backup_file, format!("Could not create online update backup: {error}")))?;
    }
    let temp = root.join("data.online-update.tmp.json");
    fs::write(&temp, request.json).map_err(|error| sync_error(&temp, format!("Could not write remote data: {error}")))?;
    if data_file.exists() {
        fs::remove_file(&data_file).map_err(|error| sync_error(&data_file, format!("Could not replace local data.json: {error}")))?;
    }
    fs::rename(&temp, &data_file).map_err(|error| sync_error(&data_file, format!("Could not replace local data.json: {error}")))?;
    Ok(backup_file.display().to_string())
}
