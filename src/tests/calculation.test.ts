import { describe, expect, it } from "vitest";
import {
  applyCraftResult,
  calculateDirectRequirements,
  calculateExpandedRequirements,
  calculateMissingMaterials,
  calculateSmartRequirements,
  canCraft,
  detectRecipeCycle
} from "../domain/calculation";
import type { InventoryEntry, Recipe } from "../domain/types";

const recipes: Recipe[] = [
  { id: "plank", outputItemId: "plank", outputQuantity: 4, ingredients: [{ itemId: "wood", quantity: 1 }], isDefault: true, createdAt: "", updatedAt: "" },
  { id: "stick", outputItemId: "stick", outputQuantity: 4, ingredients: [{ itemId: "plank", quantity: 2 }], isDefault: true, createdAt: "", updatedAt: "" },
  { id: "chest", outputItemId: "chest", outputQuantity: 1, ingredients: [{ itemId: "plank", quantity: 8 }], isDefault: true, createdAt: "", updatedAt: "" }
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

  it("calculates smart inventory-aware requirements", () => {
    const result = calculateSmartRequirements("chest", 1, recipes, [{ itemId: "plank", quantity: 3 }, { itemId: "wood", quantity: 2 }]);
    expect(result.requiredMaterials).toEqual({ wood: 2 });
    expect(result.consumedMaterials).toEqual({ plank: 3, wood: 2 });
    expect(result.missingMaterials).toEqual({});
    expect(result.craftable).toBe(true);
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
      { id: "c", outputItemId: "c", outputQuantity: 1, ingredients: [{ itemId: "a", quantity: 1 }], createdAt: "", updatedAt: "" }
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
    expect(updated).toEqual([{ itemId: "plank", quantity: 5 }, { itemId: "wood", quantity: 1 }]);
  });
});
