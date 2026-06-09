import type { CraftPlanData } from "./types";

export type DatabaseMode = "offline" | "online";
export type SyncProvider = "apps-script";
export type SyncStatus = "idle" | "success" | "error" | "conflict";

export type SyncState = {
  databaseMode: DatabaseMode;
  provider: SyncProvider;
  googleSheetUrl: string;
  webAppUrl: string;
  workspacePrivateKey: string;
  deviceId: string;
  displayName: string;
  lastRevision: number;
  lastSyncAt: string | null;
  lastRemoteUpdatedAt: string | null;
  lastSyncStatus?: SyncStatus;
  lastMessage?: string;
};

export type ValidationResult = {
  ok: boolean;
  errors: string[];
};

export type AssetManifestEntry = {
  relativePath: string;
  sha256: string;
  mimeType: string;
  sizeBytes: number;
};

export type AppsScriptSuccessResponse = {
  ok: true;
  revision: number;
  serverTime?: string;
  remoteUpdatedAt?: string;
  data?: CraftPlanData;
  message?: string;
};

export type AppsScriptErrorResponse = {
  ok: false;
  errorCode: string;
  message: string;
};

export type AppsScriptResponse = AppsScriptSuccessResponse | AppsScriptErrorResponse;

const GOOGLE_SHEET_RE = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/[^/]+/;
const APPS_SCRIPT_RE = /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec(?:\?.*)?$/;

export function createDefaultSyncState(deviceId: string = crypto.randomUUID()): SyncState {
  return {
    databaseMode: "offline",
    provider: "apps-script",
    googleSheetUrl: "",
    webAppUrl: "",
    workspacePrivateKey: "",
    deviceId,
    displayName: "",
    lastRevision: 0,
    lastSyncAt: null,
    lastRemoteUpdatedAt: null,
    lastSyncStatus: "idle"
  };
}

export function isValidGoogleSheetUrl(url: string): boolean {
  return GOOGLE_SHEET_RE.test(url.trim());
}

export function isValidAppsScriptWebAppUrl(url: string): boolean {
  return APPS_SCRIPT_RE.test(url.trim());
}

export function validateSyncConfig(state: SyncState): ValidationResult {
  if (state.databaseMode === "offline") return { ok: true, errors: [] };

  const errors: string[] = [];
  if (!isValidGoogleSheetUrl(state.googleSheetUrl)) errors.push("Enter a valid Google Sheet URL.");
  if (!isValidAppsScriptWebAppUrl(state.webAppUrl)) errors.push("Enter a valid Apps Script Web App URL.");
  if (!state.workspacePrivateKey.trim()) errors.push("Enter a Workspace Private Key.");
  return { ok: errors.length === 0, errors };
}

export function canRunOnlineAction(state: SyncState): boolean {
  return state.databaseMode === "online" && validateSyncConfig(state).ok;
}

export function redactWorkspacePrivateKey<T>(value: T): T {
  if (Array.isArray(value)) return value.map((entry) => redactWorkspacePrivateKey(entry)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, key === "workspacePrivateKey" ? "[redacted]" : redactWorkspacePrivateKey(entry)])
    ) as T;
  }
  return value;
}

export function parseSyncResponse(value: unknown): AppsScriptResponse {
  if (!value || typeof value !== "object") {
    return { ok: false, errorCode: "invalid-response", message: "Apps Script returned an invalid response." };
  }
  const response = value as Record<string, unknown>;
  if (response.ok === true && typeof response.revision === "number") return response as AppsScriptSuccessResponse;
  if (response.ok === false && typeof response.message === "string") {
    return {
      ok: false,
      errorCode: typeof response.errorCode === "string" ? response.errorCode : "remote-error",
      message: response.message
    };
  }
  return { ok: false, errorCode: "invalid-response", message: "Apps Script returned an invalid response." };
}

export function syncErrorMessage(response: AppsScriptErrorResponse): string {
  if (response.errorCode === "conflict") {
    return "Online data changed since your last update. Press Update first, review the latest data, then Save again if needed.";
  }
  return response.message || "Online sync failed.";
}

export function formatLastUpdatedAgo(timestamp: string | null | undefined, now = new Date()): string {
  if (!timestamp) return "Never updated";
  const updatedAt = new Date(timestamp);
  if (Number.isNaN(updatedAt.getTime())) return "Never updated";
  const diffSeconds = Math.max(0, Math.floor((now.getTime() - updatedAt.getTime()) / 1000));
  if (diffSeconds < 60) return "Updated just now";
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `Updated ${diffMinutes} ${diffMinutes === 1 ? "minute" : "minutes"} ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Updated ${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Updated yesterday";
  return `Updated ${diffDays} days ago`;
}

export function formatExactSyncTimestamp(timestamp: string | null | undefined): string {
  if (!timestamp) return "No timestamp";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "No timestamp";
  return date.toISOString().slice(0, 19).replace("T", " ");
}
