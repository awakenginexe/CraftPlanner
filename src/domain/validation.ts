import type { CraftPlanData, Item, RecipeIngredient } from "./types";

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
