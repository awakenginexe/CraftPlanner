import type { InventoryEntry, QuantityMap, Recipe } from "./types";
import { addQuantity, batchesFor, normalizeQuantity, quantityMapToEntries, subtractQuantity } from "./quantity";

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
  craftable: errors.length === 0
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

export function calculateDirectRequirements(
  targetItemId: string,
  quantity: number,
  recipes: Recipe[],
  selectedRecipeId?: string,
  inventory?: InventoryEntry[]
): CalculationResult {
  const recipe = getRecipeForItem(targetItemId, recipes, selectedRecipeId);
  if (!recipe) return emptyResult(["No recipe available for this item."]);

  const batches = batchesFor(quantity, recipe.outputQuantity);
  const requiredMaterials = recipe.ingredients.reduce<QuantityMap>((acc, ingredient) => addQuantity(acc, ingredient.itemId, ingredient.quantity * batches), {});
  const missingMaterials = inventory ? calculateMissingMaterials(requiredMaterials, inventory) : {};

  return {
    requiredMaterials,
    consumedMaterials: requiredMaterials,
    missingMaterials,
    intermediateCrafts: [{ itemId: targetItemId, requestedQuantity: normalizeQuantity(quantity), producedQuantity: batches * recipe.outputQuantity, batches }],
    warnings: [],
    errors: [],
    craftable: Object.keys(missingMaterials).length === 0
  };
}

export function calculateExpandedRequirements(
  targetItemId: string,
  quantity: number,
  recipes: Recipe[],
  selectedRecipeId?: string,
  inventory?: InventoryEntry[]
): CalculationResult {
  const cycles = detectRecipeCycle(recipes);
  if (cycles.length > 0) return emptyResult([`Circular recipe detected: ${cycles[0].join(" -> ")}`]);

  const intermediateCrafts: IntermediateCraft[] = [];

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
      batches
    });

    return recipe.ingredients.reduce<QuantityMap>((acc, ingredient) => {
      const nested = expand(ingredient.itemId, ingredient.quantity * batches, false);
      if (!nested) return acc;
      return Object.entries(nested).reduce<QuantityMap>((nestedAcc, [nestedItemId, nestedQuantity]) => addQuantity(nestedAcc, nestedItemId, nestedQuantity), acc);
    }, {});
  };

  const requiredMaterials = expand(targetItemId, quantity, true);
  if (!requiredMaterials) return emptyResult(["No recipe available for this item."]);

  const missingMaterials = inventory ? calculateMissingMaterials(requiredMaterials, inventory) : {};
  return {
    requiredMaterials,
    consumedMaterials: requiredMaterials,
    missingMaterials,
    intermediateCrafts,
    warnings: [],
    errors: [],
    craftable: Object.keys(missingMaterials).length === 0
  };
}

export function calculateSmartRequirements(
  targetItemId: string,
  quantity: number,
  recipes: Recipe[],
  inventory: InventoryEntry[],
  selectedRecipeId?: string
): CalculationResult {
  const cycles = detectRecipeCycle(recipes);
  if (cycles.length > 0) return emptyResult([`Circular recipe detected: ${cycles[0].join(" -> ")}`]);

  let remainingInventory = inventoryToMap(inventory);
  let consumedMaterials: QuantityMap = {};
  let requiredMaterials: QuantityMap = {};
  const intermediateCrafts: IntermediateCraft[] = [];

  const requireItem = (itemId: string, needed: number, isTarget: boolean): boolean => {
    let remainingNeeded = normalizeQuantity(needed);
    const recipe = getRecipeForItem(itemId, recipes, isTarget ? selectedRecipeId : undefined);
    if (!recipe) {
      if (isTarget) return false;
      requiredMaterials = addQuantity(requiredMaterials, itemId, remainingNeeded);
      const available = Math.min(remainingInventory[itemId] ?? 0, remainingNeeded);
      if (available > 0) {
        consumedMaterials = addQuantity(consumedMaterials, itemId, available);
        remainingInventory = subtractQuantity(remainingInventory, itemId, available);
      }
      return true;
    }

    if (!isTarget) {
      const available = Math.min(remainingInventory[itemId] ?? 0, remainingNeeded);
      if (available > 0) {
        consumedMaterials = addQuantity(consumedMaterials, itemId, available);
        remainingInventory = subtractQuantity(remainingInventory, itemId, available);
        remainingNeeded -= available;
      }
    }
    if (remainingNeeded <= 0) return true;

    const batches = batchesFor(remainingNeeded, recipe.outputQuantity);
    intermediateCrafts.push({
      itemId,
      requestedQuantity: remainingNeeded,
      producedQuantity: batches * recipe.outputQuantity,
      batches
    });
    for (const ingredient of recipe.ingredients) {
      if (!requireItem(ingredient.itemId, ingredient.quantity * batches, false)) return false;
    }
    return true;
  };

  if (!requireItem(targetItemId, quantity, true)) return emptyResult(["No recipe available for this item."]);

  const craftable = Object.keys(calculateMissingMaterials(requiredMaterials, inventory)).length === 0;
  return {
    requiredMaterials,
    consumedMaterials,
    missingMaterials: craftable ? {} : calculateMissingMaterials(requiredMaterials, inventory),
    intermediateCrafts,
    warnings: ["Smart mode uses available intermediate items before calculating lower-level materials."],
    errors: [],
    craftable
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
      cycles.push(path.slice(start));
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
