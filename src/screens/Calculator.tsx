import { CheckCircle, XCircle, ArrowRight, Sparkles, HelpCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { applyCraftResult, calculateDirectRequirements, calculateExpandedRequirements, calculateSmartRequirements, type CalculationResult } from "../domain/calculation";
import type { QuantityMap, Recipe } from "../domain/types";
import { ItemBadge } from "../components/ItemBadge";
import { SearchSelect } from "../components/SearchSelect";
import { Button, Field, Input, SecondaryButton, Select } from "../components/ui";
import { useCraftPlanStore } from "../store/useCraftPlanStore";
import { motion, AnimatePresence } from "framer-motion";

type CalculatorMode = "direct" | "expanded" | "smart";

export function Calculator() {
  const { data, saveData } = useCraftPlanStore();
  const [targetItemId, setTargetItemId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [mode, setMode] = useState<CalculatorMode>("expanded");
  const [selectedRecipeId, setSelectedRecipeId] = useState("");
  const [message, setMessage] = useState("");

  const recipesForTarget = data.recipes.filter((recipe) => recipe.outputItemId === targetItemId);
  const result = useMemo<CalculationResult | null>(() => {
    if (!targetItemId) return null;
    return mode === "direct"
      ? calculateDirectRequirements(targetItemId, quantity, data.recipes, selectedRecipeId || undefined, data.inventory)
      : mode === "expanded"
        ? calculateExpandedRequirements(targetItemId, quantity, data.recipes, selectedRecipeId || undefined, data.inventory)
        : calculateSmartRequirements(targetItemId, quantity, data.recipes, data.inventory, selectedRecipeId || undefined);
  }, [data.inventory, data.recipes, mode, quantity, selectedRecipeId, targetItemId]);

  const itemById = (id: string) => data.items.find((item) => item.id === id);

  async function crafted() {
    if (!result || !result.craftable || result.errors.length > 0 || !targetItemId) return;
    const inventory = applyCraftResult(targetItemId, quantity, result.consumedMaterials, data.inventory);
    await saveData({ ...data, inventory });
    setMessage("Inventory updated.");
  }

  const listContainerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const listItemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[380px_1fr] items-start">
      {/* Configuration Sidebar */}
      <section className="glass-panel glow-card space-y-4.5 rounded-2xl p-5 shadow-lg border border-zinc-800/80">
        <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          <span>Calculator Setup</span>
        </h2>
        
        <Field label="Target Item to Craft">
          <SearchSelect items={data.items} value={targetItemId} onChange={(value) => { setTargetItemId(value); setSelectedRecipeId(""); setMessage(""); }} />
        </Field>
        
        <Field label="Target Quantity">
          <Input type="number" min={1} value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))} />
        </Field>
        
        <Field label="Calculation Mode">
          <Select value={mode} onChange={(event) => setMode(event.target.value as CalculatorMode)}>
            <option value="direct">Direct recipe ingredients only</option>
            <option value="expanded">Expand full component tree</option>
            <option value="smart">Smart (Inventory-aware)</option>
          </Select>
        </Field>
        
        <Field label="Active Recipe Reference">
          <select
            className="w-full rounded-lg border border-zinc-800/80 bg-zinc-950/40 px-3.5 py-2.5 text-sm text-zinc-100 outline-none focus:border-emerald-500/40 focus:bg-zinc-950/60"
            value={selectedRecipeId}
            onChange={(event) => setSelectedRecipeId(event.target.value)}
          >
            <option value="">Default (Primary recipe)</option>
            {recipesForTarget.map((recipe) => (
              <option key={recipe.id} value={recipe.id}>
                {recipe.name || `${itemById(recipe.outputItemId)?.name ?? "Recipe"} x${recipe.outputQuantity}`}
              </option>
            ))}
          </select>
        </Field>

        <Button
          disabled={!result || !result.craftable || result.errors.length > 0}
          onClick={() => void crafted()}
          className="w-full mt-2"
        >
          Mark as Crafted
        </Button>
        
        {message ? (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/20 px-4 py-2.5 text-center text-sm text-emerald-400">
            {message}
          </div>
        ) : null}
      </section>

      {/* Calculation Results Area */}
      <section className="space-y-5">
        <AnimatePresence mode="wait">
          {!targetItemId ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="glass-panel flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-zinc-800"
            >
              <HelpCircle className="h-10 w-10 text-zinc-600 stroke-[1.5] mb-3" />
              <p className="text-sm font-semibold text-zinc-300">No Target Selected</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs">Select a target item and quantity in the setup panel to display full recipe build trees.</p>
            </motion.div>
          ) : null}

          {result && targetItemId ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              {/* Status Header */}
              <Status result={result} />

              <div className="grid gap-5 md:grid-cols-2">
                {/* Required Materials */}
                <ResultList title="Total Raw Materials Needed" map={result.requiredMaterials} itemById={itemById} containerVariants={listContainerVariants} itemVariants={listItemVariants} />

                {/* Missing Materials */}
                <ResultList
                  title="Missing Raw Materials"
                  map={result.missingMaterials}
                  itemById={itemById}
                  isWarning
                  containerVariants={listContainerVariants}
                  itemVariants={listItemVariants}
                />
              </div>

              {/* Consumed Inventory */}
              <ResultList title="Inventory Consumed" map={result.consumedMaterials} itemById={itemById} containerVariants={listContainerVariants} itemVariants={listItemVariants} />

              {/* Intermediate Crafts */}
              <section className="glass-panel rounded-2xl border border-zinc-800/80 p-5">
                <h3 className="text-sm font-bold text-zinc-200 mb-3.5 uppercase tracking-wider text-[11px] text-zinc-400">Intermediate Assemblies Required</h3>
                {result.intermediateCrafts.length === 0 ? (
                  <p className="text-sm text-zinc-500 font-medium">No intermediate crafts needed. Output can be completed directly.</p>
                ) : (
                  <motion.div variants={listContainerVariants} initial="hidden" animate="show" className="grid gap-3">
                    {result.intermediateCrafts.map((craft, index) => (
                      <motion.div
                        variants={listItemVariants}
                        key={`${craft.itemId}-${index}`}
                        className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-zinc-950/45 border border-zinc-800/80 p-4 shadow-inner"
                      >
                        <ItemBadge item={itemById(craft.itemId)} />
                        <div className="flex flex-wrap gap-4 text-xs font-semibold">
                          <span className="text-zinc-400">Requested: <strong className="text-zinc-200">{craft.requestedQuantity}</strong></span>
                          <span className="text-zinc-400">Batches: <strong className="text-zinc-200">{craft.batches}</strong></span>
                          <span className="text-zinc-400">Produced: <strong className="text-emerald-400">{craft.producedQuantity}</strong></span>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </section>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </section>
    </div>
  );
}

function Status({ result }: { result: CalculationResult }) {
  const ok = result.craftable && result.errors.length === 0;
  return (
    <section
      className={`rounded-2xl border p-5 flex items-start gap-4 transition-all duration-300 ${
        ok
          ? "border-emerald-500/35 bg-emerald-950/15 shadow-[0_4px_30px_rgba(16,185,129,0.05)] text-emerald-200"
          : "border-rose-500/35 bg-rose-950/15 shadow-[0_4px_30px_rgba(244,63,94,0.05)] text-rose-200"
      }`}
    >
      <div className="mt-0.5">
        {ok ? (
          <CheckCircle className="h-6 w-6 text-emerald-400 shadow-sm" />
        ) : (
          <XCircle className="h-6 w-6 text-rose-400 shadow-sm" />
        )}
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-bold tracking-wide">{ok ? "Ready to Craft" : "Crafting Blocked"}</h3>
        {[...result.errors, ...result.warnings].map((text) => (
          <p className="text-xs text-zinc-300 font-medium" key={text}>
            • {text}
          </p>
        ))}
        {ok && result.errors.length === 0 ? (
          <p className="text-xs text-zinc-300 font-medium">All components and subcomponents are available or craftable with your current inventory levels.</p>
        ) : null}
      </div>
    </section>
  );
}

function ResultList({
  title,
  map,
  itemById,
  isWarning = false,
  containerVariants,
  itemVariants
}: {
  title: string;
  map: QuantityMap;
  itemById: (id: string) => ReturnType<typeof useCraftPlanStore.getState>["data"]["items"][number] | undefined;
  isWarning?: boolean;
  containerVariants: any;
  itemVariants: any;
}) {
  const entries = Object.entries(map);
  return (
    <section className="glass-panel rounded-2xl border border-zinc-800/80 p-5 flex-1">
      <h3 className={`text-sm font-bold mb-3.5 uppercase tracking-wider text-[11px] ${isWarning ? "text-rose-400" : "text-zinc-400"}`}>
        {title}
      </h3>
      {entries.length === 0 ? (
        <p className="text-sm text-zinc-500 font-medium">None required.</p>
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid gap-2.5">
          {entries.map(([itemId, amount]) => (
            <motion.div
              variants={itemVariants}
              key={itemId}
              className={`rounded-xl bg-zinc-950/45 border p-3 shadow-inner ${
                isWarning ? "border-rose-500/10 hover:border-rose-500/20" : "border-zinc-800/60 hover:border-zinc-700/60"
              }`}
            >
              <ItemBadge item={itemById(itemId)} quantity={amount} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </section>
  );
}
