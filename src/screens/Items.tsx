import { ImagePlus, Pencil, Plus, Trash2, Search, Tag } from "lucide-react";
import { useMemo, useState } from "react";
import { createId, slugifyFileName } from "../domain/ids";
import type { ImageMode, Item } from "../domain/types";
import { validateItemDraft } from "../domain/validation";
import { chooseImageFile, copyItemAsset } from "../tauri/api";
import { ItemBadge } from "../components/ItemBadge";
import { Modal } from "../components/Modal";
import { Button, DangerButton, Field, Input, SecondaryButton, Select, Textarea } from "../components/ui";
import { useCraftPlanStore } from "../store/useCraftPlanStore";
import { motion, AnimatePresence } from "framer-motion";

type ItemForm = {
  id?: string;
  name: string;
  category: string;
  note: string;
  imageMode: ImageMode;
  emoji: string;
  imagePath?: string;
};

const emptyForm: ItemForm = { name: "", category: "", note: "", imageMode: "none", emoji: "" };

export function Items() {
  const { data, upsertItem, deleteItem } = useCraftPlanStore();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [form, setForm] = useState<ItemForm | null>(null);
  const [message, setMessage] = useState("");

  const categories = useMemo(() => Array.from(new Set(data.items.map((item) => item.category).filter(Boolean))).sort() as string[], [data.items]);
  const filtered = data.items.filter((item) => {
    const matchesQuery = item.name.toLowerCase().includes(query.toLowerCase()) || item.category?.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (!category || item.category === category);
  });

  const usedByRecipe = (itemId: string) => data.recipes.some((recipe) => recipe.outputItemId === itemId || recipe.ingredients.some((ingredient) => ingredient.itemId === itemId));

  async function selectImage() {
    if (!form) return;
    const source = await chooseImageFile();
    if (!source) return;
    const original = source.split(/[\\/]/).pop() ?? "item.png";
    const extension = original.split(".").pop() ?? "png";
    const fileName = slugifyFileName(form.name || "item", extension);
    const copied = await copyItemAsset(source, fileName);
    setForm({ ...form, imageMode: "file", imagePath: copied.relative_path });
  }

  async function save() {
    if (!form) return;
    const validation = validateItemDraft({ name: form.name }, data.items, form.id);
    if (!validation.ok || !validation.value) {
      setMessage(validation.errors.join(" "));
      return;
    }
    const now = new Date().toISOString();
    const existing = form.id ? data.items.find((item) => item.id === form.id) : undefined;
    const item: Item = {
      id: form.id ?? createId(),
      name: validation.value.name,
      category: form.category.trim() || undefined,
      note: form.note.trim() || undefined,
      imageMode: form.imageMode,
      emoji: form.imageMode === "emoji" ? form.emoji || undefined : undefined,
      imagePath: form.imageMode === "file" ? form.imagePath : undefined,
      thumbnailPath: existing?.thumbnailPath,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };
    await upsertItem(item);
    setMessage(validation.warnings[0] ?? "Item saved.");
    setForm(null);
  }

  async function remove(item: Item) {
    const used = usedByRecipe(item.id);
    const confirmed = !used || window.confirm("This item is used in recipes. Delete it, related recipe references, and inventory anyway?");
    if (confirmed) await deleteItem(item.id);
  }

  return (
    <div className="space-y-5">
      {/* Filter Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 glass-panel p-4 rounded-xl">
        <div className="flex flex-1 flex-wrap gap-3 max-w-xl">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Search items by name or category..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="pl-10"
            />
          </div>
          <div className="min-w-[150px]">
            <Select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">All Categories</option>
              {categories.map((value) => <option key={value} value={value}>{value}</option>)}
            </Select>
          </div>
        </div>
        <Button onClick={() => setForm(emptyForm)}>
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>Add Item</span>
        </Button>
      </div>

      {message ? (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/20 px-4 py-2.5 text-sm text-emerald-400">
          {message}
        </div>
      ) : null}

      {/* Grid Table Container */}
      <div className="glass-panel overflow-hidden rounded-xl border border-zinc-800/80 shadow-md">
        <table className="w-full text-sm text-left">
          <thead className="bg-zinc-900/40 border-b border-zinc-800/80 text-zinc-400 font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="p-4">Item Name</th>
              <th className="p-4">Category</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout">
              {filtered.map((item) => (
                <motion.tr
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="border-b border-zinc-800/60 hover:bg-zinc-900/20 transition-colors"
                >
                  <td className="p-4">
                    <ItemBadge item={item} />
                  </td>
                  <td className="p-4">
                    {item.category ? (
                      <span className="inline-flex items-center gap-1 text-xs bg-zinc-900/60 border border-zinc-800/80 px-2 py-0.5 rounded-full text-zinc-300">
                        <Tag className="h-3 w-3 text-zinc-500" />
                        {item.category}
                      </span>
                    ) : (
                      <span className="text-zinc-600">-</span>
                    )}
                  </td>
                  <td className="p-4">
                    {usedByRecipe(item.id) ? (
                      <span className="text-xs text-emerald-400 font-semibold">Active in recipes</span>
                    ) : (
                      <span className="text-xs text-zinc-500">Unused</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="inline-flex gap-2">
                      <SecondaryButton
                        onClick={() =>
                          setForm({
                            id: item.id,
                            name: item.name,
                            category: item.category ?? "",
                            note: item.note ?? "",
                            imageMode: item.imageMode,
                            emoji: item.emoji ?? "",
                            imagePath: item.imagePath
                          })
                        }
                        className="!p-2"
                      >
                        <Pencil className="h-4 w-4" />
                      </SecondaryButton>
                      <DangerButton onClick={() => void remove(item)} className="!p-2">
                        <Trash2 className="h-4 w-4" />
                      </DangerButton>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-zinc-400 font-medium bg-zinc-950/20">
            No items found matching the filter criteria.
          </div>
        ) : null}
      </div>

      {/* Item Modal Form */}
      <AnimatePresence>
        {form ? (
          <Modal title={form.id ? "Edit Item Catalog" : "Create New Item"} onClose={() => setForm(null)}>
            <div className="grid gap-4.5">
              <Field label="Item Name">
                <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Copper Plate" />
              </Field>
              <Field label="Category / Tag">
                <Input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="e.g. Materials" />
              </Field>
              <Field label="Custom Note (Optional)">
                <Textarea rows={3} value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Add notes about procurement or crafting usage..." />
              </Field>
              <Field label="Visual Icon Mode">
                <Select value={form.imageMode} onChange={(event) => setForm({ ...form, imageMode: event.target.value as ImageMode })}>
                  <option value="none">No icon (Use initial letters)</option>
                  <option value="emoji">Unicode Emoji representation</option>
                  <option value="file">Local disk image upload</option>
                </Select>
              </Field>
              {form.imageMode === "emoji" ? (
                <Field label="Emoji Character">
                  <Input value={form.emoji} onChange={(event) => setForm({ ...form, emoji: event.target.value })} placeholder="Type or paste a single emoji" />
                </Field>
              ) : null}
              {form.imageMode === "file" ? (
                <div className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-900/20 p-3.5">
                  <div className="flex items-center gap-3">
                    <SecondaryButton onClick={() => void selectImage()}>
                      <ImagePlus className="h-4 w-4" />
                      <span>{form.imagePath ? "Replace File" : "Choose Image"}</span>
                    </SecondaryButton>
                    {form.imagePath ? (
                      <SecondaryButton onClick={() => setForm({ ...form, imagePath: undefined, imageMode: "none" })}>
                        Remove File
                      </SecondaryButton>
                    ) : null}
                  </div>
                  <span className="text-[11px] text-zinc-500 mt-1">
                    {form.imagePath ? `Attached: ${form.imagePath.split(/[\\/]/).pop()}` : "Supports PNG, JPG, JPEG, WEBP files"}
                  </span>
                </div>
              ) : null}
              <div className="flex justify-end gap-2 border-t border-zinc-800/60 pt-4 mt-2">
                <SecondaryButton onClick={() => setForm(null)}>Cancel</SecondaryButton>
                <Button onClick={() => void save()}>Save Item</Button>
              </div>
            </div>
          </Modal>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
