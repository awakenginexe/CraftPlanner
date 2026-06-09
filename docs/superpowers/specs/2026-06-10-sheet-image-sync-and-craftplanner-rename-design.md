# Sheet Image Sync and CraftPlanner Rename Design

## Goal

Update the app from CraftPlan to CraftPlanner, remove the Windows terminal window when users launch the release executable, and extend Online DB sync so uploaded item images can sync through the same Google Sheet setup without Google Drive or paid services.

## Scope

This change includes:

- Rename user-facing product text and app metadata from CraftPlan to CraftPlanner.
- Bump the app version to `1.1.0`.
- Configure the Windows release executable as a GUI app so it does not open a terminal window when launched normally.
- Add Google Sheets-backed image asset sync for uploaded item images.
- Keep Offline DB as the default and keep full package export/import as the most reliable backup/migration path.

This change does not add Google Drive, OAuth login, paid hosting, or third-party image hosting.

## Rename Compatibility

The user-facing app name, window title, installer metadata, package metadata, and README title will use CraftPlanner. The portable data folder will remain `CraftPlanData` in version `1.1.0` so current users do not lose access to existing data after upgrading.

Documentation will describe `CraftPlanData` as the compatibility data folder used by CraftPlanner.

## Image Sync Approach

Online DB will continue using the Apps Script Web App as the only network endpoint. Google Sheets remains the remote database. The Apps Script template will add asset sheets for image storage:

- `cp_assets`: one row per asset with relative path, SHA-256 hash, MIME type, byte size, chunk count, updated timestamp, and revision.
- `cp_asset_chunks`: base64 text chunks for each asset.

The app already stores images locally under `CraftPlanData/assets/items/` and references them in `data.json` by relative path. Online Save will compare local asset metadata against the remote asset manifest and upload only missing or changed assets. Online Update will download missing or changed remote assets before or alongside replacing `data.json`, then save them back into the portable assets folder.

Images are stored as base64 chunks because Google Sheets cells are text-first storage. The implementation should use chunk sizes below the Google Sheets per-cell text limit and should avoid appending duplicate chunks for unchanged assets.

## Limits

To keep this free and reliable, the app will enforce a `1 MB` per-image remote sync limit after any local compression/resizing step available in the implementation. If compression is not implemented in the first pass, images larger than `1 MB` are rejected for Online DB image sync with a clear message.

The UI and README will explain that Google Sheets image sync is intended for small item icons. Large image libraries should use full package export/import instead.

## Data Flow

Save Online:

1. Validate sync settings.
2. Generate a local asset manifest for `CraftPlanData/assets/items/`.
3. Ask Apps Script for the remote asset manifest.
4. Upload changed image assets as base64 chunks.
5. Push the `data.json` snapshot.
6. Persist the returned revision and status locally.

Update From Online:

1. Validate sync settings.
2. Pull the remote data snapshot and asset manifest.
3. Create a local backup before replacing data or assets.
4. Download missing or changed image assets into `CraftPlanData/assets/items/`.
5. Replace `data.json`.
6. Reload app state and persist the returned revision/status.

## Error Handling

If image upload fails because an image is too large, the app should keep the local data intact and show a practical message naming the affected item or file path. Conflict handling stays revision-based: the app must not overwrite newer remote data until the user updates first.

If asset download fails during Update From Online, the app should avoid writing a partially inconsistent state when possible. At minimum it must create a backup first and show a message that some images could not be downloaded.

## Windows Launch Behavior

The Rust entry point will be configured for Windows release GUI mode so launching the executable from Explorer does not open a console window. Development builds may still show terminal output when run through developer commands.

## Testing

Tests should cover:

- TypeScript sync helpers for remote asset limits and changed-asset decisions.
- Apps Script-compatible request/response parsing for asset manifest, upload, and download actions.
- Version and name metadata updates where practical.
- Existing app tests must continue passing.

Manual verification should include:

- Build/test commands pass.
- A release executable can launch without a visible terminal window.
- Online Save uploads a small item image into the sheet-backed asset store.
- Online Update restores that image on a clean local data folder.
