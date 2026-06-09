# Sheet Image Sync and CraftPlanner Rename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship CraftPlanner `1.1.0` with sheet-only item image sync, no terminal window on normal Windows launch, and backward-compatible `CraftPlanData` storage.

**Architecture:** TypeScript owns sync validation, asset size limits, and action orchestration. Rust owns local asset manifests, base64 asset read/write, backups, and Apps Script HTTP calls. Apps Script stores JSON snapshots in `cp_data_chunks` and image assets in `cp_assets` plus `cp_asset_chunks`.

**Tech Stack:** React, TypeScript, Zustand, Vitest, Tauri 2, Rust, Google Apps Script.

---

### Task 1: TypeScript Asset Sync Helpers

**Files:**
- Modify: `src/domain/sync.ts`
- Test: `src/tests/sync.test.ts`

- [ ] **Step 1: Write failing tests**

Add tests for the new helper API:

```ts
import {
  MAX_SYNC_ASSET_BYTES,
  assetsNeedingDownload,
  assetsNeedingUpload,
  validateSyncAssetManifest
} from "../domain/sync";

test("flags assets over the online sync size limit", () => {
  const result = validateSyncAssetManifest([
    { relativePath: "assets/items/large.png", sha256: "a", mimeType: "image/png", sizeBytes: MAX_SYNC_ASSET_BYTES + 1 }
  ]);
  expect(result.ok).toBe(false);
  expect(result.errors).toEqual(["assets/items/large.png is larger than the 1 MB Online DB image sync limit."]);
});

test("selects only missing or changed assets for upload", () => {
  const local = [
    { relativePath: "assets/items/a.png", sha256: "same", mimeType: "image/png", sizeBytes: 12 },
    { relativePath: "assets/items/b.png", sha256: "new", mimeType: "image/png", sizeBytes: 12 }
  ];
  const remote = [{ relativePath: "assets/items/a.png", sha256: "same", mimeType: "image/png", sizeBytes: 12 }];
  expect(assetsNeedingUpload(local, remote).map((entry) => entry.relativePath)).toEqual(["assets/items/b.png"]);
});

test("selects only missing or changed assets for download", () => {
  const local = [{ relativePath: "assets/items/a.png", sha256: "old", mimeType: "image/png", sizeBytes: 12 }];
  const remote = [
    { relativePath: "assets/items/a.png", sha256: "new", mimeType: "image/png", sizeBytes: 12 },
    { relativePath: "assets/items/c.png", sha256: "remote", mimeType: "image/png", sizeBytes: 12 }
  ];
  expect(assetsNeedingDownload(local, remote).map((entry) => entry.relativePath)).toEqual(["assets/items/a.png", "assets/items/c.png"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/tests/sync.test.ts`

Expected: FAIL because the new exports do not exist.

- [ ] **Step 3: Implement helpers**

Add `MAX_SYNC_ASSET_BYTES = 1024 * 1024`, extend `AssetManifestEntry` with optional `updatedAt` and `revision`, add `AssetPayload`, and implement `validateSyncAssetManifest`, `assetsNeedingUpload`, and `assetsNeedingDownload` by comparing `relativePath` and `sha256`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/tests/sync.test.ts`

Expected: PASS.

### Task 2: Rust Local Asset Read/Write Commands

**Files:**
- Modify: `src-tauri/src/sync.rs`
- Modify: `src-tauri/src/main.rs`
- Modify: `src/tauri/api.ts`

- [ ] **Step 1: Add Rust request/response structs**

Add:

```rust
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadAssetRequest {
    pub relative_path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WriteAssetRequest {
    pub relative_path: String,
    pub base64: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AssetPayload {
    pub relative_path: String,
    pub sha256: String,
    pub mime_type: String,
    pub size_bytes: u64,
    pub base64: String,
}
```

- [ ] **Step 2: Implement safe asset path resolution**

Add a helper that accepts only normal relative paths under `assets/items/` and rejects traversal or non-image paths.

- [ ] **Step 3: Implement `read_asset_for_sync`**

Read the local asset bytes, reject files larger than `1_048_576`, base64 encode them, compute SHA-256, and return `AssetPayload`.

- [ ] **Step 4: Implement `write_asset_from_sync`**

Decode base64, reject decoded bytes larger than `1_048_576`, create parent directories, and write to a temp file before renaming into place.

- [ ] **Step 5: Register commands and TypeScript wrappers**

Register `sync::read_asset_for_sync` and `sync::write_asset_from_sync` in `src-tauri/src/main.rs`. Add `readAssetForSync(relativePath)` and `writeAssetFromSync(relativePath, base64)` to `src/tauri/api.ts`.

- [ ] **Step 6: Build check**

Run: `npm run tauri -- build --debug`

Expected: Rust and TypeScript compile.

### Task 3: Apps Script Asset Protocol

**Files:**
- Modify: `docs/apps-script/CraftPlanSync.gs`

- [ ] **Step 1: Add asset sheet constants**

Add `ASSETS_SHEET = "cp_assets"` and `ASSET_CHUNKS_SHEET = "cp_asset_chunks"`.

- [ ] **Step 2: Extend sheet setup**

Ensure headers:

```js
["relative_path", "sha256", "mime_type", "size_bytes", "chunk_count", "updated_at", "revision"]
["relative_path", "chunk_index", "chunk_text"]
```

- [ ] **Step 3: Add actions**

Add `listAssets`, `pushAsset`, and `pullAsset` handlers. `pushAsset` stores one base64 payload as chunks, replacing existing rows for that path. `pullAsset` returns one base64 payload by path. `listAssets` returns metadata from `cp_assets`.

- [ ] **Step 4: Keep existing snapshot behavior**

Leave `ping`, `pull`, and `pushSnapshot` compatible with older data. Include `assetManifest` in `pull` responses when available.

### Task 4: Store Wiring for Save Online and Update From Online

**Files:**
- Modify: `src/store/useCraftPlanStore.ts`
- Modify: `src/domain/sync.ts`
- Modify: `src/tauri/api.ts`

- [ ] **Step 1: Save Online asset flow**

Before `pushSnapshot`, generate local manifest, validate the 1 MB limit, call `listAssets`, compute `assetsNeedingUpload`, read each local asset with `readAssetForSync`, and call Apps Script `pushAsset`.

- [ ] **Step 2: Update From Online asset flow**

During pull, read `assetManifest` from the response, generate local manifest, compute `assetsNeedingDownload`, create a backup, pull each changed asset, write each asset locally, replace `data.json`, then reload data.

- [ ] **Step 3: Messages**

Show counts in success messages, such as `Online data saved. 3 image assets synced.` and `Updated from online data. 2 image assets restored.`

- [ ] **Step 4: Run tests**

Run: `npm test`

Expected: PASS.

### Task 5: Branding, Version, and Windows GUI Launch

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `index.html`
- Modify: `src/domain/defaultData.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/PermissionError.tsx`
- Modify: `src/screens/Dashboard.tsx`
- Modify: `src/screens/Settings.tsx`
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/tauri.conf.json`
- Modify: `src-tauri/src/main.rs`
- Modify: `README.md`

- [ ] **Step 1: Bump versions**

Set package, Tauri, Cargo, and `APP_VERSION` to `1.1.0`.

- [ ] **Step 2: Rename visible branding**

Change visible product name and metadata from CraftPlan to CraftPlanner. Keep `CraftPlanData` in storage paths and compatibility text.

- [ ] **Step 3: Hide Windows console in release**

Add this crate attribute at the top of `src-tauri/src/main.rs`:

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
```

- [ ] **Step 4: Update README**

Document that CraftPlanner uses the existing `CraftPlanData` compatibility folder, that Online DB image sync stores small item icons in Google Sheets chunks, and that the limit is `1 MB` per image.

### Task 6: Final Verification

**Files:**
- All modified files

- [ ] **Step 1: Run unit tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 2: Run frontend build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 3: Run Tauri build check**

Run: `npm run tauri -- build --debug`

Expected: PASS.

- [ ] **Step 4: Inspect git diff**

Run: `git diff --check` and `git status --short`

Expected: no whitespace errors and only intended files changed.
