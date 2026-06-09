# CraftPlan Design

Date: 2026-06-09

## Goal

Build CraftPlan, a production-ready Windows desktop application for generic custom crafting planning and inventory tracking. The app is "Excel for crafting recipes, but easier to use": users manually create items, recipes, and inventory, then calculate required and missing materials for target crafts.

CraftPlan is not tied to Minecraft or any specific game. It works fully offline, requires no login, has no backend, and has no cloud sync in the MVP.

## Delivery Target

CraftPlan will be built from scratch in this repository as a Tauri desktop app using React, TypeScript, Vite, Tailwind CSS, Zustand, and Vitest.

The final deliverable is a Windows portable app, either as a portable `.exe` or a portable app folder. No installer is required.

Expected portable structure:

```text
CraftPlan.exe
CraftPlanData/
  data.json
  assets/
    items/
    thumbnails/
  backups/
  exports/
```

## Storage Rule

CraftPlan will use only the portable `CraftPlanData` folder located beside the app executable.

On startup, the app will check that `CraftPlanData` exists and is readable and writable. If it cannot read or write there, the app will show a blocking error screen. The error will include:

- the exact `CraftPlanData` path it tried to use
- a clear explanation that CraftPlan needs read/write permission for that folder
- guidance to move the app to a writable folder or allow read/write access
- a retry button after the user fixes permissions

The app will not silently fall back to a user app data directory. Settings will show the current data path and assets path, but the intended storage location remains the portable folder beside the app.

Data writes will use a safe write strategy:

1. Write to a temporary file.
2. Validate or parse the written data when feasible.
3. Replace the original `data.json`.

## Architecture

The app has three main layers:

- React UI: screens, forms, tables, validation display, routing, and user interactions.
- Zustand store: in-memory app state, derived selectors, and calls to persistence commands.
- Tauri command layer: desktop file operations, native file pickers, asset copying, backup creation, folder opening, JSON import/export, and ZIP package import/export.

The calculation engine will be a standalone TypeScript module with no React dependency. It will be deterministic and tested with Vitest.

## UI Structure

CraftPlan will use a Sidebar Workbench layout. The left sidebar contains:

- Dashboard
- Items
- Recipes
- Inventory
- Calculator
- Import / Export
- Settings

The main content area will be compact and tool-focused. Tables are preferred for repeated data. Add/edit forms will use modals or side panels. The app will support dark mode and light mode, with dark mode preferred.

## Screens

### Dashboard

The Dashboard shows:

- total items
- total recipes
- number of items with inventory quantity greater than 0
- quick actions for Add Item, Add Recipe, Inventory, Calculator, Import / Export, and Settings
- a getting-started guide when the app is empty

### Items

Users can add, edit, delete, search, and filter items. Item rows show an emoji, thumbnail, or placeholder icon, plus name, category, inventory quantity where useful, and whether the item is used in recipes.

Item validation:

- name is required
- names are trimmed
- duplicate names show a warning
- deleting an item used in recipes requires confirmation
- deleting an item also removes its inventory entry after confirmation

Item image support:

- no image
- emoji
- uploaded PNG, JPG, JPEG, or WEBP image

Uploaded files are copied into `CraftPlanData/assets/items/`. The app stores relative paths such as `assets/items/iron-sword.png` in `data.json`. It never depends on the original absolute file path. Thumbnail generation into `assets/thumbnails/` is a stretch improvement for the MVP. The app is acceptable without generated thumbnails as long as it safely displays copied originals with square layout constraints and placeholder fallback.

Missing, corrupted, or unloadable image files show a placeholder and never crash the app.

### Recipes

Users can add, edit, delete, search, filter, and duplicate recipes. Recipe rows show output item info and ingredient thumbnails.

Recipe validation:

- output item is required
- output quantity must be greater than 0
- at least one ingredient is required
- each ingredient item is required
- each ingredient quantity must be greater than 0
- direct self-recipes are prevented
- circular recipe chains are detected and shown as warnings/errors without crashing

Multiple recipes for the same output item are supported. Users can mark one recipe as default. The calculator uses the default recipe unless the user selects another recipe.

### Inventory

Inventory uses a compact table with item thumbnail, item name, category, quantity, plus/minus controls, and a numeric input. Users can search items, filter by category, and filter to items with quantity greater than 0.

Quantities cannot be negative. The default behavior is integer crafting. Decimal values are not required for the MVP unless they fall out naturally from reusable numeric input handling.

### Calculator

Users can select a target item, target quantity, calculation mode, and recipe when multiple recipes exist. They can calculate and review:

- target item and quantity
- selected recipe
- direct ingredients required
- expanded material requirements
- inventory available
- materials that will be consumed
- materials missing
- craftable status
- warnings and errors

Required MVP modes:

- Direct mode: only the selected target recipe's direct ingredients.
- Expanded mode: recursively break craftable ingredients down into base materials.

Smart inventory-aware mode is strongly preferred and may be implemented after Direct and Expanded are stable. It must not delay the core MVP if it becomes too risky.

The Crafted button is enabled only when the current calculation is valid and inventory has enough consumed materials. When clicked, it subtracts consumed materials, adds crafted output quantity, saves the updated inventory, and shows confirmation.

Recipe output quantity must be handled with ceiling division. For example, if Plank x4 requires Wood Log x1, then crafting Plank x5 requires two batches, consumes Wood Log x2, produces Plank x8, and leaves Plank x3 if leftovers are tracked or shown.

### Import / Export

JSON export includes structured data:

- appVersion
- exportedAt
- items
- recipes
- inventory
- settings

JSON export warns that image files are not included.

Full package export creates a ZIP package containing `data.json`, `assets/items/`, `assets/thumbnails/`, and metadata needed to restore images on another machine.

Import supports JSON data and full project ZIP packages. Before applying an import, the app shows a preview with:

- item count
- recipe count
- inventory entry count
- whether assets are included

Import modes:

- Replace current data
- Merge with current data

Replace, reset, restore, and other destructive operations create a backup first in `CraftPlanData/backups/`.

Merge behavior must avoid silent overwrites. ID conflicts are handled safely. Item name conflicts show a warning or produce a renamed imported item.

### Settings

Settings shows:

- app version
- current data file path
- current assets folder path
- theme setting: dark, light, or system
- export JSON
- export full project package
- import JSON
- import full project package
- open data folder
- open assets folder
- create backup
- restore backup
- reset all data with confirmation
- clean unused image assets as a stretch action
- load sample data
- clear sample data as a stretch action

## Data Model

The persisted data model is versioned.

```ts
type CraftPlanData = {
  appVersion: string;
  dataVersion: number;
  items: Item[];
  recipes: Recipe[];
  inventory: InventoryEntry[];
  settings: AppSettings;
  createdAt: string;
  updatedAt: string;
};

type Item = {
  id: string;
  name: string;
  category?: string;
  note?: string;
  imageMode: "none" | "emoji" | "file";
  emoji?: string;
  imagePath?: string;
  thumbnailPath?: string;
  createdAt: string;
  updatedAt: string;
};

type Recipe = {
  id: string;
  name?: string;
  outputItemId: string;
  outputQuantity: number;
  ingredients: RecipeIngredient[];
  note?: string;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
};

type RecipeIngredient = {
  itemId: string;
  quantity: number;
};

type InventoryEntry = {
  itemId: string;
  quantity: number;
};

type AppSettings = {
  theme: "dark" | "light" | "system";
  dataPath?: string;
  assetsPath?: string;
};
```

IDs will be stable UUIDs.

## Calculation Module

The reusable calculation module will expose functions equivalent to:

- `calculateDirectRequirements`
- `calculateExpandedRequirements`
- `calculateSmartRequirements` if implemented
- `calculateMissingMaterials`
- `canCraft`
- `detectRecipeCycle`
- `applyCraftResult`
- `getRecipeForItem`
- `normalizeQuantity`

Calculation output includes:

- required materials
- consumed materials
- missing materials
- intermediate crafts
- warnings
- errors
- craftable boolean

The module must be deterministic, safe from infinite recursion, clear when no recipe is available, and clear when circular recipes exist.

## Sample Data

Sample data is optional and loaded only when the user chooses it.

Sample items:

- Wood Log
- Plank
- Stick
- Wooden Pickaxe
- Stone
- Stone Pickaxe
- Iron Ore
- Iron Ingot
- Iron Sword
- Furnace
- Coal

Sample recipes:

- Plank x4 = Wood Log x1
- Stick x4 = Plank x2
- Wooden Pickaxe x1 = Plank x3 + Stick x2
- Stone Pickaxe x1 = Stone x3 + Stick x2
- Iron Sword x1 = Iron Ingot x2 + Stick x1
- Furnace x1 = Stone x8
- Iron Ingot x1 = Iron Ore x1 + Coal x1

Sample inventory:

- Wood Log x10
- Stone x20
- Iron Ore x5
- Coal x5

## Error Handling

CraftPlan must not crash because of bad user data, missing images, invalid recipes, or circular recipes. User-facing errors should be clear and practical. Technical detail can be kept in structured errors or logs where useful.

Startup storage permission failure is blocking and requires user action. The app must show the path and explain how to fix folder read/write access.

## Tests

Vitest coverage will include:

- direct recipe calculation
- expanded nested recipe calculation
- recipe output quantity greater than 1
- missing material calculation
- can craft true case
- can craft false case
- circular recipe detection
- no recipe available case
- inventory update after crafting
- import JSON validation
- data version validation or migration if implemented

## README

The README will document:

- project overview
- features
- tech stack
- dependency installation
- development run commands
- desktop build commands
- portable Windows build instructions
- where data is stored
- how item images are stored
- how recipe calculation works
- how import/export works
- JSON data format example
- known limitations
- troubleshooting notes

Portable usage notes will explain that users should keep `CraftPlan.exe` and `CraftPlanData/` together, and that the app requires read/write access to `CraftPlanData`.

## Non-Goals

The MVP will not include:

- game automation
- auto clicking
- reading game memory
- OCR
- anti-cheat bypass
- multiplayer
- login system
- backend database
- cloud sync
- marketplace
- real money features
- installer requirement

## Implementation Order

1. Project setup: Tauri, React, TypeScript, Vite, Tailwind, basic layout, local data model, local JSON persistence.
2. Items Manager: item CRUD, image upload, portable asset storage, search.
3. Recipe Manager: recipe CRUD, validation, search, default recipe selection, cycle detection.
4. Inventory Manager: quantity editing and persistence.
5. Craft Calculator: Direct mode, Expanded mode, missing materials, Crafted action.
6. Import/export and backup: JSON, ZIP package, preview, merge/replace, backups.
7. Settings: data paths, folder buttons, reset, theme, sample data, stretch asset cleanup.
8. Tests, README, and portable build instructions.

## Acceptance Criteria

The app is acceptable when:

1. It runs locally as a Windows desktop app.
2. It can be built for Windows as a portable `.exe` or portable app folder.
3. It works fully offline.
4. Users can add, edit, and delete items.
5. Users can upload item images.
6. Item images continue working after moving the app folder with `CraftPlanData`.
7. Users can add, edit, delete, duplicate, and search recipes.
8. Users can manage inventory.
9. Users can calculate direct requirements.
10. Users can calculate expanded nested requirements.
11. The app shows missing materials.
12. The app prevents or reports circular recipes.
13. The app can apply crafting results to inventory.
14. Data is saved locally in the portable data folder.
15. The app can export and import JSON.
16. The app can export and import a full package with assets.
17. Calculation logic has basic automated tests.
18. The README explains how to run, build, and use the portable app.
