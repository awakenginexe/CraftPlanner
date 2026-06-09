#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod portable_data;
mod sync;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            portable_data::init_storage,
            portable_data::read_data,
            portable_data::save_data,
            portable_data::copy_item_asset,
            portable_data::read_asset_data_url,
            portable_data::create_backup,
            portable_data::write_json_export,
            portable_data::read_text_file,
            portable_data::export_full_package,
            portable_data::import_full_package,
            sync::read_sync_state,
            sync::write_sync_state,
            sync::call_apps_script,
            sync::generate_asset_manifest,
            sync::read_asset_for_sync,
            sync::write_asset_from_sync,
            sync::replace_data_from_online
        ])
        .run(tauri::generate_context!())
        .expect("failed to run CraftPlanner");
}
