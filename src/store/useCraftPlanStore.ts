import { create } from "zustand";
import { createDefaultData, APP_VERSION } from "../domain/defaultData";
import type { AppStatus, CraftPlanData, Item, Recipe, ThemeMode } from "../domain/types";
import {
  initStorage,
  readDataFile,
  saveDataFile,
  readSyncState,
  writeSyncState,
  callAppsScript,
  generateAssetManifest,
  replaceDataFromOnline,
  createBackup,
  type StorageInfo
} from "../tauri/api";
import {
  createDefaultSyncState,
  canRunOnlineAction,
  validateSyncConfig,
  parseSyncResponse,
  syncErrorMessage,
  type SyncState
} from "../domain/sync";

type CraftPlanState = {
  status: AppStatus;
  storage?: StorageInfo;
  data: CraftPlanData;
  activeScreen: string;

  // Sync state
  syncState: SyncState;
  syncBusy: "save" | "update" | "test" | "";
  syncMessage: string;

  initialize: () => Promise<void>;
  retryStorage: () => Promise<void>;
  reloadData: () => Promise<void>;
  setActiveScreen: (screen: string) => void;
  saveData: (next: CraftPlanData) => Promise<void>;
  upsertItem: (item: Item) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  upsertRecipe: (recipe: Recipe) => Promise<void>;
  deleteRecipe: (recipeId: string) => Promise<void>;
  setInventoryQuantity: (itemId: string, quantity: number) => Promise<void>;
  setTheme: (theme: ThemeMode) => Promise<void>;

  // Sync actions
  updateSyncField: <K extends keyof SyncState>(key: K, value: SyncState[K]) => void;
  persistSyncState: (next?: SyncState) => Promise<void>;
  testConnection: () => Promise<void>;
  saveOnline: () => Promise<void>;
  updateFromOnline: () => Promise<void>;
  clearSyncMessage: () => void;
};

function withUpdatedAt(data: CraftPlanData, storage?: StorageInfo): CraftPlanData {
  return {
    ...data,
    settings: {
      ...data.settings,
      dataPath: storage?.data_file ?? data.settings.dataPath,
      assetsPath: storage?.assets_dir ?? data.settings.assetsPath
    },
    updatedAt: new Date().toISOString()
  };
}

export const useCraftPlanStore = create<CraftPlanState>((set, get) => ({
  status: { kind: "loading" },
  data: createDefaultData(),
  activeScreen: "dashboard",

  // Sync initial state
  syncState: createDefaultSyncState(),
  syncBusy: "",
  syncMessage: "",

  initialize: async () => {
    set({ status: { kind: "loading" } });
    try {
      const storage = await initStorage();
      const raw = await readDataFile();
      const data = raw ? (JSON.parse(raw) as CraftPlanData) : createDefaultData();
      const readyData = withUpdatedAt(data, storage);
      if (!raw) await saveDataFile(JSON.stringify(readyData, null, 2));

      // Read sync state from tauri
      let syncState = createDefaultSyncState();
      try {
        syncState = await readSyncState();
      } catch (e) {
        console.error("Could not read sync state:", e);
      }

      set({ storage, data: readyData, syncState, status: { kind: "ready" } });
    } catch (error) {
      const storageError = error as { path?: string; message?: string };
      set({
        status: {
          kind: "permission-error",
          path: storageError.path ?? "CraftPlanData",
          message: storageError.message ?? "CraftPlan needs read/write access to CraftPlanData."
        }
      });
    }
  },

  retryStorage: async () => get().initialize(),

  reloadData: async () => {
    const raw = await readDataFile();
    if (!raw) return;
    const data = withUpdatedAt(JSON.parse(raw) as CraftPlanData, get().storage);
    set({ data });
  },

  setActiveScreen: (screen) => set({ activeScreen: screen }),

  saveData: async (next) => {
    const data = withUpdatedAt(next, get().storage);
    await saveDataFile(JSON.stringify(data, null, 2));
    set({ data });
  },

  upsertItem: async (item) => {
    const data = get().data;
    const exists = data.items.some((existing) => existing.id === item.id);
    await get().saveData({
      ...data,
      items: exists
        ? data.items.map((existing) => (existing.id === item.id ? item : existing))
        : [...data.items, item]
    });
  },

  deleteItem: async (itemId) => {
    const data = get().data;
    await get().saveData({
      ...data,
      items: data.items.filter((item) => item.id !== itemId),
      inventory: data.inventory.filter((entry) => entry.itemId !== itemId),
      recipes: data.recipes
        .filter((recipe) => recipe.outputItemId !== itemId)
        .map((recipe) => ({
          ...recipe,
          ingredients: recipe.ingredients.filter((ingredient) => ingredient.itemId !== itemId)
        }))
        .filter((recipe) => recipe.ingredients.length > 0)
    });
  },

  upsertRecipe: async (recipe) => {
    const data = get().data;
    const recipes = data.recipes.some((existing) => existing.id === recipe.id)
      ? data.recipes.map((existing) => (existing.id === recipe.id ? recipe : existing))
      : [...data.recipes, recipe];
    await get().saveData({ ...data, recipes });
  },

  deleteRecipe: async (recipeId) => {
    const data = get().data;
    await get().saveData({ ...data, recipes: data.recipes.filter((recipe) => recipe.id !== recipeId) });
  },

  setInventoryQuantity: async (itemId, quantity) => {
    const data = get().data;
    const cleanQuantity = Math.max(0, Math.floor(quantity || 0));
    const inventory = data.inventory.filter((entry) => entry.itemId !== itemId);
    if (cleanQuantity > 0) inventory.push({ itemId, quantity: cleanQuantity });
    await get().saveData({ ...data, inventory });
  },

  setTheme: async (theme) => {
    const data = get().data;
    await get().saveData({ ...data, settings: { ...data.settings, theme } });
  },

  // Sync actions implementation
  updateSyncField: (key, value) => {
    set((state) => ({
      syncState: { ...state.syncState, [key]: value }
    }));
  },

  persistSyncState: async (next) => {
    const target = next || get().syncState;
    await writeSyncState(target);
    set({ syncState: target });
  },

  testConnection: async () => {
    const syncState = get().syncState;
    set({ syncBusy: "test", syncMessage: "" });
    try {
      const validation = validateSyncConfig(syncState);
      if (!validation.ok) throw new Error(validation.errors.join(" "));
      await get().persistSyncState(syncState);

      const request = {
        action: "ping",
        workspacePrivateKey: syncState.workspacePrivateKey,
        googleSheetUrl: syncState.googleSheetUrl,
        clientVersion: APP_VERSION,
        deviceId: syncState.deviceId
      };

      const rawResponse = await callAppsScript(syncState.webAppUrl, request);
      const response = parseSyncResponse(rawResponse);
      if (!response.ok) throw new Error(syncErrorMessage(response));

      const next = {
        ...syncState,
        lastRevision: response.revision,
        lastRemoteUpdatedAt: response.remoteUpdatedAt ?? syncState.lastRemoteUpdatedAt,
        lastSyncAt: new Date().toISOString(),
        lastSyncStatus: "success" as const,
        lastMessage: response.message ?? "Connection successful."
      };
      await get().persistSyncState(next);
      set({ syncMessage: "Connection successful." });
    } catch (error) {
      const next = {
        ...syncState,
        lastSyncStatus: "error" as const,
        lastMessage: error instanceof Error ? error.message : "Connection failed."
      };
      await get().persistSyncState(next).catch(() => undefined);
      set({ syncMessage: next.lastMessage ?? "Connection failed." });
    } finally {
      set({ syncBusy: "" });
    }
  },

  saveOnline: async () => {
    const syncState = get().syncState;
    const data = get().data;
    set({ syncBusy: "save", syncMessage: "" });
    try {
      const validation = validateSyncConfig(syncState);
      if (!validation.ok) throw new Error(validation.errors.join(" "));
      await get().persistSyncState(syncState);

      const assetManifest = await generateAssetManifest();
      const request = {
        action: "pushSnapshot",
        workspacePrivateKey: syncState.workspacePrivateKey,
        googleSheetUrl: syncState.googleSheetUrl,
        clientVersion: APP_VERSION,
        deviceId: syncState.deviceId,
        displayName: syncState.displayName,
        baseRevision: syncState.lastRevision,
        data,
        assetManifest
      };

      const rawResponse = await callAppsScript(syncState.webAppUrl, request);
      const response = parseSyncResponse(rawResponse);
      if (!response.ok) throw new Error(syncErrorMessage(response));

      const next = {
        ...syncState,
        lastRevision: response.revision,
        lastSyncAt: new Date().toISOString(),
        lastRemoteUpdatedAt: response.remoteUpdatedAt ?? response.serverTime ?? new Date().toISOString(),
        lastSyncStatus: "success" as const,
        lastMessage: response.message ?? "Online data saved."
      };
      await get().persistSyncState(next);
      set({ syncMessage: "Online data saved." });
    } catch (error) {
      const text = error instanceof Error ? error.message : "Online Save failed.";
      const next = {
        ...syncState,
        lastSyncStatus: text.includes("Online data changed") ? ("conflict" as const) : ("error" as const),
        lastMessage: text
      };
      await get().persistSyncState(next).catch(() => undefined);
      set({ syncMessage: text });
    } finally {
      set({ syncBusy: "" });
    }
  },

  updateFromOnline: async () => {
    const syncState = get().syncState;
    set({ syncBusy: "update", syncMessage: "" });
    try {
      const validation = validateSyncConfig(syncState);
      if (!validation.ok) throw new Error(validation.errors.join(" "));
      await get().persistSyncState(syncState);

      const request = {
        action: "pull",
        workspacePrivateKey: syncState.workspacePrivateKey,
        googleSheetUrl: syncState.googleSheetUrl,
        clientVersion: APP_VERSION,
        deviceId: syncState.deviceId,
        sinceRevision: syncState.lastRevision
      };

      const rawResponse = await callAppsScript(syncState.webAppUrl, request);
      const response = parseSyncResponse(rawResponse);
      if (!response.ok) throw new Error(syncErrorMessage(response));

      if (!response.data) {
        set({ syncMessage: "Online database is empty. Press Save to upload local data." });
        return;
      }

      const backupPath = await replaceDataFromOnline(JSON.stringify(response.data, null, 2));
      await get().reloadData();

      const next = {
        ...syncState,
        lastRevision: response.revision,
        lastSyncAt: new Date().toISOString(),
        lastRemoteUpdatedAt: response.remoteUpdatedAt ?? response.serverTime ?? new Date().toISOString(),
        lastSyncStatus: "success" as const,
        lastMessage: `Updated from online data. Backup: ${backupPath}`
      };
      await get().persistSyncState(next);
      set({ syncMessage: "Updated from online data." });
    } catch (error) {
      const text = error instanceof Error ? error.message : "Online Update failed.";
      const next = {
        ...syncState,
        lastSyncStatus: "error" as const,
        lastMessage: text
      };
      await get().persistSyncState(next).catch(() => undefined);
      set({ syncMessage: text });
    } finally {
      set({ syncBusy: "" });
    }
  },

  clearSyncMessage: () => set({ syncMessage: "" })
}));
