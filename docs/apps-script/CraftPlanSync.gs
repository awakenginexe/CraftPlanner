/**
 * CraftPlan Google Sheets Sync Web App
 *
 * Setup:
 * 1. Create or open a Google Sheet.
 * 2. Open Extensions > Apps Script.
 * 3. Paste this whole file.
 * 4. Set WORKSPACE_PRIVATE_KEY to a long shared secret.
 * 5. Deploy > New deployment > Web app.
 * 6. Execute as: Me. Who has access: Anyone with the link.
 * 7. Copy the Web App URL into CraftPlan Settings > Database / Sync.
 */

const WORKSPACE_PRIVATE_KEY = "change-this-private-key";
const META_SHEET = "cp_meta";
const DATA_CHUNKS_SHEET = "cp_data_chunks";
const HISTORY_SHEET = "cp_history";
const CHUNK_SIZE = 45000;

function doPost(e) {
  try {
    const request = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    if (request.workspacePrivateKey !== WORKSPACE_PRIVATE_KEY) {
      return jsonResponse({ ok: false, errorCode: "unauthorized", message: "Invalid Workspace Private Key." });
    }

    const spreadsheet = openSpreadsheet(request.googleSheetUrl);
    ensureSheets(spreadsheet);

    if (request.action === "ping") return handlePing(spreadsheet);
    if (request.action === "pull") return handlePull(spreadsheet);
    if (request.action === "pushSnapshot") return handlePushSnapshot(spreadsheet, request);

    return jsonResponse({ ok: false, errorCode: "unknown-action", message: "Unknown sync action." });
  } catch (error) {
    return jsonResponse({ ok: false, errorCode: "server-error", message: String(error && error.message ? error.message : error) });
  }
}

function openSpreadsheet(googleSheetUrl) {
  if (!googleSheetUrl || !/^https:\/\/docs\.google\.com\/spreadsheets\/d\/[^/]+/.test(googleSheetUrl)) {
    throw new Error("Enter a valid Google Sheet URL.");
  }
  return SpreadsheetApp.openByUrl(googleSheetUrl);
}

function ensureSheets(spreadsheet) {
  const meta = spreadsheet.getSheetByName(META_SHEET) || spreadsheet.insertSheet(META_SHEET);
  const chunks = spreadsheet.getSheetByName(DATA_CHUNKS_SHEET) || spreadsheet.insertSheet(DATA_CHUNKS_SHEET);
  const history = spreadsheet.getSheetByName(HISTORY_SHEET) || spreadsheet.insertSheet(HISTORY_SHEET);

  if (meta.getLastRow() === 0) meta.getRange(1, 1, 1, 2).setValues([["key", "value"]]);
  if (chunks.getLastRow() === 0) chunks.getRange(1, 1, 1, 3).setValues([["revision", "chunk_index", "chunk_text"]]);
  if (history.getLastRow() === 0) history.getRange(1, 1, 1, 5).setValues([["revision", "saved_at", "device_id", "display_name", "summary"]]);

  if (!getMeta(spreadsheet, "revision")) setMeta(spreadsheet, "revision", "0");
}

function handlePing(spreadsheet) {
  const revision = Number(getMeta(spreadsheet, "revision") || "0");
  const updatedAt = getMeta(spreadsheet, "updated_at") || null;
  return jsonResponse({
    ok: true,
    revision,
    serverTime: new Date().toISOString(),
    remoteUpdatedAt: updatedAt,
    message: revision > 0 ? "Connection successful." : "Connection successful. Online database is empty."
  });
}

function handlePull(spreadsheet) {
  const revision = Number(getMeta(spreadsheet, "revision") || "0");
  const updatedAt = getMeta(spreadsheet, "updated_at") || null;
  const data = revision > 0 ? readSnapshot(spreadsheet, revision) : null;
  return jsonResponse({
    ok: true,
    revision,
    serverTime: new Date().toISOString(),
    remoteUpdatedAt: updatedAt,
    data,
    message: data ? "Remote data loaded." : "Online database is empty."
  });
}

function handlePushSnapshot(spreadsheet, request) {
  const currentRevision = Number(getMeta(spreadsheet, "revision") || "0");
  const baseRevision = Number(request.baseRevision || 0);
  if (baseRevision < currentRevision) {
    return jsonResponse({ ok: false, errorCode: "conflict", message: "Remote data changed before this client pushed." });
  }
  if (!request.data || typeof request.data !== "object") {
    return jsonResponse({ ok: false, errorCode: "invalid-data", message: "pushSnapshot requires a data object." });
  }

  const nextRevision = currentRevision + 1;
  const savedAt = new Date().toISOString();
  writeSnapshot(spreadsheet, nextRevision, request.data);
  setMeta(spreadsheet, "revision", String(nextRevision));
  setMeta(spreadsheet, "updated_at", savedAt);
  setMeta(spreadsheet, "updated_by_device", request.deviceId || "");
  setMeta(spreadsheet, "updated_by_display_name", request.displayName || "");

  const history = spreadsheet.getSheetByName(HISTORY_SHEET);
  history.appendRow([
    nextRevision,
    savedAt,
    request.deviceId || "",
    request.displayName || "",
    JSON.stringify({
      items: Array.isArray(request.data.items) ? request.data.items.length : 0,
      recipes: Array.isArray(request.data.recipes) ? request.data.recipes.length : 0,
      assets: Array.isArray(request.assetManifest) ? request.assetManifest.length : 0
    })
  ]);

  return jsonResponse({
    ok: true,
    revision: nextRevision,
    serverTime: savedAt,
    remoteUpdatedAt: savedAt,
    message: "Snapshot saved."
  });
}

function readSnapshot(spreadsheet, revision) {
  const sheet = spreadsheet.getSheetByName(DATA_CHUNKS_SHEET);
  const values = sheet.getDataRange().getValues().slice(1);
  const text = values
    .filter(row => Number(row[0]) === revision)
    .sort((a, b) => Number(a[1]) - Number(b[1]))
    .map(row => String(row[2] || ""))
    .join("");
  return text ? JSON.parse(text) : null;
}

function writeSnapshot(spreadsheet, revision, data) {
  const sheet = spreadsheet.getSheetByName(DATA_CHUNKS_SHEET);
  const json = JSON.stringify(data);
  const rows = [];
  for (let index = 0; index < json.length; index += CHUNK_SIZE) {
    rows.push([revision, rows.length, json.slice(index, index + CHUNK_SIZE)]);
  }
  if (rows.length) sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 3).setValues(rows);
}

function getMeta(spreadsheet, key) {
  const sheet = spreadsheet.getSheetByName(META_SHEET);
  const values = sheet.getDataRange().getValues();
  for (let index = 1; index < values.length; index += 1) {
    if (values[index][0] === key) return values[index][1];
  }
  return "";
}

function setMeta(spreadsheet, key, value) {
  const sheet = spreadsheet.getSheetByName(META_SHEET);
  const values = sheet.getDataRange().getValues();
  for (let index = 1; index < values.length; index += 1) {
    if (values[index][0] === key) {
      sheet.getRange(index + 1, 2).setValue(value);
      return;
    }
  }
  sheet.appendRow([key, value]);
}

function jsonResponse(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

// Future protocol placeholders:
// - pushAsset: upload one binary asset or chunk.
// - pullAsset: download one binary asset by relative path and hash.
// - listAssets: compare remote asset metadata with CraftPlan's local manifest.
