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
