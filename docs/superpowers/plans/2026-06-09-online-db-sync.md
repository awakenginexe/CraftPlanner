# Online DB Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a manual Google Sheets + Apps Script Online DB sync MVP while keeping Offline DB as the default.

**Architecture:** TypeScript sync helpers validate configuration and shape UI messages. Tauri commands persist sync state, generate asset manifests, make Apps Script HTTP requests, and perform safe local data replacement with backups.

**Tech Stack:** Tauri 2, Rust, React, TypeScript, Vitest, Tailwind, Google Apps Script.

---

### Task 1: TypeScript Sync Domain Helpers

**Files:**
- Create: `src/domain/sync.ts`
- Test: `src/tests/sync.test.ts`

- [ ] Write failing tests for default state, validation, redaction, response parsing, conflict messages, action gating, and relative timestamp formatting.
- [ ] Implement `createDefaultSyncState`, `validateSyncConfig`, `redactWorkspacePrivateKey`, `parseSyncResponse`, `syncErrorMessage`, `canRunOnlineAction`, and `formatLastUpdatedAgo`.
- [ ] Run `npm test -- src/tests/sync.test.ts` and confirm the tests pass.

### Task 2: Tauri Sync Commands

**Files:**
- Create: `src-tauri/src/sync.rs`
- Modify: `src-tauri/src/main.rs`
- Modify: `src-tauri/Cargo.toml`
- Modify: `src/tauri/api.ts`

- [ ] Add Rust request/response structs for sync state and Apps Script requests.
- [ ] Add commands to read/write `sync-state.json`, call Apps Script with timeout and redirects, create online-update backups, replace `data.json`, and generate an asset manifest.
- [ ] Wire commands into `main.rs` and TypeScript API wrappers.
- [ ] Run `npm run build` to compile TypeScript and `cargo check` through the Tauri crate.

### Task 3: Settings UI

**Files:**
- Modify: `src/screens/Settings.tsx`
- Modify: `src/store/useCraftPlanStore.ts`

- [ ] Load sync state on Settings mount and show the Database / Sync section.
- [ ] Save sync settings without triggering network calls.
- [ ] Implement Test Connection, Save, and Update button handlers.
- [ ] Reload local data after Update replaces `data.json`.
- [ ] Show last sync time, last remote update time, last revision, status, and conflict/error messages.

### Task 4: Apps Script Template

**Files:**
- Create: `docs/apps-script/CraftPlanSync.gs`

- [ ] Add a complete paste-ready Apps Script Web App with `ping`, `pull`, and `pushSnapshot`.
- [ ] Store metadata in `cp_meta`, chunked snapshot JSON in `cp_data_chunks`, and history in `cp_history`.
- [ ] Validate the Workspace Private Key and avoid any EGO Gift specific sheet names.

### Task 5: Verification

**Commands:**
- `npm test`
- `npm run build`
- `npm run tauri -- --help`

- [ ] Report changed files, verification results, remaining TODOs, and exact Apps Script setup steps.
