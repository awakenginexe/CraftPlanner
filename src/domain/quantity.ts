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

export function subtractQuantity(map: QuantityMap, itemId: string, quantity: number): QuantityMap {
  const normalized = normalizeQuantity(quantity);
  const next = Math.max(0, (map[itemId] ?? 0) - normalized);
  return next > 0 ? { ...map, [itemId]: next } : Object.fromEntries(Object.entries(map).filter(([key]) => key !== itemId));
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
