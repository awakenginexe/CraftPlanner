import { describe, expect, it } from "vitest";
import egoGiftData from "../../test-data/ego-gift-craftplan-data.json";
import { calculateDirectRequirements } from "../domain/calculation";
import type { CraftPlanData } from "../domain/types";
import { validateImportData } from "../domain/validation";

const data = egoGiftData as CraftPlanData;

describe("EGO Gift Google Sheet import data", () => {
  it("is valid CraftPlanner data with party-member column ignored", () => {
    const validation = validateImportData(data);

    expect(validation.ok).toBe(true);
    expect(data.items).toHaveLength(41);
    expect(data.recipes).toHaveLength(9);
    expect(data.inventory).toHaveLength(19);
    expect(data.items.some((item) => item.name === "แตง" || item.name === "ดาส")).toBe(false);
  });

  it("derives inventory by adding column C owned counts and column D leftovers", () => {
    const inventory = Object.fromEntries(data.inventory.map((entry) => [entry.itemId, entry.quantity]));

    expect(inventory["material-dark-desire"]).toBe(7);
    expect(inventory["material-faint-desire"]).toBe(11);
    expect(inventory["material-twinkling-desire"]).toBe(4);
    expect(inventory["material-lunar-wrath"]).toBe(2);
    expect(inventory["material-dark-pride"]).toBe(11);
  });

  it("calculates a sheet recipe using required quantities and imported inventory", () => {
    const target = data.items.find((item) => item.name === "Rusted muzzle");
    expect(target).toBeDefined();

    const result = calculateDirectRequirements(target!.id, 1, data.recipes, undefined, data.inventory);

    expect(result.requiredMaterials).toMatchObject({
      "material-rope": 4,
      "material-dark-desire": 4,
      "material-faint-desire": 2,
      "material-twinkling-desire": 1,
      "material-scrap-metal": 2
    });
    expect(result.missingMaterials).toEqual({
      "material-rope": 4,
      "material-scrap-metal": 2
    });
    expect(result.craftable).toBe(false);
  });
});
