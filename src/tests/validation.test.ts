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
