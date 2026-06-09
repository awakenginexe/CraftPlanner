import { createDefaultData, APP_VERSION } from "../domain/defaultData";
import { createSampleData, sampleIds } from "../domain/sampleData";
import type { ThemeMode } from "../domain/types";
import {
  canRunOnlineAction,
  formatExactSyncTimestamp,
  formatLastUpdatedAgo,
  validateSyncConfig,
  type SyncState
} from "../domain/sync";
import { Button, DangerButton, Field, Input, SecondaryButton, Select } from "../components/ui";
import { createBackup, openFolder } from "../tauri/api";
import { useCraftPlanStore } from "../store/useCraftPlanStore";
import { useEffect, useState } from "react";
import { Shield, Sparkles, Database, Settings as SettingsIcon, Server } from "lucide-react";

export function Settings() {
  const {
    data,
    storage,
    saveData,
    setTheme,
    reloadData,
    syncState,
    syncBusy,
    syncMessage,
    updateSyncField,
    persistSyncState,
    testConnection,
    saveOnline,
    updateFromOnline,
    clearSyncMessage
  } = useCraftPlanStore();

  const [localMessage, setLocalMessage] = useState("");

  useEffect(() => {
    return () => {
      clearSyncMessage();
    };
  }, [clearSyncMessage]);

  async function reset() {
    if (!window.confirm("Reset all CraftPlanner data? A backup will be created first.")) return;
    await createBackup().catch(() => undefined);
    await saveData(createDefaultData());
    setLocalMessage("Data reset.");
  }

  async function loadSample() {
    if (!window.confirm("Load sample data? This replaces current data after creating a backup.")) return;
    await createBackup().catch(() => undefined);
    await saveData(createSampleData());
    setLocalMessage("Sample data loaded.");
  }

  async function clearSample() {
    const sampleItemIds = new Set(Array.from(sampleIds).filter((id) => !id.startsWith("recipe-")));
    await saveData({
      ...data,
      items: data.items.filter((item) => !sampleIds.has(item.id)),
      recipes: data.recipes.filter((recipe) => !sampleIds.has(recipe.id)),
      inventory: data.inventory.filter((entry) => !sampleItemIds.has(entry.itemId))
    });
    setLocalMessage("Sample data cleared.");
  }

  const isOnline = syncState.databaseMode === "online";

  return (
    <div className="max-w-4xl space-y-6">
      {/* Storage Configuration */}
      <section className="glass-panel glow-card rounded-2xl border border-zinc-800/80 p-5 shadow-lg space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
          <Database className="h-4 w-4" />
          <span>Local Storage Configuration</span>
        </h2>
        <div className="grid gap-3 text-sm text-zinc-300 bg-zinc-950/40 border border-zinc-800/80 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row sm:justify-between gap-1 border-b border-zinc-900 pb-2">
            <span className="text-zinc-500 font-medium">Application Version</span>
            <span className="font-semibold text-zinc-200">{APP_VERSION}</span>
          </div>
          <div className="flex flex-col gap-1 border-b border-zinc-900 pb-2">
            <span className="text-zinc-500 font-medium">Data Storage File</span>
            <span className="font-semibold text-zinc-200 break-all text-xs">{data.settings.dataPath ?? storage?.data_file ?? "Unknown"}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-zinc-500 font-medium">Assets Directory</span>
            <span className="font-semibold text-zinc-200 break-all text-xs">{data.settings.assetsPath ?? storage?.assets_dir ?? "Unknown"}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5 pt-2">
          <SecondaryButton onClick={() => storage?.data_dir && void openFolder(storage.data_dir)}>Open Data Directory</SecondaryButton>
          <SecondaryButton onClick={() => storage?.assets_dir && void openFolder(storage.assets_dir)}>Open Assets Folder</SecondaryButton>
          <Button onClick={async () => setLocalMessage(`Backup created at: ${await createBackup()}`)}>Create Snapshot Backup</Button>
        </div>
      </section>

      {/* Appearance Section */}
      <section className="glass-panel glow-card rounded-2xl border border-zinc-800/80 p-5 shadow-lg space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          <span>Interface Appearance</span>
        </h2>
        <div className="max-w-xs">
          <Field label="Selected Theme Mode">
            <Select value={data.settings.theme} onChange={(event) => void setTheme(event.target.value as ThemeMode)}>
              <option value="dark">Premium Dark</option>
              <option value="light">Premium Light</option>
              <option value="system">Follow System Defaults</option>
            </Select>
          </Field>
        </div>
      </section>

      {/* Database/Sync Section */}
      <section className="glass-panel glow-card rounded-2xl border border-zinc-800/80 p-5 shadow-lg space-y-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
          <Server className="h-4 w-4" />
          <span>Cloud Database Sync Setup</span>
        </h2>
        
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-start gap-4 lg:flex-row lg:items-end">
            <div className="w-full max-w-xs">
              <Field label="Database Storage Mode">
                <Select
                  value={syncState.databaseMode}
                  onChange={(event) => updateSyncField("databaseMode", event.target.value as SyncState["databaseMode"])}
                >
                  <option value="offline">Offline (Local disk only)</option>
                  <option value="online">Online (Google Sheets Sync)</option>
                </Select>
              </Field>
            </div>
            
            <div className="flex flex-wrap gap-2.5">
              {isOnline ? (
                <>
                  <Button onClick={() => void saveOnline()} disabled={Boolean(syncBusy)}>
                    {syncBusy === "save" ? "Uploading Snapshot..." : "Save Online"}
                  </Button>
                  <SecondaryButton onClick={() => void updateFromOnline()} disabled={Boolean(syncBusy)}>
                    {syncBusy === "update" ? "Downloading Updates..." : "Update From Online"}
                  </SecondaryButton>
                  <SecondaryButton onClick={() => void testConnection()} disabled={Boolean(syncBusy)}>
                    {syncBusy === "test" ? "Testing Link..." : "Test Link"}
                  </SecondaryButton>
                </>
              ) : null}
              <SecondaryButton
                onClick={() => void persistSyncState().then(() => setLocalMessage("Sync settings saved successfully."))}
                disabled={Boolean(syncBusy)}
              >
                Save Sync Config
              </SecondaryButton>
            </div>
          </div>

          {/* Sync Stats Grid */}
          <div className="grid gap-3.5 rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4 text-xs sm:grid-cols-2 md:grid-cols-4">
            <div className="space-y-1">
              <p className="font-bold text-zinc-500 uppercase tracking-wider text-[10px]">Last Remote Revision</p>
              <p className="text-zinc-200 text-sm font-semibold">{syncState.lastRevision}</p>
            </div>
            <div className="space-y-1">
              <p className="font-bold text-zinc-500 uppercase tracking-wider text-[10px]">Last Remote Update</p>
              <p className="text-zinc-200 text-sm font-semibold">{formatLastUpdatedAgo(syncState.lastRemoteUpdatedAt)}</p>
              <p className="text-[10px] text-zinc-500 font-medium">{formatExactSyncTimestamp(syncState.lastRemoteUpdatedAt)}</p>
            </div>
            <div className="space-y-1">
              <p className="font-bold text-zinc-500 uppercase tracking-wider text-[10px]">Last Local Sync</p>
              <p className="text-zinc-200 text-sm font-semibold">{formatLastUpdatedAgo(syncState.lastSyncAt)}</p>
              <p className="text-[10px] text-zinc-500 font-medium">{formatExactSyncTimestamp(syncState.lastSyncAt)}</p>
            </div>
            <div className="space-y-1">
              <p className="font-bold text-zinc-500 uppercase tracking-wider text-[10px]">Connection Status</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    syncState.lastSyncStatus === "success"
                      ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                      : syncState.lastSyncStatus === "error"
                      ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
                      : syncState.lastSyncStatus === "conflict"
                      ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                      : "bg-zinc-500"
                  }`}
                />
                <span className="text-zinc-200 text-sm font-semibold capitalize">{syncState.lastSyncStatus ?? "idle"}</span>
              </div>
            </div>
          </div>

          {!isOnline ? (
            <p className="text-xs text-zinc-500 italic mt-1">
              Offline mode stores all items, recipe plans, and stock quantities safely inside your local Tauri sandbox without making any remote network calls.
            </p>
          ) : (
            <p className="text-xs text-zinc-500 italic mt-1">
              Online DB sync stores small item images in Google Sheets text chunks. Each synced image must be 1 MB or smaller.
            </p>
          )}
        </div>

        {/* Sync Input Config Fields */}
        {isOnline ? (
          <div className="grid gap-4 md:grid-cols-2 border-t border-zinc-800/60 pt-5">
            <Field label="Display Name (Changelog Label)">
              <Input
                value={syncState.displayName}
                onChange={(event) => updateSyncField("displayName", event.target.value)}
                placeholder="e.g. Workstation PC"
              />
            </Field>
            <Field label="Target Google Sheet URL">
              <Input
                value={syncState.googleSheetUrl}
                onChange={(event) => updateSyncField("googleSheetUrl", event.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/.../edit"
              />
            </Field>
            <Field label="Apps Script Web App Endpoint URL">
              <Input
                value={syncState.webAppUrl}
                onChange={(event) => updateSyncField("webAppUrl", event.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
              />
            </Field>
            <Field label="Workspace Private Secret Key" hint="Used locally to encrypt sheet payloads. Keep secure.">
              <Input
                type="password"
                value={syncState.workspacePrivateKey}
                onChange={(event) => updateSyncField("workspacePrivateKey", event.target.value)}
                placeholder="Apps Script deployment key"
              />
            </Field>
          </div>
        ) : null}

        {syncMessage && isOnline ? (
          <div
            className={`rounded-lg border px-4 py-3 text-sm font-medium ${
              syncState.lastSyncStatus === "error" || syncState.lastSyncStatus === "conflict"
                ? "border-rose-500/20 bg-rose-950/20 text-rose-300"
                : "border-emerald-500/20 bg-emerald-950/20 text-emerald-300"
            }`}
          >
            {syncMessage}
          </div>
        ) : null}
      </section>

      {/* Dangerous/Data actions */}
      <section className="glass-panel glow-card rounded-2xl border border-zinc-800/80 p-5 shadow-lg space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
          <Shield className="h-4 w-4" />
          <span>System Maintenance Actions</span>
        </h2>
        <div className="flex flex-wrap gap-2.5">
          <Button onClick={() => void loadSample()}>Populate Sample Datasets</Button>
          <SecondaryButton onClick={() => void clearSample()}>Wipe Sample Datasets</SecondaryButton>
          <DangerButton onClick={() => void reset()}>Factory Reset Catalog</DangerButton>
        </div>
      </section>

      {localMessage ? (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/20 px-4 py-3 text-center text-sm font-semibold text-emerald-400">
          {localMessage}
        </div>
      ) : null}
    </div>
  );
}
