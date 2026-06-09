use base64::Engine;
use chrono::Local;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{Read, Write};
use std::path::{Component, Path, PathBuf};
use tauri::AppHandle;
use walkdir::WalkDir;
use zip::write::SimpleFileOptions;

#[derive(Debug, Serialize)]
pub struct StorageInfo {
    pub data_dir: String,
    pub data_file: String,
    pub assets_dir: String,
}

#[derive(Debug, Serialize)]
pub struct StorageError {
    pub path: String,
    pub message: String,
}

#[derive(Debug, Deserialize)]
pub struct SaveDataRequest {
    pub json: String,
}

#[derive(Debug, Deserialize)]
pub struct CopyAssetRequest {
    pub source_path: String,
    pub file_name: String,
}

#[derive(Debug, Serialize)]
pub struct CopiedAsset {
    pub relative_path: String,
}

#[derive(Debug, Deserialize)]
pub struct WriteJsonExportRequest {
    pub json: String,
}

fn storage_error(path: impl AsRef<Path>, message: impl Into<String>) -> StorageError {
    StorageError {
        path: path.as_ref().display().to_string(),
        message: message.into(),
    }
}

fn executable_dir() -> Result<PathBuf, StorageError> {
    let exe = std::env::current_exe().map_err(|error| storage_error("CraftPlan.exe", format!("Could not locate the app executable: {error}")))?;
    exe.parent()
        .map(Path::to_path_buf)
        .ok_or_else(|| storage_error(&exe, "Could not locate the executable folder."))
}

fn data_dir() -> Result<PathBuf, StorageError> {
    Ok(executable_dir()?.join("CraftPlanData"))
}

fn ensure_dir(path: &Path) -> Result<(), StorageError> {
    fs::create_dir_all(path).map_err(|error| {
        storage_error(
            path,
            format!("CraftPlan needs read/write access to this folder: {error}"),
        )
    })
}

fn check_writable(path: &Path) -> Result<(), StorageError> {
    let probe = path.join(".craftplan-write-test");
    fs::File::create(&probe)
        .and_then(|mut file| file.write_all(b"ok"))
        .and_then(|_| fs::remove_file(&probe))
        .map_err(|error| storage_error(path, format!("CraftPlan cannot write to this folder: {error}")))
}

fn ensure_storage() -> Result<PathBuf, StorageError> {
    let root = data_dir()?;
    ensure_dir(&root)?;
    ensure_dir(&root.join("assets"))?;
    ensure_dir(&root.join("assets").join("items"))?;
    ensure_dir(&root.join("assets").join("thumbnails"))?;
    ensure_dir(&root.join("backups"))?;
    ensure_dir(&root.join("exports"))?;
    check_writable(&root)?;
    Ok(root)
}

fn timestamp() -> String {
    Local::now().format("%Y-%m-%d-%H-%M-%S").to_string()
}

fn safe_asset_name(file_name: &str) -> String {
    file_name
        .chars()
        .map(|ch| match ch {
            '\\' | '/' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '-',
            _ => ch,
        })
        .collect()
}

fn mime_for_path(path: &Path) -> &'static str {
    match path.extension().and_then(|value| value.to_str()).unwrap_or("").to_lowercase().as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        _ => "application/octet-stream",
    }
}

fn safe_zip_path(path: &Path) -> bool {
    path.components().all(|component| matches!(component, Component::Normal(_) | Component::CurDir))
}

#[tauri::command]
pub fn init_storage(_app: AppHandle) -> Result<StorageInfo, StorageError> {
    let root = ensure_storage()?;
    Ok(StorageInfo {
        data_file: root.join("data.json").display().to_string(),
        assets_dir: root.join("assets").display().to_string(),
        data_dir: root.display().to_string(),
    })
}

#[tauri::command]
pub fn read_data(_app: AppHandle) -> Result<Option<String>, StorageError> {
    let root = ensure_storage()?;
    let file = root.join("data.json");
    if !file.exists() {
        return Ok(None);
    }
    fs::read_to_string(&file).map(Some).map_err(|error| storage_error(&file, format!("Could not read data.json: {error}")))
}

#[tauri::command]
pub fn save_data(_app: AppHandle, request: SaveDataRequest) -> Result<(), StorageError> {
    let root = ensure_storage()?;
    let file = root.join("data.json");
    let temp = root.join("data.tmp.json");
    serde_json::from_str::<serde_json::Value>(&request.json)
        .map_err(|error| storage_error(&file, format!("Data is not valid JSON: {error}")))?;
    fs::write(&temp, request.json).map_err(|error| storage_error(&temp, format!("Could not write temporary data file: {error}")))?;
    if file.exists() {
        fs::remove_file(&file).map_err(|error| storage_error(&file, format!("Could not replace data.json: {error}")))?;
    }
    fs::rename(&temp, &file).map_err(|error| storage_error(&file, format!("Could not replace data.json: {error}")))
}

#[tauri::command]
pub fn copy_item_asset(_app: AppHandle, request: CopyAssetRequest) -> Result<CopiedAsset, StorageError> {
    let root = ensure_storage()?;
    let extension = Path::new(&request.file_name)
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("")
        .to_lowercase();
    if !["png", "jpg", "jpeg", "webp"].contains(&extension.as_str()) {
        return Err(storage_error(&request.source_path, "Supported image formats are PNG, JPG, JPEG, and WEBP."));
    }
    let metadata = fs::metadata(&request.source_path).map_err(|error| storage_error(&request.source_path, format!("Could not read selected image: {error}")))?;
    if metadata.len() > 5 * 1024 * 1024 {
        return Err(storage_error(&request.source_path, "Image must be 5 MB or smaller."));
    }
    let relative = format!("assets/items/{}", safe_asset_name(&request.file_name));
    let destination = root.join(&relative);
    fs::copy(&request.source_path, &destination).map_err(|error| storage_error(&destination, format!("Could not copy image into CraftPlanData: {error}")))?;
    Ok(CopiedAsset { relative_path: relative.replace('\\', "/") })
}

#[tauri::command]
pub fn read_asset_data_url(_app: AppHandle, relative_path: String) -> Result<String, StorageError> {
    let root = ensure_storage()?;
    let normalized = relative_path.replace('\\', "/");
    let relative = Path::new(&normalized);
    if !safe_zip_path(relative) {
        return Err(storage_error(&root, "Asset path is not valid."));
    }
    let file = root.join(relative);
    let bytes = fs::read(&file).map_err(|error| storage_error(&file, format!("Could not read image asset: {error}")))?;
    let encoded = base64::engine::general_purpose::STANDARD.encode(bytes);
    Ok(format!("data:{};base64,{}", mime_for_path(&file), encoded))
}

#[tauri::command]
pub fn create_backup(_app: AppHandle) -> Result<String, StorageError> {
    let root = ensure_storage()?;
    let source = root.join("data.json");
    if !source.exists() {
        return Err(storage_error(&source, "No data.json exists yet."));
    }
    let destination = root.join("backups").join(format!("backup-{}.json", timestamp()));
    fs::copy(&source, &destination).map_err(|error| storage_error(&destination, format!("Could not create backup: {error}")))?;
    Ok(destination.display().to_string())
}

#[tauri::command]
pub fn write_json_export(_app: AppHandle, request: WriteJsonExportRequest) -> Result<String, StorageError> {
    let root = ensure_storage()?;
    let destination = root.join("exports").join(format!("craftplan-export-{}.json", timestamp()));
    serde_json::from_str::<serde_json::Value>(&request.json)
        .map_err(|error| storage_error(&destination, format!("Export JSON is invalid: {error}")))?;
    fs::write(&destination, request.json).map_err(|error| storage_error(&destination, format!("Could not write export: {error}")))?;
    Ok(destination.display().to_string())
}

#[tauri::command]
pub fn read_text_file(_app: AppHandle, path: String) -> Result<String, StorageError> {
    fs::read_to_string(&path).map_err(|error| storage_error(path, format!("Could not read selected file: {error}")))
}

#[tauri::command]
pub fn export_full_package(_app: AppHandle) -> Result<String, StorageError> {
    let root = ensure_storage()?;
    let destination = root.join("exports").join(format!("craftplan-package-{}.zip", timestamp()));
    let file = fs::File::create(&destination).map_err(|error| storage_error(&destination, format!("Could not create package: {error}")))?;
    let mut zip = zip::ZipWriter::new(file);
    let options = SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);

    for path in [root.join("data.json"), root.join("assets")] {
        if path.is_file() {
            let name = path.strip_prefix(&root).unwrap().to_string_lossy().replace('\\', "/");
            zip.start_file(name, options).map_err(|error| storage_error(&destination, error.to_string()))?;
            let bytes = fs::read(&path).map_err(|error| storage_error(&path, error.to_string()))?;
            zip.write_all(&bytes).map_err(|error| storage_error(&destination, error.to_string()))?;
        } else if path.is_dir() {
            for entry in WalkDir::new(&path).into_iter().filter_map(Result::ok).filter(|entry| entry.path().is_file()) {
                let name = entry.path().strip_prefix(&root).unwrap().to_string_lossy().replace('\\', "/");
                zip.start_file(name, options).map_err(|error| storage_error(&destination, error.to_string()))?;
                let bytes = fs::read(entry.path()).map_err(|error| storage_error(entry.path(), error.to_string()))?;
                zip.write_all(&bytes).map_err(|error| storage_error(&destination, error.to_string()))?;
            }
        }
    }
    zip.finish().map_err(|error| storage_error(&destination, error.to_string()))?;
    Ok(destination.display().to_string())
}

#[tauri::command]
pub fn import_full_package(_app: AppHandle, package_path: String) -> Result<(), StorageError> {
    let root = ensure_storage()?;
    let file = fs::File::open(&package_path).map_err(|error| storage_error(&package_path, format!("Could not open package: {error}")))?;
    let mut archive = zip::ZipArchive::new(file).map_err(|error| storage_error(&package_path, format!("Could not read package: {error}")))?;

    for index in 0..archive.len() {
        let mut entry = archive.by_index(index).map_err(|error| storage_error(&package_path, error.to_string()))?;
        let enclosed = entry.enclosed_name().ok_or_else(|| storage_error(&package_path, "Package contains an unsafe path."))?.to_owned();
        if !safe_zip_path(&enclosed) {
            return Err(storage_error(&package_path, "Package contains an unsafe path."));
        }
        if !(enclosed == Path::new("data.json") || enclosed.starts_with("assets")) {
            continue;
        }
        let destination = root.join(enclosed);
        if entry.is_dir() {
            ensure_dir(&destination)?;
        } else {
            if let Some(parent) = destination.parent() {
                ensure_dir(parent)?;
            }
            let mut outfile = fs::File::create(&destination).map_err(|error| storage_error(&destination, error.to_string()))?;
            let mut buffer = Vec::new();
            entry.read_to_end(&mut buffer).map_err(|error| storage_error(&package_path, error.to_string()))?;
            outfile.write_all(&buffer).map_err(|error| storage_error(&destination, error.to_string()))?;
        }
    }
    Ok(())
}
