# CraftPlan

CraftPlan is a portable Windows app for planning crafting recipes, tracking inventory, and calculating missing materials.

It is made for people who want a simple planner they can move between folders or computers. It does not require an account, a server, or an install process to use offline.

## What You Can Do

- Create your own items.
- Add recipes for those items.
- Track how many materials you already have.
- Calculate what you still need to craft something.
- Use item images or emoji.
- Import and export your data.
- Create backups before risky changes.
- Keep everything offline by default.
- Optionally sync through your own Google Sheet and Apps Script Web App.

CraftPlan is not tied to one game. You decide the item names, recipe names, quantities, images, and notes.

## Download And Run

1. Download the portable ZIP from the GitHub Release page.
2. Extract the ZIP to a normal writable folder, such as:

   ```text
   C:\Users\YourName\Documents\CraftPlan
   ```

3. Open `CraftPlan.exe`.

Keep `CraftPlan.exe` and `CraftPlanData` together. That folder is where your planner data, images, backups, and exports are stored.

## Portable Folder Layout

After running the app, the folder looks like this:

```text
CraftPlan.exe
CraftPlanData/
  data.json
  sync-state.json
  assets/
    items/
    thumbnails/
  backups/
  exports/
```

You can move the whole folder to another Windows computer. Your data moves with it.

## Where Your Data Is Stored

CraftPlan stores your main data in:

```text
CraftPlanData/data.json
```

Images are copied into:

```text
CraftPlanData/assets/items/
```

Backups are stored in:

```text
CraftPlanData/backups/
```

Exports are stored in:

```text
CraftPlanData/exports/
```

## Privacy

Offline DB mode is the default.

In Offline DB mode:

- CraftPlan uses only local files.
- No network request is made.
- No account login is required.
- Your data stays in the `CraftPlanData` folder.

In Online DB mode:

- CraftPlan sends your planner data to the Apps Script Web App URL that you enter.
- CraftPlan does not use Google OAuth login.
- CraftPlan does not use Google service-account credentials.
- The Workspace Private Key is an app-level shared secret for your Apps Script Web App.
- For this version, the Workspace Private Key is saved locally in `CraftPlanData/sync-state.json`.

Do not share your `CraftPlanData` folder if it contains private data.

## Database Modes

Open `Settings > Database / Sync` to choose the database mode.

### Offline DB

Use this if you want a simple local planner.

- This is the default mode.
- It uses `CraftPlanData/data.json`.
- It works without internet.
- It does not sync automatically.

### Online DB

Use this if you want to manually sync through your own Google Sheet.

You need:

- Google Sheet URL
- Apps Script Web App URL
- Workspace Private Key
- Display Name

Buttons:

- `Test Connection` checks that the URLs and private key work.
- `Save` uploads your current local CraftPlan data to the online database.
- `Update` downloads online data and replaces local data after making a backup.
- `Save Settings` saves your sync settings without uploading or downloading data.

CraftPlan does not auto-upload or auto-download in this version.

### Create The Apps Script Web App

Online DB mode needs a Google Sheet and a Google Apps Script Web App that stores CraftPlan snapshots in that sheet.

1. Create a new Google Sheet, or open the Google Sheet you want to use.
2. Copy the full Google Sheet URL from your browser address bar. You will paste this into CraftPlan as `Google Sheet URL`.
3. In the Google Sheet, open `Extensions > Apps Script`.
4. Delete any starter code in the Apps Script editor.
5. Copy everything from:

   ```text
   docs/apps-script/CraftPlanSync.gs
   ```

6. Paste it into the Apps Script editor.
7. Change this line to a long private value that only your CraftPlan devices know:

   ```javascript
   const WORKSPACE_PRIVATE_KEY = "change-this-private-key";
   ```

8. Click `Save project`.
9. Click `Deploy > New deployment`.
10. Select `Web app`.
11. Set:

   ```text
   Execute as: Me
   Who has access: Anyone with the link
   ```

12. Click `Deploy`, approve the requested Google permissions, then copy the Web App URL.
13. In CraftPlan, open `Settings > Database / Sync` and enter:

   ```text
   Database Mode: Online
   Google Sheet URL: your Google Sheet URL
   Apps Script Web App Endpoint URL: your Web App URL
   Workspace Private Key: the same value from WORKSPACE_PRIVATE_KEY
   Display Name: a name for this device/user
   ```

14. Click `Test Link`. If it succeeds, click `Save Online` to upload your current local data as the first online snapshot.

Keep the Workspace Private Key private. Anyone with the Web App URL and that key can read or replace the CraftPlan data stored in the connected Google Sheet.

## Backups

CraftPlan creates backups before destructive actions such as replacing data from online sync or importing a full package.

Backups are saved in:

```text
CraftPlanData/backups/
```

If something goes wrong, you can restore from a backup JSON file.

## Import And Export

Use `Import / Export` inside the app.

JSON export:

- Includes items, recipes, inventory, and settings.
- Does not include image files.

Full package export:

- Includes `data.json`.
- Includes item image files.
- Best choice when moving everything to another computer.

## Troubleshooting

### The app cannot save data

Move the app folder to a writable location, such as Documents or Desktop.

Avoid running the app from protected folders like:

```text
C:\Program Files
C:\Windows
```

### Images are missing

Use a full package export/import when moving data with images. A plain JSON export does not include image files.

### Online sync says there is a conflict

That means the online data changed before your app uploaded new data.

Press `Update` first, review the latest data, then press `Save` again if needed.

### Online database is empty

Press `Save` to upload your current local data as the first online snapshot.

## Version

Current version: `1.0.0`

CraftPlan does not include an automatic update system in this version. Download a newer release manually when you want to update.

## For Maintainers

Build commands:

```bash
npm install
npm test
npm run build
npm run tauri:build
```

Release automation is in:

```text
.github/workflows/release.yml
```

The release workflow builds the Windows app, creates a portable ZIP, uploads it to Hugging Face, and creates a GitHub Release with a Hugging Face download link.
