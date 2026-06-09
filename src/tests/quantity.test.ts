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
    expect(sumQuantityMap([{ itemId: "wood", quantity: 2 }, { itemId: "wood", quantity: 3 }])).toEqual({ wood: 5 });
  });
});
