export type ThemeMode = "dark" | "light" | "system";
export type ImageMode = "none" | "emoji" | "file";

export type CraftPlanData = {
  appVersion: string;
  dataVersion: number;
  items: Item[];
  recipes: Recipe[];
  inventory: InventoryEntry[];
  settings: AppSettings;
  createdAt: string;
  updatedAt: string;
};

export type Item = {
  id: string;
  name: string;
  category?: string;
  note?: string;
  imageMode: ImageMode;
  emoji?: string;
  imagePath?: string;
  thumbnailPath?: string;
  createdAt: string;
  updatedAt: string;
};

export type Recipe = {
  id: string;
  name?: string;
  outputItemId: string;
  outputQuantity: number;
  ingredients: RecipeIngredient[];
  note?: string;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RecipeIngredient = {
  itemId: string;
  quantity: number;
};

export type InventoryEntry = {
  itemId: string;
  quantity: number;
};

export type AppSettings = {
  theme: ThemeMode;
  dataPath?: string;
  assetsPath?: string;
};

export type QuantityMap = Record<string, number>;

export type AppStatus =
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "permission-error"; path: string; message: string }
  | { kind: "error"; message: string };

export type ImportPreview = {
  items: number;
  recipes: number;
  inventory: number;
  hasAssets: boolean;
};
