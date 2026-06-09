/**
 * CraftPlanner Google Sheets Sync Web App
 *
 * Setup:
 * 1. Create or open a Google Sheet.
 * 2. Open Extensions > Apps Script.
 * 3. Paste this whole file.
 * 4. Set WORKSPACE_PRIVATE_KEY to a long shared secret.
 * 5. Deploy > New deployment > Web app.
 * 6. Execute as: Me. Who has access: Anyone with the link.
 * 7. Copy the Web App URL into CraftPlanner Settings > Database / Sync.
 */

const WORKSPACE_PRIVATE_KEY = "change-this-private-key";
const META_SHEET = "cp_meta";
const DATA_CHUNKS_SHEET = "cp_data_chunks";
const HISTORY_SHEET = "cp_history";
const ASSETS_SHEET = "cp_assets";
const ASSET_CHUNKS_SHEET = "cp_asset_chunks";
const CHUNK_SIZE = 45000;
const MAX_ASSET_BYTES = 1024 * 1024;

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
    if (request.action === "listAssets") return handleListAssets(spreadsheet);
    if (request.action === "pushAsset") return handlePushAsset(spreadsheet, request);
    if (request.action === "pullAsset") return handlePullAsset(spreadsheet, request);

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
  const assets = spreadsheet.getSheetByName(ASSETS_SHEET) || spreadsheet.insertSheet(ASSETS_SHEET);
  const assetChunks = spreadsheet.getSheetByName(ASSET_CHUNKS_SHEET) || spreadsheet.insertSheet(ASSET_CHUNKS_SHEET);

  if (meta.getLastRow() === 0) meta.getRange(1, 1, 1, 2).setValues([["key", "value"]]);
  if (chunks.getLastRow() === 0) chunks.getRange(1, 1, 1, 3).setValues([["revision", "chunk_index", "chunk_text"]]);
  if (history.getLastRow() === 0) history.getRange(1, 1, 1, 5).setValues([["revision", "saved_at", "device_id", "display_name", "summary"]]);
  if (assets.getLastRow() === 0) assets.getRange(1, 1, 1, 7).setValues([["relative_path", "sha256", "mime_type", "size_bytes", "chunk_count", "updated_at", "revision"]]);
  if (assetChunks.getLastRow() === 0) assetChunks.getRange(1, 1, 1, 3).setValues([["relative_path", "chunk_index", "chunk_text"]]);

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
    assetManifest: listAssetManifest(spreadsheet),
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

function handleListAssets(spreadsheet) {
  return jsonResponse({
    ok: true,
    revision: Number(getMeta(spreadsheet, "revision") || "0"),
    serverTime: new Date().toISOString(),
    remoteUpdatedAt: getMeta(spreadsheet, "updated_at") || null,
    assetManifest: listAssetManifest(spreadsheet)
  });
}

function handlePushAsset(spreadsheet, request) {
  const asset = request.asset || {};
  validateAssetPath(asset.relativePath);
  if (!asset.sha256 || !asset.mimeType || typeof asset.base64 !== "string") {
    return jsonResponse({ ok: false, errorCode: "invalid-asset", message: "pushAsset requires relativePath, sha256, mimeType, and base64." });
  }
  const decoded = Utilities.base64Decode(asset.base64);
  if (decoded.length > MAX_ASSET_BYTES) {
    return jsonResponse({ ok: false, errorCode: "asset-too-large", message: asset.relativePath + " is larger than the 1 MB Online DB image sync limit." });
  }

  const chunks = [];
  for (let index = 0; index < asset.base64.length; index += CHUNK_SIZE) {
    chunks.push([asset.relativePath, chunks.length, asset.base64.slice(index, index + CHUNK_SIZE)]);
  }

  replaceRowsByFirstColumn(spreadsheet.getSheetByName(ASSET_CHUNKS_SHEET), asset.relativePath, [["relative_path", "chunk_index", "chunk_text"]]);
  if (chunks.length) {
    const chunkSheet = spreadsheet.getSheetByName(ASSET_CHUNKS_SHEET);
    chunkSheet.getRange(chunkSheet.getLastRow() + 1, 1, chunks.length, 3).setValues(chunks);
  }

  const revision = Number(getMeta(spreadsheet, "revision") || "0");
  const updatedAt = new Date().toISOString();
  upsertAssetMeta(spreadsheet, [
    asset.relativePath,
    asset.sha256,
    asset.mimeType,
    decoded.length,
    chunks.length,
    updatedAt,
    revision
  ]);

  return jsonResponse({
    ok: true,
    revision,
    serverTime: updatedAt,
    remoteUpdatedAt: getMeta(spreadsheet, "updated_at") || updatedAt,
    assetManifest: listAssetManifest(spreadsheet),
    message: "Asset saved."
  });
}

function handlePullAsset(spreadsheet, request) {
  validateAssetPath(request.relativePath);
  const meta = findAssetMeta(spreadsheet, request.relativePath);
  if (!meta) {
    return jsonResponse({ ok: false, errorCode: "asset-not-found", message: "Image asset was not found in the online database." });
  }
  const sheet = spreadsheet.getSheetByName(ASSET_CHUNKS_SHEET);
  const base64 = sheet.getDataRange().getValues().slice(1)
    .filter(row => row[0] === request.relativePath)
    .sort((a, b) => Number(a[1]) - Number(b[1]))
    .map(row => String(row[2] || ""))
    .join("");

  return jsonResponse({
    ok: true,
    revision: Number(getMeta(spreadsheet, "revision") || "0"),
    serverTime: new Date().toISOString(),
    remoteUpdatedAt: getMeta(spreadsheet, "updated_at") || null,
    asset: {
      relativePath: meta.relativePath,
      sha256: meta.sha256,
      mimeType: meta.mimeType,
      sizeBytes: meta.sizeBytes,
      updatedAt: meta.updatedAt,
      revision: meta.revision,
      base64
    },
    message: "Asset loaded."
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

function listAssetManifest(spreadsheet) {
  const sheet = spreadsheet.getSheetByName(ASSETS_SHEET);
  return sheet.getDataRange().getValues().slice(1)
    .filter(row => row[0])
    .map(row => ({
      relativePath: String(row[0] || ""),
      sha256: String(row[1] || ""),
      mimeType: String(row[2] || ""),
      sizeBytes: Number(row[3] || 0),
      updatedAt: row[5] ? String(row[5]) : undefined,
      revision: Number(row[6] || 0)
    }));
}

function findAssetMeta(spreadsheet, relativePath) {
  return listAssetManifest(spreadsheet).find(asset => asset.relativePath === relativePath) || null;
}

function upsertAssetMeta(spreadsheet, row) {
  const sheet = spreadsheet.getSheetByName(ASSETS_SHEET);
  const values = sheet.getDataRange().getValues();
  for (let index = 1; index < values.length; index += 1) {
    if (values[index][0] === row[0]) {
      sheet.getRange(index + 1, 1, 1, row.length).setValues([row]);
      return;
    }
  }
  sheet.appendRow(row);
}

function replaceRowsByFirstColumn(sheet, firstColumnValue, headerRows) {
  const values = sheet.getDataRange().getValues();
  const kept = values.slice(1).filter(row => row[0] !== firstColumnValue);
  sheet.clearContents();
  sheet.getRange(1, 1, headerRows.length, headerRows[0].length).setValues(headerRows);
  if (kept.length) sheet.getRange(2, 1, kept.length, kept[0].length).setValues(kept);
}

function validateAssetPath(relativePath) {
  if (!relativePath || !/^assets\/items\/[^<>:"|?*]+$/i.test(relativePath) || relativePath.indexOf("..") !== -1) {
    throw new Error("Asset path is not valid for Online DB sync.");
  }
  if (!/\.(png|jpg|jpeg|webp)$/i.test(relativePath)) {
    throw new Error("Online DB image sync supports PNG, JPG, JPEG, and WEBP assets.");
  }
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
// Asset sync stores small item images as base64 chunks in cp_asset_chunks.
// Keep images below 1 MB for reliable free Google Sheets sync.
