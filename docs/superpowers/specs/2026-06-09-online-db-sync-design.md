# Online DB Sync Design

## Goal

Add an optional manual Online DB mode that syncs CraftPlan's portable `data.json` through a user-provided Google Sheets + Apps Script Web App endpoint. Offline DB remains the default and must not make network requests.

## Scope

This MVP includes:

- Settings controls for Offline DB / Online DB.
- Local `CraftPlanData/sync-state.json` persistence.
- Apps Script Web App POST protocol for `ping`, `pull`, and `pushSnapshot`.
- Manual Test Connection, Save, and Update buttons.
- Revision conflict handling.
- Backup before replacing local `data.json` from remote data.
- Asset manifest generation for `CraftPlanData/assets/items`.
- A paste-ready `docs/apps-script/CraftPlanSync.gs` template.

This MVP does not upload or download binary assets. It sends an asset manifest only and leaves protocol placeholders in the Apps Script template for future asset operations.

## Architecture

The React Settings screen owns the sync form and status display. TypeScript domain helpers validate URLs, redact secrets, parse Apps Script responses, and format relative timestamps. Tauri commands own portable file reads/writes, `sync-state.json`, backup creation, asset manifest hashing, and HTTP requests so browser CORS does not block Apps Script calls.

## Data Flow

Offline mode uses the existing `CraftPlanData/data.json` path and performs no sync HTTP calls.

Online Save reads current local app state, calls a Tauri `pushSnapshot` command with the saved sync state and current data, and updates `sync-state.json` from the server response. Online Update calls `pull`, creates `data-before-online-update-*.json`, writes remote data into `data.json`, reloads React state, and updates `sync-state.json`.

## Error Handling

Settings blocks online actions when required fields are missing or malformed. Backend errors are returned as friendly messages with the Workspace Private Key redacted. A conflict response with `errorCode: "conflict"` never overwrites remote data and displays: "Online data changed since your last update. Press Update first, review the latest data, then Save again if needed."

## Tests

Vitest covers the TypeScript sync helpers: offline defaults, config validation, URL validation, response parsing, conflict mapping, secret redaction, last-updated formatting, and action gating. Rust backend behavior is verified by build coverage and Tauri command compilation in this MVP.
