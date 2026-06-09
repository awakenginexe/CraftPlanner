import { Copy, Pencil, Plus, Trash2, Search, ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";
import { detectRecipeCycle } from "../domain/calculation";
import { createId } from "../domain/ids";
import type { Recipe, RecipeIngredient } from "../domain/types";
import { validateRecipeDraft } from "../domain/validation";
import { ItemBadge } from "../components/ItemBadge";
import { Modal } from "../components/Modal";
import { SearchSelect } from "../components/SearchSelect";
import { Button, DangerButton, Field, Input, SecondaryButton, Textarea } from "../components/ui";
import { useCraftPlanStore } from "../store/useCraftPlanStore";
import { motion, AnimatePresence } from "framer-motion";

type RecipeForm = {
  id?: string;
  name: string;
  outputItemId: string;
  outputQuantity: number;
  ingredients: RecipeIngredient[];
  note: string;
  isDefault: boolean;
};

const emptyForm: RecipeForm = { name: "", outputItemId: "", outputQuantity: 1, ingredients: [{ itemId: "", quantity: 1 }], note: "", isDefault: true };

export function Recipes() {
  const { data, saveData, deleteRecipe } = useCraftPlanStore();
  const [query, setQuery] = useState("");
  const [outputFilter, setOutputFilter] = useState("");
  const [form, setForm] = useState<RecipeForm | null>(null);
  const [message, setMessage] = useState("");

  const itemById = (id: string) => data.items.find((item) => item.id === id);
  const cycleWarnings = useMemo(() => detectRecipeCycle(data.recipes), [data.recipes]);
  const filtered = data.recipes.filter((recipe) => {
    const output = itemById(recipe.outputItemId);
    const text = `${recipe.name ?? ""} ${output?.name ?? ""}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (!outputFilter || recipe.outputItemId === outputFilter);
  });

  async function save() {
    if (!form) return;
    const validation = validateRecipeDraft(form);
    if (!validation.ok) {
      setMessage(validation.errors.join(" "));
      return;
    }
    const now = new Date().toISOString();
    const existing = form.id ? data.recipes.find((recipe) => recipe.id === form.id) : undefined;
    const recipe: Recipe = {
      id: form.id ?? createId(),
      name: form.name.trim() || undefined,
      outputItemId: form.outputItemId,
      outputQuantity: Math.max(1, Math.floor(form.outputQuantity)),
      ingredients: form.ingredients.map((ingredient) => ({ itemId: ingredient.itemId, quantity: Math.max(1, Math.floor(ingredient.quantity)) })),
      note: form.note.trim() || undefined,
      isDefault: form.isDefault,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };
    const recipes = data.recipes.some((current) => current.id === recipe.id)
      ? data.recipes.map((current) => (current.id === recipe.id ? recipe : current))
      : [...data.recipes, recipe];
    const normalized = recipe.isDefault ? recipes.map((current) => current.outputItemId === recipe.outputItemId && current.id !== recipe.id ? { ...current, isDefault: false } : current) : recipes;
    await saveData({ ...data, recipes: normalized });
    setForm(null);
    setMessage("Recipe saved.");
  }

  function edit(recipe: Recipe): RecipeForm {
    return {
      id: recipe.id,
      name: recipe.name ?? "",
      outputItemId: recipe.outputItemId,
      outputQuantity: recipe.outputQuantity,
      ingredients: recipe.ingredients,
      note: recipe.note ?? "",
      isDefault: Boolean(recipe.isDefault)
    };
  }

  return (
    <div className="space-y-5">
      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 glass-panel p-4 rounded-xl">
        <div className="flex flex-1 flex-wrap gap-3 max-w-xl">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-500" />
            <Input placeholder="Search recipes..." value={query} onChange={(event) => setQuery(event.target.value)} className="pl-10" />
          </div>
          <div className="min-w-[150px]">
            <SearchSelect items={data.items} value={outputFilter} onChange={setOutputFilter} placeholder="All Outputs" />
          </div>
        </div>
        <Button onClick={() => setForm(emptyForm)}>
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>Add Recipe</span>
        </Button>
      </div>

      {cycleWarnings.length > 0 ? (
        <div className="rounded-lg border border-red-500/20 bg-red-950/20 px-4 py-3.5 text-sm text-red-200 shadow-lg shadow-red-950/10 flex flex-col gap-1.5 pulse-glow">
          <span className="font-bold text-red-400">Warning: Circular Recipe Detected</span>
          <div className="flex items-center flex-wrap gap-1 text-xs font-semibold tracking-wider text-red-300/80">
            {cycleWarnings[0].map((id, index) => (
              <span key={id} className="flex items-center gap-1">
                {index > 0 && <ArrowRight className="h-3 w-3 text-red-500" />}
                <span className="bg-red-950/60 px-2 py-0.5 rounded border border-red-500/20">{itemById(id)?.name || id}</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {message ? (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/20 px-4 py-2.5 text-sm text-emerald-400">
          {message}
        </div>
      ) : null}

      {/* Recipes List Container */}
      <div className="glass-panel overflow-hidden rounded-xl border border-zinc-800/80 shadow-md">
        <table className="w-full text-sm text-left">
          <thead className="bg-zinc-900/40 border-b border-zinc-800/80 text-zinc-400 font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="p-4">Output Item</th>
              <th className="p-4">Ingredients Required</th>
              <th className="p-4">Default</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout">
              {filtered.map((recipe) => (
                <motion.tr
                  key={recipe.id}
                  layout
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="border-b border-zinc-800/60 hover:bg-zinc-900/20 transition-colors"
                >
                  <td className="p-4 font-semibold">
                    <ItemBadge item={itemById(recipe.outputItemId)} quantity={recipe.outputQuantity} />
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-2.5">
                      {recipe.ingredients.map((ingredient) => (
                        <div
                          key={`${recipe.id}-${ingredient.itemId}`}
                          className="bg-zinc-950/40 border border-zinc-800/80 rounded-xl px-2.5 py-1"
                        >
                          <ItemBadge item={itemById(ingredient.itemId)} quantity={ingredient.quantity} compact />
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="p-4">
                    {recipe.isDefault ? (
                      <span className="text-xs bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full text-emerald-400 font-semibold">
                        Primary
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-500">Secondary</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="inline-flex gap-2">
                      <SecondaryButton onClick={() => setForm(edit(recipe))} className="!p-2">
                        <Pencil className="h-4 w-4" />
                      </SecondaryButton>
                      <SecondaryButton
                        onClick={() =>
                          setForm({
                            ...edit(recipe),
                            id: undefined,
                            name: `${recipe.name ?? itemById(recipe.outputItemId)?.name ?? "Recipe"} copy`
                          })
                        }
                        className="!p-2"
                      >
                        <Copy className="h-4 w-4" />
                      </SecondaryButton>
                      <DangerButton onClick={() => void deleteRecipe(recipe.id)} className="!p-2">
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
            No recipes defined yet.
          </div>
        ) : null}
      </div>

      {/* Recipe Modal Form */}
      <AnimatePresence>
        {form ? (
          <Modal title={form.id ? "Modify Crafting Recipe" : "Create Crafting Recipe"} onClose={() => setForm(null)}>
            <div className="grid gap-4.5">
              <Field label="Recipe Name / Label (Optional)">
                <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Mass Production Copper Wire" />
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Output Product">
                  <SearchSelect items={data.items} value={form.outputItemId} onChange={(value) => setForm({ ...form, outputItemId: value })} />
                </Field>
                <Field label="Output Batch Quantity">
                  <Input type="number" min={1} value={form.outputQuantity} onChange={(event) => setForm({ ...form, outputQuantity: Number(event.target.value) })} />
                </Field>
              </div>

              {/* Ingredients List */}
              <div className="space-y-2.5 rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-zinc-300">Recipe Ingredients</span>
                  <SecondaryButton
                    onClick={() =>
                      setForm({ ...form, ingredients: [...form.ingredients, { itemId: "", quantity: 1 }] })
                    }
                    className="!py-1.5 !px-3 text-xs"
                  >
                    Add Ingredient
                  </SecondaryButton>
                </div>
                <div className="space-y-2 max-h-[200px] overflow-auto pr-1">
                  <AnimatePresence mode="popLayout">
                    {form.ingredients.map((ingredient, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.1 }}
                        className="grid grid-cols-[1fr_120px_auto] gap-2 items-center"
                      >
                        <SearchSelect
                          items={data.items}
                          value={ingredient.itemId}
                          onChange={(value) =>
                            setForm({
                              ...form,
                              ingredients: form.ingredients.map((entry, i) =>
                                i === index ? { ...entry, itemId: value } : entry
                              )
                            })
                          }
                        />
                        <Input
                          type="number"
                          min={1}
                          value={ingredient.quantity}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              ingredients: form.ingredients.map((entry, i) =>
                                i === index ? { ...entry, quantity: Number(event.target.value) } : entry
                              )
                            })
                          }
                        />
                        <DangerButton
                          onClick={() =>
                            setForm({ ...form, ingredients: form.ingredients.filter((_, i) => i !== index) })
                          }
                          className="!px-3 !py-2.5"
                        >
                          Delete
                        </DangerButton>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-zinc-300 mt-1">
                <input
                  type="checkbox"
                  id="recipe-is-default"
                  checked={form.isDefault}
                  onChange={(event) => setForm({ ...form, isDefault: event.target.checked })}
                  className="rounded border-zinc-800 bg-zinc-950 text-emerald-500 focus:ring-0 focus:ring-offset-0 h-4 w-4"
                />
                <label htmlFor="recipe-is-default" className="font-medium">Set as primary recipe for this item</label>
              </div>

              <Field label="Recipe Remarks (Optional)">
                <Textarea rows={2} value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Add notes about crafting efficiency, machine setup..." />
              </Field>

              <div className="flex justify-end gap-2 border-t border-zinc-800/60 pt-4 mt-2">
                <SecondaryButton onClick={() => setForm(null)}>Cancel</SecondaryButton>
                <Button onClick={() => void save()}>Save Recipe</Button>
              </div>
            </div>
          </Modal>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
