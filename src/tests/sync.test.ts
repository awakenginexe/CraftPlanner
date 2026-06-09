import { describe, expect, test } from "vitest";
import {
  canRunOnlineAction,
  createDefaultSyncState,
  formatExactSyncTimestamp,
  formatLastUpdatedAgo,
  parseSyncResponse,
  redactWorkspacePrivateKey,
  syncErrorMessage,
  validateSyncConfig
} from "../domain/sync";

describe("sync helpers", () => {
  test("database mode defaults to offline", () => {
    expect(createDefaultSyncState("device-1")).toMatchObject({
      databaseMode: "offline",
      provider: "apps-script",
      deviceId: "device-1",
      lastRevision: 0,
      lastSyncAt: null,
      lastRemoteUpdatedAt: null
    });
  });

  test("offline mode does not require online fields", () => {
    const result = validateSyncConfig(createDefaultSyncState("device-1"));
    expect(result.ok).toBe(true);
  });

  test("online mode validates required urls and private key", () => {
    const result = validateSyncConfig({
      ...createDefaultSyncState("device-1"),
      databaseMode: "online",
      googleSheetUrl: "https://example.com/not-a-sheet",
      webAppUrl: "https://example.com/not-apps-script",
      workspacePrivateKey: ""
    });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("Enter a valid Google Sheet URL.");
    expect(result.errors).toContain("Enter a valid Apps Script Web App URL.");
    expect(result.errors).toContain("Enter a Workspace Private Key.");
  });

  test("online action is blocked in offline mode", () => {
    expect(canRunOnlineAction(createDefaultSyncState("device-1"))).toBe(false);
  });

  test("online action is allowed for valid online config", () => {
    expect(
      canRunOnlineAction({
        ...createDefaultSyncState("device-1"),
        databaseMode: "online",
        googleSheetUrl: "https://docs.google.com/spreadsheets/d/abc123/edit?usp=sharing",
        webAppUrl: "https://script.google.com/macros/s/abc123/exec",
        workspacePrivateKey: "secret"
      })
    ).toBe(true);
  });

  test("redacts workspace private key in nested data", () => {
    expect(
      redactWorkspacePrivateKey({
        workspacePrivateKey: "secret",
        nested: { workspacePrivateKey: "secret-2" },
        message: "keep"
      })
    ).toEqual({
      workspacePrivateKey: "[redacted]",
      nested: { workspacePrivateKey: "[redacted]" },
      message: "keep"
    });
  });

  test("parses successful Apps Script response", () => {
    expect(parseSyncResponse({ ok: true, revision: 3, serverTime: "2026-06-09T12:00:00.000Z" })).toEqual({
      ok: true,
      revision: 3,
      serverTime: "2026-06-09T12:00:00.000Z"
    });
  });

  test("rejects malformed Apps Script response", () => {
    expect(parseSyncResponse({ ok: true, revision: "3" })).toEqual({
      ok: false,
      errorCode: "invalid-response",
      message: "Apps Script returned an invalid response."
    });
  });

  test("maps revision conflict to friendly message", () => {
    expect(syncErrorMessage({ ok: false, errorCode: "conflict", message: "old revision" })).toBe(
      "Online data changed since your last update. Press Update first, review the latest data, then Save again if needed."
    );
  });

  test("formats last updated age", () => {
    const now = new Date("2026-06-09T12:00:00.000Z");
    expect(formatLastUpdatedAgo(null, now)).toBe("Never updated");
    expect(formatLastUpdatedAgo("2026-06-09T11:59:40.000Z", now)).toBe("Updated just now");
    expect(formatLastUpdatedAgo("2026-06-09T11:58:00.000Z", now)).toBe("Updated 2 minutes ago");
    expect(formatLastUpdatedAgo("2026-06-09T11:00:00.000Z", now)).toBe("Updated 1 hour ago");
    expect(formatLastUpdatedAgo("2026-06-08T12:00:00.000Z", now)).toBe("Updated yesterday");
  });

  test("formats exact sync timestamp", () => {
    expect(formatExactSyncTimestamp(null)).toBe("No timestamp");
    expect(formatExactSyncTimestamp("bad")).toBe("No timestamp");
    expect(formatExactSyncTimestamp("2026-06-10T07:05:22.000Z")).toBe("2026-06-10 07:05:22");
  });
});
