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
  updatedAt: now
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
  item("coal", "Coal", "Fuel", "C")
];

export const sampleRecipes: Recipe[] = [
  { id: "recipe-plank", outputItemId: "plank", outputQuantity: 4, ingredients: [{ itemId: "wood-log", quantity: 1 }], isDefault: true, createdAt: now, updatedAt: now },
  { id: "recipe-stick", outputItemId: "stick", outputQuantity: 4, ingredients: [{ itemId: "plank", quantity: 2 }], isDefault: true, createdAt: now, updatedAt: now },
  { id: "recipe-wooden-pickaxe", outputItemId: "wooden-pickaxe", outputQuantity: 1, ingredients: [{ itemId: "plank", quantity: 3 }, { itemId: "stick", quantity: 2 }], isDefault: true, createdAt: now, updatedAt: now },
  { id: "recipe-stone-pickaxe", outputItemId: "stone-pickaxe", outputQuantity: 1, ingredients: [{ itemId: "stone", quantity: 3 }, { itemId: "stick", quantity: 2 }], isDefault: true, createdAt: now, updatedAt: now },
  { id: "recipe-iron-sword", outputItemId: "iron-sword", outputQuantity: 1, ingredients: [{ itemId: "iron-ingot", quantity: 2 }, { itemId: "stick", quantity: 1 }], isDefault: true, createdAt: now, updatedAt: now },
  { id: "recipe-furnace", outputItemId: "furnace", outputQuantity: 1, ingredients: [{ itemId: "stone", quantity: 8 }], isDefault: true, createdAt: now, updatedAt: now },
  { id: "recipe-iron-ingot", outputItemId: "iron-ingot", outputQuantity: 1, ingredients: [{ itemId: "iron-ore", quantity: 1 }, { itemId: "coal", quantity: 1 }], isDefault: true, createdAt: now, updatedAt: now }
];

export const sampleInventory: InventoryEntry[] = [
  { itemId: "wood-log", quantity: 10 },
  { itemId: "stone", quantity: 20 },
  { itemId: "iron-ore", quantity: 5 },
  { itemId: "coal", quantity: 5 }
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
    updatedAt: now
  };
}

export const sampleIds = new Set([
  ...sampleItems.map((item) => item.id),
  ...sampleRecipes.map((recipe) => recipe.id)
]);
