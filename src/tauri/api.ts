import { invoke } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { openPath } from "@tauri-apps/plugin-opener";
import type { AppsScriptResponse, AssetManifestEntry, SyncState } from "../domain/sync";

export type StorageInfo = {
  data_dir: string;
  data_file: string;
  assets_dir: string;
};

export type StorageError = {
  path: string;
  message: string;
};

export async function initStorage(): Promise<StorageInfo> {
  return invoke<StorageInfo>("init_storage");
}

export async function readDataFile(): Promise<string | null> {
  return invoke<string | null>("read_data");
}

export async function saveDataFile(json: string): Promise<void> {
  return invoke<void>("save_data", { request: { json } });
}

export async function chooseImageFile(): Promise<string | null> {
  const result = await openDialog({
    multiple: false,
    filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] }]
  });
  return typeof result === "string" ? result : null;
}

export async function chooseJsonFile(): Promise<string | null> {
  const result = await openDialog({
    multiple: false,
    filters: [{ name: "JSON", extensions: ["json"] }]
  });
  return typeof result === "string" ? result : null;
}

export async function chooseZipFile(): Promise<string | null> {
  const result = await openDialog({
    multiple: false,
    filters: [{ name: "CraftPlan package", extensions: ["zip"] }]
  });
  return typeof result === "string" ? result : null;
}

export async function copyItemAsset(sourcePath: string, fileName: string): Promise<{ relative_path: string }> {
  return invoke("copy_item_asset", { request: { source_path: sourcePath, file_name: fileName } });
}

export async function readAssetDataUrl(relativePath: string): Promise<string> {
  return invoke<string>("read_asset_data_url", { relativePath });
}

export async function createBackup(): Promise<string> {
  return invoke<string>("create_backup");
}

export async function writeJsonExport(json: string): Promise<string> {
  return invoke<string>("write_json_export", { request: { json } });
}

export async function readTextFile(path: string): Promise<string> {
  return invoke<string>("read_text_file", { path });
}

export async function exportFullPackage(): Promise<string> {
  return invoke<string>("export_full_package");
}

export async function importFullPackage(packagePath: string): Promise<void> {
  return invoke<void>("import_full_package", { packagePath });
}

export async function openFolder(path: string): Promise<void> {
  await openPath(path);
}

export async function readSyncState(): Promise<SyncState> {
  return invoke<SyncState>("read_sync_state");
}

export async function writeSyncState(state: SyncState): Promise<void> {
  return invoke<void>("write_sync_state", { request: { state } });
}

export async function callAppsScript(webAppUrl: string, body: unknown): Promise<AppsScriptResponse> {
  return invoke<AppsScriptResponse>("call_apps_script", { request: { webAppUrl, body } });
}

export async function generateAssetManifest(): Promise<AssetManifestEntry[]> {
  return invoke<AssetManifestEntry[]>("generate_asset_manifest");
}

export async function replaceDataFromOnline(json: string): Promise<string> {
  return invoke<string>("replace_data_from_online", { request: { json } });
}
