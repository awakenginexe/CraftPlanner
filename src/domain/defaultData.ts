import type { CraftPlanData } from "./types";

export const APP_VERSION = "1.1.0";
export const DATA_VERSION = 1;

export function createDefaultData(now = new Date().toISOString()): CraftPlanData {
  return {
    appVersion: APP_VERSION,
    dataVersion: DATA_VERSION,
    items: [],
    recipes: [],
    inventory: [],
    settings: {
      theme: "dark"
    },
    createdAt: now,
    updatedAt: now
  };
}
