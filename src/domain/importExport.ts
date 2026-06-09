import type { CraftPlanData, ImportPreview, Item } from "./types";
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
    settings: data.settings
  };
}

export function parseJsonImport(text: string) {
  try {
    return validateImportData(JSON.parse(text));
  } catch {
    return { ok: false, errors: ["Import file is not valid JSON."], warnings: [], value: undefined };
  }
}

export function previewImport(data: CraftPlanData, hasAssets = false): ImportPreview {
  return {
    items: data.items.length,
    recipes: data.recipes.length,
    inventory: data.inventory.length,
    hasAssets
  };
}

function withUniqueName(item: Item, existingNames: Set<string>, warnings: string[]): Item {
  if (!existingNames.has(item.name.toLowerCase())) {
    existingNames.add(item.name.toLowerCase());
    return item;
  }
  let suffix = 1;
  let renamed = `${item.name} (imported)`;
  while (existingNames.has(renamed.toLowerCase())) {
    suffix += 1;
    renamed = `${item.name} (imported ${suffix})`;
  }
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
      updatedAt: now
    },
    warnings
  };
}
