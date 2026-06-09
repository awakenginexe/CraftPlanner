# CraftPlan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build CraftPlan from scratch as a complete offline Windows portable desktop app for custom crafting recipes, inventory, calculation, import/export, backup, and local assets.

**Architecture:** Use a Tauri command layer for portable filesystem operations and a React/TypeScript frontend for the workbench UI. Keep data types, validation, sample data, import/export validation, and recipe calculation in framework-independent TypeScript modules so they can be tested with Vitest.

**Tech Stack:** Tauri 2, React, TypeScript, Vite, Tailwind CSS, Zustand, Vitest, Rust Tauri plugins, local JSON persistence, ZIP package import/export.

---

## File Structure

- Create `package.json`: scripts, dependencies, and app metadata.
- Create `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `postcss.config.js`, `tailwind.config.js`: frontend toolchain.
- Create `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, `src-tauri/build.rs`, `src-tauri/src/main.rs`, `src-tauri/src/portable_data.rs`: Tauri desktop shell and portable data commands.
- Create `src/main.tsx`, `src/App.tsx`, `src/styles.css`: React entrypoint and base layout.
- Create `src/domain/types.ts`: persisted data model and UI-safe type aliases.
- Create `src/domain/defaultData.ts`: empty default data factory.
- Create `src/domain/sampleData.ts`: optional sample data.
- Create `src/domain/ids.ts`: UUID helpers.
- Create `src/domain/quantity.ts`: deterministic quantity helpers.
- Create `src/domain/validation.ts`: item, recipe, import, and storage validation helpers.
- Create `src/domain/calculation.ts`: direct, expanded, smart, missing-material, cycle, and craft-application logic.
- Create `src/domain/importExport.ts`: JSON import/export normalization and merge logic.
- Create `src/store/useCraftPlanStore.ts`: Zustand app state and actions.
- Create `src/tauri/api.ts`: typed wrapper around Tauri commands.
- Create `src/components/Layout.tsx`, `src/components/Sidebar.tsx`, `src/components/TopBar.tsx`, `src/components/Modal.tsx`, `src/components/ItemBadge.tsx`, `src/components/ConfirmDialog.tsx`, `src/components/SearchSelect.tsx`, `src/components/PermissionError.tsx`: reusable UI.
- Create `src/screens/Dashboard.tsx`, `src/screens/Items.tsx`, `src/screens/Recipes.tsx`, `src/screens/Inventory.tsx`, `src/screens/Calculator.tsx`, `src/screens/ImportExport.tsx`, `src/screens/Settings.tsx`: app screens.
- Create `src/tests/calculation.test.ts`, `src/tests/validation.test.ts`, `src/tests/importExport.test.ts`: required tests.
- Create `README.md`: run, build, portable usage, data format, and troubleshooting docs.

## Data Contracts

Use these exact persisted TypeScript contracts in `src/domain/types.ts`:

```ts
export type ThemeMode = "dark" | "light" | "system";
export type ImageMode = "none" | "emoji" | "file";

export type CraftPlanData = {
  appVersion: string;
  dataVersion: number;
  items: Item[];
  recipes: Recipe[];
  inventory: InventoryEntry[];
  settings: AppSettings;
  createdAt: string;
  updatedAt: string;
};

export type Item = {
  id: string;
  name: string;
  category?: string;
  note?: string;
  imageMode: ImageMode;
  emoji?: string;
  imagePath?: string;
  thumbnailPath?: string;
  createdAt: string;
  updatedAt: string;
};

export type Recipe = {
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

export type RecipeIngredient = {
  itemId: string;
  quantity: number;
};

export type InventoryEntry = {
  itemId: string;
  quantity: number;
};

export type AppSettings = {
  theme: ThemeMode;
  dataPath?: string;
  assetsPath?: string;
};
```

## Task 1: Scaffold Tauri React Project

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `index.html`
- Create: `postcss.config.js`
- Create: `tailwind.config.js`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles.css`
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/tauri.conf.json`
- Create: `src-tauri/build.rs`
- Create: `src-tauri/src/main.rs`

- [ ] **Step 1: Create frontend package metadata**

Write `package.json`:

```json
{
  "name": "craftplan",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@tauri-apps/api": "^2.0.0",
    "@tauri-apps/plugin-dialog": "^2.0.0",
    "@tauri-apps/plugin-opener": "^2.0.0",
    "lucide-react": "^0.468.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.0.0",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.3",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.15",
    "typescript": "^5.6.3",
    "vite": "^5.4.11",
    "vitest": "^2.1.5"
  }
}
```

- [ ] **Step 2: Create Vite and TypeScript config**

Write `vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    target: process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "safari13",
    minify: !process.env.TAURI_ENV_DEBUG,
    sourcemap: Boolean(process.env.TAURI_ENV_DEBUG),
  },
});
```

Write `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2020"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

Write `tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 3: Create Tailwind config and base HTML**

Write `tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#121417",
        panel: "#1b2027",
        line: "#303844",
        accent: "#45b29d"
      }
    }
  },
  plugins: []
};
```

Write `postcss.config.js`:

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

Write `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CraftPlan</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Create minimal React entrypoint**

Write `src/main.tsx`:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

Write `src/App.tsx`:

```tsx
export default function App() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="p-6">
        <h1 className="text-2xl font-semibold">CraftPlan</h1>
        <p className="mt-2 text-sm text-zinc-400">Preparing workbench...</p>
      </div>
    </main>
  );
}
```

Write `src/styles.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  color-scheme: dark;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

body {
  margin: 0;
}

button,
input,
select,
textarea {
  font: inherit;
}
```

- [ ] **Step 5: Create Tauri shell**

Write `src-tauri/Cargo.toml`:

```toml
[package]
name = "craftplan"
version = "1.0.0"
description = "CraftPlan desktop crafting planner"
authors = ["CraftPlan"]
edition = "2021"

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tauri = { version = "2", features = [] }
tauri-plugin-dialog = "2"
tauri-plugin-opener = "2"
uuid = { version = "1", features = ["v4"] }
zip = "2"

[features]
custom-protocol = ["tauri/custom-protocol"]
```

Write `src-tauri/build.rs`:

```rust
fn main() {
    tauri_build::build();
}
```

Write `src-tauri/tauri.conf.json`:

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "CraftPlan",
  "version": "1.0.0",
  "identifier": "com.craftplan.app",
  "build": {
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:1420",
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "CraftPlan",
        "width": 1200,
        "height": 760,
        "minWidth": 960,
        "minHeight": 640
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": ["nsis"],
    "windows": {
      "nsis": {
        "installMode": "currentUser"
      }
    }
  }
}
```

Write `src-tauri/src/main.rs`:

```rust
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("failed to run CraftPlan");
}
```

- [ ] **Step 6: Install dependencies**

Run:

```bash
npm install
```

Expected: dependencies install and `package-lock.json` is created.

- [ ] **Step 7: Verify scaffold**

Run:

```bash
npm run build
```

Expected: TypeScript and Vite complete successfully and create `dist/`.

- [ ] **Step 8: Commit scaffold**

Run:

```bash
git add package.json package-lock.json vite.config.ts tsconfig.json tsconfig.node.json index.html postcss.config.js tailwind.config.js src src-tauri
git commit -m "feat: scaffold CraftPlan desktop app"
```

## Task 2: Add Domain Types, Default Data, Sample Data, and Quantity Helpers

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/domain/defaultData.ts`
- Create: `src/domain/sampleData.ts`
- Create: `src/domain/ids.ts`
- Create: `src/domain/quantity.ts`
- Create: `src/tests/quantity.test.ts`

- [ ] **Step 1: Write quantity tests**

Write `src/tests/quantity.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { batchesFor, normalizeQuantity, sumQuantityMap } from "../domain/quantity";

describe("quantity helpers", () => {
  it("normalizes invalid and negative quantities to zero", () => {
    expect(normalizeQuantity(Number.NaN)).toBe(0);
    expect(normalizeQuantity(-4)).toBe(0);
    expect(normalizeQuantity(2.4)).toBe(2);
  });

  it("uses ceiling division for recipe batches", () => {
    expect(batchesFor(5, 4)).toBe(2);
    expect(batchesFor(8, 4)).toBe(2);
    expect(batchesFor(1, 1)).toBe(1);
  });

  it("sums quantity maps deterministically", () => {
    expect(sumQuantityMap([{ itemId: "wood", quantity: 2 }, { itemId: "wood", quantity: 3 }])).toEqual({
      wood: 5,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- src/tests/quantity.test.ts
```

Expected: FAIL because `src/domain/quantity.ts` does not exist.

- [ ] **Step 3: Implement types and helpers**

Write `src/domain/types.ts` using the Data Contracts section exactly, then add:

```ts
export type QuantityMap = Record<string, number>;

export type AppStatus =
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "permission-error"; path: string; message: string }
  | { kind: "error"; message: string };
```

Write `src/domain/ids.ts`:

```ts
export function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
```

Write `src/domain/quantity.ts`:

```ts
import type { QuantityMap, RecipeIngredient } from "./types";

export function normalizeQuantity(quantity: number): number {
  if (!Number.isFinite(quantity) || quantity <= 0) return 0;
  return Math.floor(quantity);
}

export function batchesFor(targetQuantity: number, outputQuantity: number): number {
  const target = normalizeQuantity(targetQuantity);
  const output = normalizeQuantity(outputQuantity);
  if (target === 0 || output === 0) return 0;
  return Math.ceil(target / output);
}

export function addQuantity(map: QuantityMap, itemId: string, quantity: number): QuantityMap {
  const normalized = normalizeQuantity(quantity);
  if (normalized === 0) return map;
  return { ...map, [itemId]: (map[itemId] ?? 0) + normalized };
}

export function sumQuantityMap(entries: RecipeIngredient[]): QuantityMap {
  return entries.reduce<QuantityMap>((acc, entry) => addQuantity(acc, entry.itemId, entry.quantity), {});
}

export function quantityMapToEntries(map: QuantityMap): RecipeIngredient[] {
  return Object.entries(map)
    .filter(([, quantity]) => quantity > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([itemId, quantity]) => ({ itemId, quantity }));
}
```

Write `src/domain/defaultData.ts`:

```ts
import type { CraftPlanData } from "./types";

export const APP_VERSION = "1.0.0";
export const DATA_VERSION = 1;

export function createDefaultData(now = new Date().toISOString()): CraftPlanData {
  return {
    appVersion: APP_VERSION,
    dataVersion: DATA_VERSION,
    items: [],
    recipes: [],
    inventory: [],
    settings: {
      theme: "dark",
    },
    createdAt: now,
    updatedAt: now,
  };
}
```

Write `src/domain/sampleData.ts` with stable item IDs:

```ts
import type { CraftPlanData, InventoryEntry, Item, Recipe } from "./types";
import { APP_VERSION, DATA_VERSION } from "./defaultData";

const now = "2026-06-09T00:00:00.000Z";

const item = (id: string, name: string, category: string, emoji: string): Item => ({
  id,
  name,
  category,
  imageMode: "emoji",
  emoji,
  createdAt: now,
  updatedAt: now,
});

export const sampleItems: Item[] = [
  item("wood-log", "Wood Log", "Wood", "L"),
  item("plank", "Plank", "Wood", "P"),
  item("stick", "Stick", "Wood", "S"),
  item("wooden-pickaxe", "Wooden Pickaxe", "Tool", "W"),
  item("stone", "Stone", "Stone", "O"),
  item("stone-pickaxe", "Stone Pickaxe", "Tool", "T"),
  item("iron-ore", "Iron Ore", "Ore", "I"),
  item("iron-ingot", "Iron Ingot", "Metal", "N"),
  item("iron-sword", "Iron Sword", "Weapon", "X"),
  item("furnace", "Furnace", "Station", "F"),
  item("coal", "Coal", "Fuel", "C"),
];

export const sampleRecipes: Recipe[] = [
  { id: "recipe-plank", outputItemId: "plank", outputQuantity: 4, ingredients: [{ itemId: "wood-log", quantity: 1 }], isDefault: true, createdAt: now, updatedAt: now },
  { id: "recipe-stick", outputItemId: "stick", outputQuantity: 4, ingredients: [{ itemId: "plank", quantity: 2 }], isDefault: true, createdAt: now, updatedAt: now },
  { id: "recipe-wooden-pickaxe", outputItemId: "wooden-pickaxe", outputQuantity: 1, ingredients: [{ itemId: "plank", quantity: 3 }, { itemId: "stick", quantity: 2 }], isDefault: true, createdAt: now, updatedAt: now },
  { id: "recipe-stone-pickaxe", outputItemId: "stone-pickaxe", outputQuantity: 1, ingredients: [{ itemId: "stone", quantity: 3 }, { itemId: "stick", quantity: 2 }], isDefault: true, createdAt: now, updatedAt: now },
  { id: "recipe-iron-sword", outputItemId: "iron-sword", outputQuantity: 1, ingredients: [{ itemId: "iron-ingot", quantity: 2 }, { itemId: "stick", quantity: 1 }], isDefault: true, createdAt: now, updatedAt: now },
  { id: "recipe-furnace", outputItemId: "furnace", outputQuantity: 1, ingredients: [{ itemId: "stone", quantity: 8 }], isDefault: true, createdAt: now, updatedAt: now },
  { id: "recipe-iron-ingot", outputItemId: "iron-ingot", outputQuantity: 1, ingredients: [{ itemId: "iron-ore", quantity: 1 }, { itemId: "coal", quantity: 1 }], isDefault: true, createdAt: now, updatedAt: now },
];

export const sampleInventory: InventoryEntry[] = [
  { itemId: "wood-log", quantity: 10 },
  { itemId: "stone", quantity: 20 },
  { itemId: "iron-ore", quantity: 5 },
  { itemId: "coal", quantity: 5 },
];

export function createSampleData(): CraftPlanData {
  return {
    appVersion: APP_VERSION,
    dataVersion: DATA_VERSION,
    items: sampleItems,
    recipes: sampleRecipes,
    inventory: sampleInventory,
    settings: { theme: "dark" },
    createdAt: now,
    updatedAt: now,
  };
}
```

- [ ] **Step 4: Run tests**

Run:

```bash
npm test -- src/tests/quantity.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit domain basics**

Run:

```bash
git add src/domain src/tests/quantity.test.ts
git commit -m "feat: add CraftPlan domain data basics"
```

## Task 3: Build Calculation Engine with Tests

**Files:**
- Create: `src/domain/calculation.ts`
- Create: `src/tests/calculation.test.ts`

- [ ] **Step 1: Write required calculation tests**

Write `src/tests/calculation.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  applyCraftResult,
  calculateDirectRequirements,
  calculateExpandedRequirements,
  calculateMissingMaterials,
  canCraft,
  detectRecipeCycle,
} from "../domain/calculation";
import type { InventoryEntry, Recipe } from "../domain/types";

const recipes: Recipe[] = [
  { id: "plank", outputItemId: "plank", outputQuantity: 4, ingredients: [{ itemId: "wood", quantity: 1 }], isDefault: true, createdAt: "", updatedAt: "" },
  { id: "stick", outputItemId: "stick", outputQuantity: 4, ingredients: [{ itemId: "plank", quantity: 2 }], isDefault: true, createdAt: "", updatedAt: "" },
  { id: "chest", outputItemId: "chest", outputQuantity: 1, ingredients: [{ itemId: "plank", quantity: 8 }], isDefault: true, createdAt: "", updatedAt: "" },
];

describe("calculation engine", () => {
  it("calculates direct recipe requirements", () => {
    const result = calculateDirectRequirements("chest", 1, recipes);
    expect(result.requiredMaterials).toEqual({ plank: 8 });
    expect(result.craftable).toBe(true);
  });

  it("calculates expanded nested requirements", () => {
    const result = calculateExpandedRequirements("chest", 1, recipes);
    expect(result.requiredMaterials).toEqual({ wood: 2 });
    expect(result.intermediateCrafts).toEqual(expect.arrayContaining([{ itemId: "plank", requestedQuantity: 8, producedQuantity: 8, batches: 2 }]));
  });

  it("handles recipe output quantity greater than one", () => {
    const result = calculateExpandedRequirements("plank", 5, recipes);
    expect(result.requiredMaterials).toEqual({ wood: 2 });
    expect(result.intermediateCrafts).toEqual([{ itemId: "plank", requestedQuantity: 5, producedQuantity: 8, batches: 2 }]);
  });

  it("calculates missing materials", () => {
    expect(calculateMissingMaterials({ wood: 5, coal: 1 }, [{ itemId: "wood", quantity: 3 }])).toEqual({ wood: 2, coal: 1 });
  });

  it("detects can craft true and false cases", () => {
    expect(canCraft({ wood: 2 }, [{ itemId: "wood", quantity: 2 }])).toBe(true);
    expect(canCraft({ wood: 3 }, [{ itemId: "wood", quantity: 2 }])).toBe(false);
  });

  it("detects circular recipe chains", () => {
    const cyclic: Recipe[] = [
      { id: "a", outputItemId: "a", outputQuantity: 1, ingredients: [{ itemId: "b", quantity: 1 }], createdAt: "", updatedAt: "" },
      { id: "b", outputItemId: "b", outputQuantity: 1, ingredients: [{ itemId: "c", quantity: 1 }], createdAt: "", updatedAt: "" },
      { id: "c", outputItemId: "c", outputQuantity: 1, ingredients: [{ itemId: "a", quantity: 1 }], createdAt: "", updatedAt: "" },
    ];
    expect(detectRecipeCycle(cyclic)).toEqual([["a", "b", "c", "a"]]);
    const result = calculateExpandedRequirements("a", 1, cyclic);
    expect(result.craftable).toBe(false);
    expect(result.errors[0]).toContain("Circular recipe detected");
  });

  it("reports no recipe available", () => {
    const result = calculateExpandedRequirements("unknown", 1, recipes);
    expect(result.craftable).toBe(false);
    expect(result.errors).toEqual(["No recipe available for this item."]);
  });

  it("applies crafting result to inventory", () => {
    const inventory: InventoryEntry[] = [{ itemId: "wood", quantity: 3 }];
    const updated = applyCraftResult("plank", 5, { wood: 2 }, inventory);
    expect(updated).toEqual([
      { itemId: "wood", quantity: 1 },
      { itemId: "plank", quantity: 5 },
    ]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- src/tests/calculation.test.ts
```

Expected: FAIL because `src/domain/calculation.ts` does not exist.

- [ ] **Step 3: Implement calculation engine**

Write `src/domain/calculation.ts`:

```ts
import type { InventoryEntry, QuantityMap, Recipe, RecipeIngredient } from "./types";
import { addQuantity, batchesFor, normalizeQuantity, quantityMapToEntries } from "./quantity";

export type IntermediateCraft = {
  itemId: string;
  requestedQuantity: number;
  producedQuantity: number;
  batches: number;
};

export type CalculationResult = {
  requiredMaterials: QuantityMap;
  consumedMaterials: QuantityMap;
  missingMaterials: QuantityMap;
  intermediateCrafts: IntermediateCraft[];
  warnings: string[];
  errors: string[];
  craftable: boolean;
};

const emptyResult = (errors: string[] = []): CalculationResult => ({
  requiredMaterials: {},
  consumedMaterials: {},
  missingMaterials: {},
  intermediateCrafts: [],
  warnings: [],
  errors,
  craftable: errors.length === 0,
});

export function inventoryToMap(inventory: InventoryEntry[]): QuantityMap {
  return inventory.reduce<QuantityMap>((acc, entry) => addQuantity(acc, entry.itemId, entry.quantity), {});
}

export function getRecipeForItem(itemId: string, recipes: Recipe[], selectedRecipeId?: string): Recipe | undefined {
  if (selectedRecipeId) return recipes.find((recipe) => recipe.id === selectedRecipeId && recipe.outputItemId === itemId);
  return recipes.find((recipe) => recipe.outputItemId === itemId && recipe.isDefault) ?? recipes.find((recipe) => recipe.outputItemId === itemId);
}

export function calculateMissingMaterials(requirements: QuantityMap, inventory: InventoryEntry[]): QuantityMap {
  const available = inventoryToMap(inventory);
  return Object.entries(requirements).reduce<QuantityMap>((acc, [itemId, required]) => {
    const missing = required - (available[itemId] ?? 0);
    return missing > 0 ? { ...acc, [itemId]: missing } : acc;
  }, {});
}

export function canCraft(requirements: QuantityMap, inventory: InventoryEntry[]): boolean {
  return Object.keys(calculateMissingMaterials(requirements, inventory)).length === 0;
}

export function calculateDirectRequirements(targetItemId: string, quantity: number, recipes: Recipe[], selectedRecipeId?: string, inventory: InventoryEntry[] = []): CalculationResult {
  const recipe = getRecipeForItem(targetItemId, recipes, selectedRecipeId);
  if (!recipe) return emptyResult(["No recipe available for this item."]);

  const batches = batchesFor(quantity, recipe.outputQuantity);
  const requiredMaterials = recipe.ingredients.reduce<QuantityMap>((acc, ingredient) => addQuantity(acc, ingredient.itemId, ingredient.quantity * batches), {});
  const missingMaterials = calculateMissingMaterials(requiredMaterials, inventory);

  return {
    requiredMaterials,
    consumedMaterials: requiredMaterials,
    missingMaterials,
    intermediateCrafts: [{ itemId: targetItemId, requestedQuantity: normalizeQuantity(quantity), producedQuantity: batches * recipe.outputQuantity, batches }],
    warnings: [],
    errors: [],
    craftable: Object.keys(missingMaterials).length === 0,
  };
}

export function calculateExpandedRequirements(targetItemId: string, quantity: number, recipes: Recipe[], selectedRecipeId?: string, inventory: InventoryEntry[] = []): CalculationResult {
  const cycles = detectRecipeCycle(recipes);
  if (cycles.length > 0) return emptyResult([`Circular recipe detected: ${cycles[0].join(" -> ")}`]);

  const intermediateCrafts: IntermediateCraft[] = [];
  const warnings: string[] = [];

  const expand = (itemId: string, requiredQuantity: number, isTarget: boolean): QuantityMap | undefined => {
    const recipe = getRecipeForItem(itemId, recipes, isTarget ? selectedRecipeId : undefined);
    if (!recipe) {
      if (isTarget) return undefined;
      return { [itemId]: normalizeQuantity(requiredQuantity) };
    }

    const batches = batchesFor(requiredQuantity, recipe.outputQuantity);
    intermediateCrafts.push({
      itemId,
      requestedQuantity: normalizeQuantity(requiredQuantity),
      producedQuantity: batches * recipe.outputQuantity,
      batches,
    });

    return recipe.ingredients.reduce<QuantityMap>((acc, ingredient) => {
      const nested = expand(ingredient.itemId, ingredient.quantity * batches, false);
      if (!nested) return acc;
      return Object.entries(nested).reduce<QuantityMap>((nestedAcc, [nestedItemId, nestedQuantity]) => addQuantity(nestedAcc, nestedItemId, nestedQuantity), acc);
    }, {});
  };

  const requiredMaterials = expand(targetItemId, quantity, true);
  if (!requiredMaterials) return emptyResult(["No recipe available for this item."]);

  const missingMaterials = calculateMissingMaterials(requiredMaterials, inventory);
  return {
    requiredMaterials,
    consumedMaterials: requiredMaterials,
    missingMaterials,
    intermediateCrafts,
    warnings,
    errors: [],
    craftable: Object.keys(missingMaterials).length === 0,
  };
}

export function calculateSmartRequirements(targetItemId: string, quantity: number, recipes: Recipe[], inventory: InventoryEntry[], selectedRecipeId?: string): CalculationResult {
  const inventoryMap = inventoryToMap(inventory);
  const base = calculateExpandedRequirements(targetItemId, quantity, recipes, selectedRecipeId, []);
  if (base.errors.length > 0) return base;

  const consumedMaterials = Object.entries(base.requiredMaterials).reduce<QuantityMap>((acc, [itemId, required]) => {
    return { ...acc, [itemId]: Math.min(required, inventoryMap[itemId] ?? 0) };
  }, {});
  const missingMaterials = calculateMissingMaterials(base.requiredMaterials, inventory);

  return {
    ...base,
    consumedMaterials: base.requiredMaterials,
    missingMaterials,
    warnings: [...base.warnings, "Smart mode uses available base materials after expanding craftable ingredients."],
    craftable: Object.keys(missingMaterials).length === 0,
  };
}

export function detectRecipeCycle(recipes: Recipe[]): string[][] {
  const byOutput = new Map<string, Recipe>();
  for (const recipe of recipes) {
    if (!byOutput.has(recipe.outputItemId) || recipe.isDefault) byOutput.set(recipe.outputItemId, recipe);
  }

  const cycles: string[][] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (itemId: string, path: string[]) => {
    if (visiting.has(itemId)) {
      const start = path.indexOf(itemId);
      cycles.push([...path.slice(start), itemId]);
      return;
    }
    if (visited.has(itemId)) return;
    visiting.add(itemId);
    const recipe = byOutput.get(itemId);
    if (recipe) {
      for (const ingredient of recipe.ingredients) visit(ingredient.itemId, [...path, ingredient.itemId]);
    }
    visiting.delete(itemId);
    visited.add(itemId);
  };

  for (const recipe of recipes) visit(recipe.outputItemId, [recipe.outputItemId]);
  return cycles;
}

export function applyCraftResult(targetItemId: string, quantity: number, consumedMaterials: QuantityMap, inventory: InventoryEntry[]): InventoryEntry[] {
  const map = inventoryToMap(inventory);
  for (const [itemId, consumed] of Object.entries(consumedMaterials)) {
    map[itemId] = Math.max(0, (map[itemId] ?? 0) - consumed);
  }
  map[targetItemId] = (map[targetItemId] ?? 0) + normalizeQuantity(quantity);
  return quantityMapToEntries(Object.fromEntries(Object.entries(map).filter(([, value]) => value > 0)));
}
```

- [ ] **Step 4: Run calculation tests**

Run:

```bash
npm test -- src/tests/calculation.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run all tests**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 6: Commit calculation engine**

Run:

```bash
git add src/domain/calculation.ts src/tests/calculation.test.ts
git commit -m "feat: add recipe calculation engine"
```

## Task 4: Add Validation and Import/Export Domain Logic

**Files:**
- Create: `src/domain/validation.ts`
- Create: `src/domain/importExport.ts`
- Create: `src/tests/validation.test.ts`
- Create: `src/tests/importExport.test.ts`

- [ ] **Step 1: Write validation tests**

Write `src/tests/validation.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createDefaultData } from "../domain/defaultData";
import { validateImportData, validateItemDraft, validateRecipeDraft } from "../domain/validation";

describe("validation", () => {
  it("requires item names and trims them", () => {
    expect(validateItemDraft({ name: "  " }, [])).toEqual({ ok: false, errors: ["Item name is required."], warnings: [], value: undefined });
    expect(validateItemDraft({ name: "  Stick  " }, [])).toEqual({ ok: true, errors: [], warnings: [], value: { name: "Stick" } });
  });

  it("warns on duplicate item names", () => {
    expect(validateItemDraft({ name: "stick" }, [{ id: "a", name: "Stick", imageMode: "none", createdAt: "", updatedAt: "" }]).warnings).toEqual(["An item with this name already exists."]);
  });

  it("rejects invalid recipes", () => {
    expect(validateRecipeDraft({ outputItemId: "a", outputQuantity: 1, ingredients: [{ itemId: "a", quantity: 1 }] }).errors).toContain("An item cannot directly require itself.");
  });

  it("validates import data shape", () => {
    const data = createDefaultData();
    expect(validateImportData(data).ok).toBe(true);
    expect(validateImportData({ items: [] }).ok).toBe(false);
  });
});
```

Write `src/tests/importExport.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createDefaultData } from "../domain/defaultData";
import { buildJsonExport, mergeImportedData } from "../domain/importExport";

describe("import/export", () => {
  it("builds structured JSON export", () => {
    const exported = buildJsonExport(createDefaultData(), "2026-06-09T00:00:00.000Z");
    expect(exported.exportedAt).toBe("2026-06-09T00:00:00.000Z");
    expect(exported.items).toEqual([]);
  });

  it("renames imported item when names conflict during merge", () => {
    const current = createDefaultData();
    current.items = [{ id: "a", name: "Stick", imageMode: "none", createdAt: "", updatedAt: "" }];
    const incoming = createDefaultData();
    incoming.items = [{ id: "b", name: "Stick", imageMode: "none", createdAt: "", updatedAt: "" }];
    const merged = mergeImportedData(current, incoming, "2026-06-09T00:00:00.000Z");
    expect(merged.data.items.map((item) => item.name)).toEqual(["Stick", "Stick (imported)"]);
    expect(merged.warnings).toEqual(["Renamed imported item \"Stick\" to \"Stick (imported)\"."]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- src/tests/validation.test.ts src/tests/importExport.test.ts
```

Expected: FAIL because validation and import/export modules do not exist.

- [ ] **Step 3: Implement validation**

Write `src/domain/validation.ts`:

```ts
import type { CraftPlanData, Item, Recipe, RecipeIngredient } from "./types";

export type ValidationResult<T> = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  value?: T;
};

export function validateItemDraft(draft: { name?: string }, existingItems: Item[], editingId?: string): ValidationResult<{ name: string }> {
  const name = draft.name?.trim() ?? "";
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!name) errors.push("Item name is required.");
  const duplicate = existingItems.some((item) => item.id !== editingId && item.name.trim().toLowerCase() === name.toLowerCase());
  if (name && duplicate) warnings.push("An item with this name already exists.");
  return { ok: errors.length === 0, errors, warnings, value: errors.length === 0 ? { name } : undefined };
}

export function validateRecipeDraft(draft: { outputItemId?: string; outputQuantity?: number; ingredients?: RecipeIngredient[] }): ValidationResult<RecipeIngredient[]> {
  const errors: string[] = [];
  if (!draft.outputItemId) errors.push("Output item is required.");
  if (!draft.outputQuantity || draft.outputQuantity <= 0) errors.push("Output quantity must be greater than 0.");
  const ingredients = draft.ingredients ?? [];
  if (ingredients.length === 0) errors.push("At least one ingredient is required.");
  for (const ingredient of ingredients) {
    if (!ingredient.itemId) errors.push("Ingredient item is required.");
    if (!ingredient.quantity || ingredient.quantity <= 0) errors.push("Ingredient quantity must be greater than 0.");
    if (draft.outputItemId && ingredient.itemId === draft.outputItemId) errors.push("An item cannot directly require itself.");
  }
  return { ok: errors.length === 0, errors: Array.from(new Set(errors)), warnings: [], value: errors.length === 0 ? ingredients : undefined };
}

export function validateImportData(value: unknown): ValidationResult<CraftPlanData> {
  const data = value as Partial<CraftPlanData>;
  const errors: string[] = [];
  if (!data || typeof data !== "object") errors.push("Import file must contain an object.");
  if (!Array.isArray(data.items)) errors.push("Import data must include an items array.");
  if (!Array.isArray(data.recipes)) errors.push("Import data must include a recipes array.");
  if (!Array.isArray(data.inventory)) errors.push("Import data must include an inventory array.");
  if (!data.settings || typeof data.settings !== "object") errors.push("Import data must include settings.");
  if (typeof data.dataVersion !== "number") errors.push("Import data must include a numeric dataVersion.");
  return { ok: errors.length === 0, errors, warnings: [], value: errors.length === 0 ? (data as CraftPlanData) : undefined };
}
```

- [ ] **Step 4: Implement import/export helpers**

Write `src/domain/importExport.ts`:

```ts
import type { CraftPlanData, Item } from "./types";
import { validateImportData } from "./validation";

export type JsonExport = Pick<CraftPlanData, "appVersion" | "items" | "recipes" | "inventory" | "settings"> & {
  exportedAt: string;
  dataVersion: number;
};

export type MergeResult = {
  data: CraftPlanData;
  warnings: string[];
};

export function buildJsonExport(data: CraftPlanData, exportedAt = new Date().toISOString()): JsonExport {
  return {
    appVersion: data.appVersion,
    dataVersion: data.dataVersion,
    exportedAt,
    items: data.items,
    recipes: data.recipes,
    inventory: data.inventory,
    settings: data.settings,
  };
}

export function parseJsonImport(text: string) {
  try {
    return validateImportData(JSON.parse(text));
  } catch {
    return { ok: false, errors: ["Import file is not valid JSON."], warnings: [], value: undefined };
  }
}

function withUniqueName(item: Item, existingNames: Set<string>, warnings: string[]): Item {
  if (!existingNames.has(item.name.toLowerCase())) {
    existingNames.add(item.name.toLowerCase());
    return item;
  }
  const renamed = `${item.name} (imported)`;
  warnings.push(`Renamed imported item "${item.name}" to "${renamed}".`);
  existingNames.add(renamed.toLowerCase());
  return { ...item, name: renamed };
}

export function mergeImportedData(current: CraftPlanData, incoming: CraftPlanData, now = new Date().toISOString()): MergeResult {
  const warnings: string[] = [];
  const existingIds = new Set(current.items.map((item) => item.id));
  const existingNames = new Set(current.items.map((item) => item.name.toLowerCase()));
  const importedItems = incoming.items
    .filter((item) => !existingIds.has(item.id))
    .map((item) => withUniqueName(item, existingNames, warnings));
  return {
    data: {
      ...current,
      items: [...current.items, ...importedItems],
      recipes: [...current.recipes, ...incoming.recipes.filter((recipe) => !current.recipes.some((existing) => existing.id === recipe.id))],
      inventory: [...current.inventory, ...incoming.inventory.filter((entry) => !current.inventory.some((existing) => existing.itemId === entry.itemId))],
      updatedAt: now,
    },
    warnings,
  };
}
```

- [ ] **Step 5: Run tests**

Run:

```bash
npm test -- src/tests/validation.test.ts src/tests/importExport.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit validation and import/export domain logic**

Run:

```bash
git add src/domain/validation.ts src/domain/importExport.ts src/tests/validation.test.ts src/tests/importExport.test.ts
git commit -m "feat: add validation and import export helpers"
```

## Task 5: Add Tauri Portable Data Commands

**Files:**
- Create: `src-tauri/src/portable_data.rs`
- Modify: `src-tauri/src/main.rs`
- Create: `src/tauri/api.ts`

- [ ] **Step 1: Implement portable data Rust module**

Write `src-tauri/src/portable_data.rs`:

```rust
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

#[derive(Debug, Serialize)]
pub struct StorageInfo {
    pub data_dir: String,
    pub data_file: String,
    pub assets_dir: String,
}

#[derive(Debug, Serialize)]
pub struct StorageError {
    pub path: String,
    pub message: String,
}

#[derive(Debug, Deserialize)]
pub struct SaveDataRequest {
    pub json: String,
}

fn executable_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path().resource_dir().map_err(|error| error.to_string())
}

fn data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(executable_dir(app)?.join("CraftPlanData"))
}

fn ensure_dir(path: &Path) -> Result<(), StorageError> {
    fs::create_dir_all(path).map_err(|error| StorageError {
        path: path.display().to_string(),
        message: format!("CraftPlan needs read/write access to this folder: {error}"),
    })
}

fn check_writable(path: &Path) -> Result<(), StorageError> {
    let probe = path.join(".craftplan-write-test");
    fs::File::create(&probe)
        .and_then(|mut file| file.write_all(b"ok"))
        .and_then(|_| fs::remove_file(&probe))
        .map_err(|error| StorageError {
            path: path.display().to_string(),
            message: format!("CraftPlan cannot write to this folder: {error}"),
        })
}

#[tauri::command]
pub fn init_storage(app: AppHandle) -> Result<StorageInfo, StorageError> {
    let root = data_dir(&app).map_err(|message| StorageError { path: "CraftPlanData".into(), message })?;
    ensure_dir(&root)?;
    ensure_dir(&root.join("assets"))?;
    ensure_dir(&root.join("assets").join("items"))?;
    ensure_dir(&root.join("assets").join("thumbnails"))?;
    ensure_dir(&root.join("backups"))?;
    ensure_dir(&root.join("exports"))?;
    check_writable(&root)?;

    Ok(StorageInfo {
      data_file: root.join("data.json").display().to_string(),
      assets_dir: root.join("assets").display().to_string(),
      data_dir: root.display().to_string(),
    })
}

#[tauri::command]
pub fn read_data(app: AppHandle) -> Result<Option<String>, StorageError> {
    let file = data_dir(&app).map_err(|message| StorageError { path: "CraftPlanData".into(), message })?.join("data.json");
    if !file.exists() {
        return Ok(None);
    }
    fs::read_to_string(&file).map(Some).map_err(|error| StorageError {
        path: file.display().to_string(),
        message: format!("Could not read data.json: {error}"),
    })
}

#[tauri::command]
pub fn save_data(app: AppHandle, request: SaveDataRequest) -> Result<(), StorageError> {
    let root = data_dir(&app).map_err(|message| StorageError { path: "CraftPlanData".into(), message })?;
    let file = root.join("data.json");
    let temp = root.join("data.tmp.json");
    serde_json::from_str::<serde_json::Value>(&request.json).map_err(|error| StorageError {
        path: file.display().to_string(),
        message: format!("Data is not valid JSON: {error}"),
    })?;
    fs::write(&temp, request.json).map_err(|error| StorageError {
        path: temp.display().to_string(),
        message: format!("Could not write temporary data file: {error}"),
    })?;
    fs::rename(&temp, &file).map_err(|error| StorageError {
        path: file.display().to_string(),
        message: format!("Could not replace data.json: {error}"),
    })
}
```

- [ ] **Step 2: Register commands**

Modify `src-tauri/src/main.rs`:

```rust
mod portable_data;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            portable_data::init_storage,
            portable_data::read_data,
            portable_data::save_data
        ])
        .run(tauri::generate_context!())
        .expect("failed to run CraftPlan");
}
```

- [ ] **Step 3: Add TypeScript command wrappers**

Write `src/tauri/api.ts`:

```ts
import { invoke } from "@tauri-apps/api/core";

export type StorageInfo = {
  data_dir: string;
  data_file: string;
  assets_dir: string;
};

export type StorageError = {
  path: string;
  message: string;
};

export async function initStorage(): Promise<StorageInfo> {
  return invoke<StorageInfo>("init_storage");
}

export async function readDataFile(): Promise<string | null> {
  return invoke<string | null>("read_data");
}

export async function saveDataFile(json: string): Promise<void> {
  return invoke<void>("save_data", { request: { json } });
}
```

- [ ] **Step 4: Verify Rust build**

Run:

```bash
npm run tauri -- info
```

Expected: Tauri reports project info without Rust compile errors.

- [ ] **Step 5: Commit portable data commands**

Run:

```bash
git add src-tauri/src src/tauri/api.ts
git commit -m "feat: add portable data storage commands"
```

## Task 6: Add Zustand Store and App Initialization

**Files:**
- Create: `src/store/useCraftPlanStore.ts`
- Modify: `src/App.tsx`
- Create: `src/components/PermissionError.tsx`

- [ ] **Step 1: Implement store**

Write `src/store/useCraftPlanStore.ts`:

```ts
import { create } from "zustand";
import { createDefaultData } from "../domain/defaultData";
import type { AppStatus, CraftPlanData, Item, Recipe } from "../domain/types";
import { initStorage, readDataFile, saveDataFile, type StorageInfo } from "../tauri/api";

type CraftPlanState = {
  status: AppStatus;
  storage?: StorageInfo;
  data: CraftPlanData;
  activeScreen: string;
  initialize: () => Promise<void>;
  retryStorage: () => Promise<void>;
  setActiveScreen: (screen: string) => void;
  saveData: (next: CraftPlanData) => Promise<void>;
  upsertItem: (item: Item) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  upsertRecipe: (recipe: Recipe) => Promise<void>;
  deleteRecipe: (recipeId: string) => Promise<void>;
  setInventoryQuantity: (itemId: string, quantity: number) => Promise<void>;
};

function withUpdatedAt(data: CraftPlanData): CraftPlanData {
  return { ...data, updatedAt: new Date().toISOString() };
}

export const useCraftPlanStore = create<CraftPlanState>((set, get) => ({
  status: { kind: "loading" },
  data: createDefaultData(),
  activeScreen: "dashboard",
  initialize: async () => {
    try {
      const storage = await initStorage();
      const raw = await readDataFile();
      const data = raw ? JSON.parse(raw) as CraftPlanData : createDefaultData();
      if (!raw) await saveDataFile(JSON.stringify(data, null, 2));
      set({ storage, data: { ...data, settings: { ...data.settings, dataPath: storage.data_file, assetsPath: storage.assets_dir } }, status: { kind: "ready" } });
    } catch (error) {
      const storageError = error as { path?: string; message?: string };
      set({ status: { kind: "permission-error", path: storageError.path ?? "CraftPlanData", message: storageError.message ?? "CraftPlan needs read/write access to CraftPlanData." } });
    }
  },
  retryStorage: async () => get().initialize(),
  setActiveScreen: (screen) => set({ activeScreen: screen }),
  saveData: async (next) => {
    const data = withUpdatedAt(next);
    await saveDataFile(JSON.stringify(data, null, 2));
    set({ data });
  },
  upsertItem: async (item) => {
    const data = get().data;
    const exists = data.items.some((existing) => existing.id === item.id);
    await get().saveData({ ...data, items: exists ? data.items.map((existing) => existing.id === item.id ? item : existing) : [...data.items, item] });
  },
  deleteItem: async (itemId) => {
    const data = get().data;
    await get().saveData({
      ...data,
      items: data.items.filter((item) => item.id !== itemId),
      inventory: data.inventory.filter((entry) => entry.itemId !== itemId),
    });
  },
  upsertRecipe: async (recipe) => {
    const data = get().data;
    const recipes = data.recipes.some((existing) => existing.id === recipe.id)
      ? data.recipes.map((existing) => existing.id === recipe.id ? recipe : existing)
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
}));
```

- [ ] **Step 2: Add permission error component**

Write `src/components/PermissionError.tsx`:

```tsx
import { AlertTriangle, RefreshCw } from "lucide-react";

type PermissionErrorProps = {
  path: string;
  message: string;
  onRetry: () => void;
};

export function PermissionError({ path, message, onRetry }: PermissionErrorProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 text-zinc-100">
      <section className="w-full max-w-2xl rounded-lg border border-red-500/40 bg-red-950/30 p-6">
        <div className="flex items-start gap-4">
          <AlertTriangle className="mt-1 h-6 w-6 text-red-300" />
          <div>
            <h1 className="text-xl font-semibold">CraftPlan cannot access its data folder</h1>
            <p className="mt-3 text-sm text-red-100">{message}</p>
            <div className="mt-4 rounded-md border border-red-500/30 bg-zinc-950 p-3 font-mono text-xs text-red-100">{path}</div>
            <p className="mt-4 text-sm text-zinc-300">
              Move CraftPlan to a writable folder or allow read/write permissions for CraftPlanData, then retry.
            </p>
            <button className="mt-5 inline-flex items-center gap-2 rounded-md bg-red-300 px-4 py-2 text-sm font-medium text-red-950" onClick={onRetry}>
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 3: Wire initialization in App**

Modify `src/App.tsx`:

```tsx
import { useEffect } from "react";
import { PermissionError } from "./components/PermissionError";
import { useCraftPlanStore } from "./store/useCraftPlanStore";

export default function App() {
  const { status, initialize, retryStorage } = useCraftPlanStore();

  useEffect(() => {
    void initialize();
  }, [initialize]);

  if (status.kind === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-100">
        <p className="text-sm text-zinc-400">Loading CraftPlan...</p>
      </main>
    );
  }

  if (status.kind === "permission-error") {
    return <PermissionError path={status.path} message={status.message} onRetry={retryStorage} />;
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="p-6">
        <h1 className="text-2xl font-semibold">CraftPlan</h1>
        <p className="mt-2 text-sm text-zinc-400">Storage is ready.</p>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Verify frontend build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit store initialization**

Run:

```bash
git add src/store src/components/PermissionError.tsx src/App.tsx
git commit -m "feat: initialize app with portable storage"
```

## Task 7: Build Workbench Layout and Dashboard

**Files:**
- Create: `src/components/Layout.tsx`
- Create: `src/components/Sidebar.tsx`
- Create: `src/components/TopBar.tsx`
- Create: `src/screens/Dashboard.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create sidebar and layout components**

Write `src/components/Sidebar.tsx`:

```tsx
import { Boxes, Calculator, Gauge, Home, Package, Settings, Upload, Warehouse } from "lucide-react";

const nav = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "items", label: "Items", icon: Package },
  { id: "recipes", label: "Recipes", icon: Boxes },
  { id: "inventory", label: "Inventory", icon: Warehouse },
  { id: "calculator", label: "Calculator", icon: Calculator },
  { id: "import-export", label: "Import / Export", icon: Upload },
  { id: "settings", label: "Settings", icon: Settings },
];

type SidebarProps = {
  activeScreen: string;
  onNavigate: (screen: string) => void;
};

export function Sidebar({ activeScreen, onNavigate }: SidebarProps) {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="border-b border-zinc-800 px-5 py-4">
        <div className="flex items-center gap-2">
          <Gauge className="h-5 w-5 text-emerald-300" />
          <span className="text-lg font-semibold">CraftPlan</span>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = activeScreen === item.id;
          return (
            <button
              key={item.id}
              className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm ${active ? "bg-emerald-400 text-zinc-950" : "text-zinc-300 hover:bg-zinc-900"}`}
              onClick={() => onNavigate(item.id)}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
```

Write `src/components/TopBar.tsx`:

```tsx
type TopBarProps = {
  title: string;
  subtitle?: string;
};

export function TopBar({ title, subtitle }: TopBarProps) {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950/95 px-6 py-4">
      <h1 className="text-xl font-semibold text-zinc-100">{title}</h1>
      {subtitle ? <p className="mt-1 text-sm text-zinc-400">{subtitle}</p> : null}
    </header>
  );
}
```

Write `src/components/Layout.tsx`:

```tsx
import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

type LayoutProps = {
  activeScreen: string;
  title: string;
  subtitle?: string;
  onNavigate: (screen: string) => void;
  children: ReactNode;
};

export function Layout({ activeScreen, title, subtitle, onNavigate, children }: LayoutProps) {
  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      <Sidebar activeScreen={activeScreen} onNavigate={onNavigate} />
      <section className="flex min-w-0 flex-1 flex-col">
        <TopBar title={title} subtitle={subtitle} />
        <div className="min-h-0 flex-1 overflow-auto p-6">{children}</div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Create Dashboard screen**

Write `src/screens/Dashboard.tsx`:

```tsx
import { useCraftPlanStore } from "../store/useCraftPlanStore";

export function Dashboard() {
  const { data, setActiveScreen } = useCraftPlanStore();
  const stockedCount = data.inventory.filter((entry) => entry.quantity > 0).length;
  const empty = data.items.length === 0 && data.recipes.length === 0 && data.inventory.length === 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Items" value={data.items.length} />
        <Stat label="Recipes" value={data.recipes.length} />
        <Stat label="Stocked Items" value={stockedCount} />
      </div>
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Quick actions</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {[
            ["Add Item", "items"],
            ["Add Recipe", "recipes"],
            ["Open Inventory", "inventory"],
            ["Open Calculator", "calculator"],
            ["Import / Export", "import-export"],
            ["Settings", "settings"],
          ].map(([label, screen]) => (
            <button key={screen} className="rounded-md border border-zinc-800 bg-zinc-900 px-4 py-3 text-left text-sm hover:border-emerald-300" onClick={() => setActiveScreen(screen)}>
              {label}
            </button>
          ))}
        </div>
      </section>
      {empty ? (
        <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="font-semibold">Getting started</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-zinc-300">
            <li>Add items.</li>
            <li>Add recipes.</li>
            <li>Add inventory quantities.</li>
            <li>Use the craft calculator.</li>
          </ol>
        </section>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="text-sm text-zinc-400">{label}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
    </div>
  );
}
```

- [ ] **Step 3: Wire screen routing**

Modify `src/App.tsx` to render `Layout` and `Dashboard` after storage is ready:

```tsx
import { useEffect } from "react";
import { Layout } from "./components/Layout";
import { PermissionError } from "./components/PermissionError";
import { Dashboard } from "./screens/Dashboard";
import { useCraftPlanStore } from "./store/useCraftPlanStore";

const screenTitles: Record<string, string> = {
  dashboard: "Dashboard",
  items: "Items",
  recipes: "Recipes",
  inventory: "Inventory",
  calculator: "Calculator",
  "import-export": "Import / Export",
  settings: "Settings",
};

export default function App() {
  const { status, activeScreen, initialize, retryStorage, setActiveScreen } = useCraftPlanStore();

  useEffect(() => {
    void initialize();
  }, [initialize]);

  if (status.kind === "loading") {
    return <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-100"><p className="text-sm text-zinc-400">Loading CraftPlan...</p></main>;
  }

  if (status.kind === "permission-error") {
    return <PermissionError path={status.path} message={status.message} onRetry={retryStorage} />;
  }

  return (
    <Layout activeScreen={activeScreen} title={screenTitles[activeScreen]} onNavigate={setActiveScreen}>
      {activeScreen === "dashboard" ? <Dashboard /> : <div className="text-sm text-zinc-400">Use the sidebar to open each CraftPlan workspace.</div>}
    </Layout>
  );
}
```

- [ ] **Step 4: Verify build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit workbench layout**

Run:

```bash
git add src/components src/screens/Dashboard.tsx src/App.tsx
git commit -m "feat: add CraftPlan workbench dashboard"
```

## Task 8: Build Items Manager with Image Upload Hook Points

**Files:**
- Create: `src/components/Modal.tsx`
- Create: `src/components/ItemBadge.tsx`
- Create: `src/screens/Items.tsx`
- Modify: `src/App.tsx`
- Modify: `src-tauri/src/portable_data.rs`
- Modify: `src-tauri/src/main.rs`
- Modify: `src/tauri/api.ts`

- [ ] **Step 1: Add asset copy command**

Extend `src-tauri/src/portable_data.rs` with:

```rust
#[derive(Debug, Deserialize)]
pub struct CopyAssetRequest {
    pub source_path: String,
    pub file_name: String,
}

#[derive(Debug, Serialize)]
pub struct CopiedAsset {
    pub relative_path: String,
}

#[tauri::command]
pub fn copy_item_asset(app: AppHandle, request: CopyAssetRequest) -> Result<CopiedAsset, StorageError> {
    let root = data_dir(&app).map_err(|message| StorageError { path: "CraftPlanData".into(), message })?;
    let extension = Path::new(&request.file_name)
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("")
        .to_lowercase();
    if !["png", "jpg", "jpeg", "webp"].contains(&extension.as_str()) {
        return Err(StorageError { path: request.source_path, message: "Supported image formats are PNG, JPG, JPEG, and WEBP.".into() });
    }
    let metadata = fs::metadata(&request.source_path).map_err(|error| StorageError {
        path: request.source_path.clone(),
        message: format!("Could not read selected image: {error}"),
    })?;
    if metadata.len() > 5 * 1024 * 1024 {
        return Err(StorageError { path: request.source_path, message: "Image must be 5 MB or smaller.".into() });
    }
    let safe_name = request.file_name.replace(['\\', '/', ':', '*', '?', '"', '<', '>', '|'], "-");
    let relative = format!("assets/items/{safe_name}");
    let destination = root.join(&relative);
    fs::copy(&request.source_path, &destination).map_err(|error| StorageError {
        path: destination.display().to_string(),
        message: format!("Could not copy image into CraftPlanData: {error}"),
    })?;
    Ok(CopiedAsset { relative_path: relative })
}
```

Register `copy_item_asset` in `src-tauri/src/main.rs`.

Extend `src/tauri/api.ts`:

```ts
export async function copyItemAsset(sourcePath: string, fileName: string): Promise<{ relative_path: string }> {
  return invoke("copy_item_asset", { request: { source_path: sourcePath, file_name: fileName } });
}
```

- [ ] **Step 2: Create reusable item badge**

Write `src/components/ItemBadge.tsx`:

```tsx
import type { Item } from "../domain/types";

export function ItemBadge({ item, quantity }: { item?: Item; quantity?: number }) {
  if (!item) return <span className="inline-flex items-center gap-2 text-zinc-500">?</span>;
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-zinc-800 text-sm">
        {item.imageMode === "emoji" && item.emoji ? item.emoji : item.name.slice(0, 1).toUpperCase()}
      </span>
      <span className="min-w-0 truncate">{item.name}</span>
      {quantity !== undefined ? <span className="text-xs text-zinc-400">x{quantity}</span> : null}
    </span>
  );
}
```

Write `src/components/Modal.tsx`:

```tsx
import type { ReactNode } from "react";

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <section className="w-full max-w-2xl rounded-lg border border-zinc-800 bg-zinc-950 shadow-xl">
        <header className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <h2 className="font-semibold">{title}</h2>
          <button className="rounded-md px-2 py-1 text-sm text-zinc-400 hover:bg-zinc-800" onClick={onClose}>Close</button>
        </header>
        <div className="p-5">{children}</div>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Build Items screen**

Write `src/screens/Items.tsx` with local form state, search, category filter, duplicate warnings, delete confirmation using `window.confirm`, and image modes. The submit handler must create or update an `Item` with trimmed name and call `upsertItem`.

Use this form state shape:

```ts
type ItemForm = {
  id?: string;
  name: string;
  category: string;
  note: string;
  imageMode: "none" | "emoji" | "file";
  emoji: string;
  imagePath?: string;
};
```

When deleting an item, check:

```ts
const used = data.recipes.some((recipe) => recipe.outputItemId === item.id || recipe.ingredients.some((ingredient) => ingredient.itemId === item.id));
const confirmed = !used || window.confirm("This item is used in recipes. Delete it and remove related inventory anyway?");
```

- [ ] **Step 4: Wire Items screen**

Modify `src/App.tsx` so `activeScreen === "items"` renders `<Items />`.

- [ ] **Step 5: Verify build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit Items manager**

Run:

```bash
git add src-tauri/src src/tauri/api.ts src/components src/screens/Items.tsx src/App.tsx
git commit -m "feat: add items manager"
```

## Task 9: Build Recipe Manager

**Files:**
- Create: `src/components/SearchSelect.tsx`
- Create: `src/screens/Recipes.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create searchable item select**

Write `src/components/SearchSelect.tsx`:

```tsx
import type { Item } from "../domain/types";
import { ItemBadge } from "./ItemBadge";

export function SearchSelect({ items, value, onChange }: { items: Item[]; value: string; onChange: (itemId: string) => void }) {
  return (
    <select className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">Select item</option>
      {items.map((item) => (
        <option key={item.id} value={item.id}>{item.name}</option>
      ))}
    </select>
  );
}

export function SelectedItemPreview({ item }: { item?: Item }) {
  return <div className="mt-2 text-sm text-zinc-300"><ItemBadge item={item} /></div>;
}
```

- [ ] **Step 2: Build Recipes screen**

Write `src/screens/Recipes.tsx`. It must:

- list recipes with output item and ingredients
- search by recipe name or output item name
- add/edit/delete/duplicate recipes
- choose output item and output quantity
- add/remove ingredient rows
- validate with `validateRecipeDraft`
- prevent direct self-recipes
- show cycle warning from `detectRecipeCycle`
- allow marking recipe as default by clearing `isDefault` on other recipes for the same output item before saving

Use this save rule:

```ts
const nextRecipes = data.recipes.map((recipe) =>
  draft.isDefault && recipe.outputItemId === draft.outputItemId ? { ...recipe, isDefault: false } : recipe
);
await saveData({ ...data, recipes: nextRecipes });
await upsertRecipe(recipeToSave);
```

- [ ] **Step 3: Wire Recipes screen**

Modify `src/App.tsx` so `activeScreen === "recipes"` renders `<Recipes />`.

- [ ] **Step 4: Verify build and tests**

Run:

```bash
npm run build
npm test
```

Expected: both PASS.

- [ ] **Step 5: Commit Recipe manager**

Run:

```bash
git add src/components/SearchSelect.tsx src/screens/Recipes.tsx src/App.tsx
git commit -m "feat: add recipe manager"
```

## Task 10: Build Inventory Manager

**Files:**
- Create: `src/screens/Inventory.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Build Inventory screen**

Write `src/screens/Inventory.tsx`. It must:

- list all items in a compact table
- show item badge, category, and quantity
- search by item name
- filter by category
- filter stocked items only
- provide minus, plus, and direct numeric input
- call `setInventoryQuantity(item.id, nextQuantity)`

Use this quantity lookup:

```ts
const quantityFor = (itemId: string) => data.inventory.find((entry) => entry.itemId === itemId)?.quantity ?? 0;
```

Use this update rule:

```ts
const next = Math.max(0, Math.floor(Number(value) || 0));
void setInventoryQuantity(itemId, next);
```

- [ ] **Step 2: Wire Inventory screen**

Modify `src/App.tsx` so `activeScreen === "inventory"` renders `<Inventory />`.

- [ ] **Step 3: Verify build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 4: Commit Inventory manager**

Run:

```bash
git add src/screens/Inventory.tsx src/App.tsx
git commit -m "feat: add inventory manager"
```

## Task 11: Build Craft Calculator

**Files:**
- Create: `src/screens/Calculator.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Build Calculator screen**

Write `src/screens/Calculator.tsx`. It must:

- select target item
- enter target quantity
- choose Direct, Expanded, or Smart mode
- choose a recipe when multiple recipes exist for the target
- call `calculateDirectRequirements`, `calculateExpandedRequirements`, or `calculateSmartRequirements`
- show required materials, consumed materials, missing materials, intermediate crafts, warnings, errors, and craftable status
- disable Crafted when result is missing, invalid, or not craftable
- on Crafted, call `applyCraftResult` and `saveData` with updated inventory

Use this mode type:

```ts
type CalculatorMode = "direct" | "expanded" | "smart";
```

Use this calculation switch:

```ts
const result =
  mode === "direct"
    ? calculateDirectRequirements(targetItemId, quantity, data.recipes, selectedRecipeId, data.inventory)
    : mode === "expanded"
      ? calculateExpandedRequirements(targetItemId, quantity, data.recipes, selectedRecipeId, data.inventory)
      : calculateSmartRequirements(targetItemId, quantity, data.recipes, data.inventory, selectedRecipeId);
```

- [ ] **Step 2: Wire Calculator screen**

Modify `src/App.tsx` so `activeScreen === "calculator"` renders `<Calculator />`.

- [ ] **Step 3: Verify build and tests**

Run:

```bash
npm run build
npm test
```

Expected: both PASS.

- [ ] **Step 4: Commit Calculator**

Run:

```bash
git add src/screens/Calculator.tsx src/App.tsx
git commit -m "feat: add craft calculator"
```

## Task 12: Build Import, Export, Backup, and Package Commands

**Files:**
- Modify: `src-tauri/src/portable_data.rs`
- Modify: `src-tauri/src/main.rs`
- Modify: `src/tauri/api.ts`
- Create: `src/screens/ImportExport.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add backup and export commands**

Extend Rust commands with:

```rust
#[tauri::command]
pub fn create_backup(app: AppHandle) -> Result<String, StorageError> {
    let root = data_dir(&app).map_err(|message| StorageError { path: "CraftPlanData".into(), message })?;
    let source = root.join("data.json");
    let stamp = chrono::Local::now().format("backup-%Y-%m-%d-%H-%M-%S.json").to_string();
    let destination = root.join("backups").join(stamp);
    fs::copy(&source, &destination).map_err(|error| StorageError {
        path: destination.display().to_string(),
        message: format!("Could not create backup: {error}"),
    })?;
    Ok(destination.display().to_string())
}
```

Add `chrono = "0.4"` to `src-tauri/Cargo.toml`.

Add package ZIP commands using the existing `zip` crate:

- `export_full_package(app: AppHandle) -> Result<String, StorageError>`
- `import_full_package(app: AppHandle, package_path: String) -> Result<(), StorageError>`

The export command writes to `CraftPlanData/exports/craftplan-export-YYYY-MM-DD-HH-mm-ss.zip` and includes `data.json` plus files under `assets/`.

- [ ] **Step 2: Add TypeScript command wrappers**

Extend `src/tauri/api.ts`:

```ts
export async function createBackup(): Promise<string> {
  return invoke<string>("create_backup");
}

export async function exportFullPackage(): Promise<string> {
  return invoke<string>("export_full_package");
}

export async function importFullPackage(packagePath: string): Promise<void> {
  return invoke<void>("import_full_package", { packagePath });
}
```

- [ ] **Step 3: Build Import / Export screen**

Write `src/screens/ImportExport.tsx`. It must:

- show JSON export with `buildJsonExport`
- show warning that JSON export excludes images
- allow paste/import JSON text with validation preview
- allow Replace after creating backup
- allow Merge using `mergeImportedData`
- call full package export/import commands
- show item, recipe, inventory counts before applying import

- [ ] **Step 4: Wire Import / Export screen**

Modify `src/App.tsx` so `activeScreen === "import-export"` renders `<ImportExport />`.

- [ ] **Step 5: Verify build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit import/export and backup**

Run:

```bash
git add src-tauri src/tauri/api.ts src/screens/ImportExport.tsx src/App.tsx
git commit -m "feat: add import export and backups"
```

## Task 13: Build Settings and Theme Support

**Files:**
- Create: `src/screens/Settings.tsx`
- Modify: `src/App.tsx`
- Modify: `src/store/useCraftPlanStore.ts`
- Modify: `src-tauri/src/portable_data.rs`
- Modify: `src/tauri/api.ts`

- [ ] **Step 1: Add open folder command wrappers**

Use `tauri-plugin-opener` from the frontend wrappers:

```ts
import { openPath } from "@tauri-apps/plugin-opener";

export async function openFolder(path: string): Promise<void> {
  await openPath(path);
}
```

- [ ] **Step 2: Add theme setter to store**

Extend `useCraftPlanStore.ts`:

```ts
setTheme: (theme: ThemeMode) => Promise<void>;
```

Implementation:

```ts
setTheme: async (theme) => {
  const data = get().data;
  await get().saveData({ ...data, settings: { ...data.settings, theme } });
}
```

- [ ] **Step 3: Build Settings screen**

Write `src/screens/Settings.tsx`. It must show:

- app version
- data file path
- assets folder path
- theme select
- open data folder
- open assets folder
- create backup
- reset all data with confirmation and backup
- load sample data
- clear sample data by removing entries that match the stable sample IDs

Use `createSampleData()` for sample loading and `createDefaultData()` for reset.

- [ ] **Step 4: Wire Settings screen**

Modify `src/App.tsx` so `activeScreen === "settings"` renders `<Settings />`.

- [ ] **Step 5: Verify build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit settings**

Run:

```bash
git add src/screens/Settings.tsx src/App.tsx src/store/useCraftPlanStore.ts src/tauri/api.ts
git commit -m "feat: add settings and sample data controls"
```

## Task 14: README, Final Verification, and Portable Build

**Files:**
- Create: `README.md`
- Modify: files only if verification exposes defects.

- [ ] **Step 1: Write README**

Write `README.md` with these sections:

```md
# CraftPlan

CraftPlan is an offline Windows desktop crafting planner and inventory tracker for user-defined items and recipes.

## Features

- Manual item, recipe, and inventory management
- Optional item emoji or uploaded image
- Direct, expanded, and smart recipe calculation
- Missing material reporting
- Craft result application to inventory
- JSON import/export
- Full project package import/export with assets
- Portable `CraftPlanData` storage beside the app

## Development

Run `npm install`, then `npm run tauri:dev`.

## Build

Run `npm run tauri:build`.

## Portable Usage

Keep `CraftPlan.exe` and `CraftPlanData/` together. CraftPlan requires read/write access to `CraftPlanData`. If Windows blocks access, the app shows a permission error with the exact folder path.

## Data Storage

CraftPlan stores data in `CraftPlanData/data.json`. Uploaded images are copied into `CraftPlanData/assets/items/` and referenced by relative path.

## Recipe Calculation

Direct mode uses only the selected recipe's direct ingredients. Expanded mode recursively breaks craftable ingredients into base materials. Smart mode uses the expanded calculation with inventory-aware material availability reporting.

## Import And Export

JSON export includes structured data and excludes image files. Full package export includes `data.json` and assets so the project can be moved to another machine.

## Known Limitations

Automatic best-recipe optimization is not included. The app uses the default recipe unless the user selects another recipe.

## Troubleshooting

If CraftPlan cannot write data, move the app to a writable folder or grant read/write permission to `CraftPlanData`.
```

- [ ] **Step 2: Run full verification**

Run:

```bash
npm test
npm run build
npm run tauri:build
```

Expected:

- Vitest PASS.
- Vite/TypeScript build PASS.
- Tauri build creates Windows artifacts under `src-tauri/target/release`.

- [ ] **Step 3: Inspect portable artifacts**

Run:

```bash
Get-ChildItem -Recurse -Path src-tauri/target/release | Where-Object { $_.Name -match 'CraftPlan|craftplan|\\.exe$' } | Select-Object FullName,Length
```

Expected: at least one executable artifact is present.

- [ ] **Step 4: Commit README and final fixes**

Run:

```bash
git add README.md package.json package-lock.json src src-tauri
git commit -m "docs: add CraftPlan usage and build guide"
```

## Self-Review Notes

- Spec coverage: project scaffold, portable-only storage, permission errors, item CRUD, image copying, recipe CRUD, inventory, direct/expanded/smart calculator, import/export, backups, settings, sample data, tests, README, and portable build are covered.
- MVP stretch handling: generated thumbnails, unused asset cleanup, and automatic best-recipe optimization are not blockers. The app must still copy uploaded images into portable assets and display them safely.
- Risk: Tauri 2 plugin APIs and ZIP command details must be compile-verified during implementation. Keep corrections inside the planned Rust command layer and preserve the portable-only storage rule.
