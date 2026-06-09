import { Minus, Plus, Search, Filter } from "lucide-react";
import { useMemo, useState } from "react";
import { ItemBadge } from "../components/ItemBadge";
import { Input, SecondaryButton, Select } from "../components/ui";
import { useCraftPlanStore } from "../store/useCraftPlanStore";
import { motion, AnimatePresence } from "framer-motion";

export function Inventory() {
  const { data, setInventoryQuantity } = useCraftPlanStore();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [stockedOnly, setStockedOnly] = useState(false);

  const categories = useMemo(() => Array.from(new Set(data.items.map((item) => item.category).filter(Boolean))).sort() as string[], [data.items]);
  const quantityFor = (itemId: string) => data.inventory.find((entry) => entry.itemId === itemId)?.quantity ?? 0;

  const filtered = data.items.filter((item) => {
    const quantity = quantityFor(item.id);
    return item.name.toLowerCase().includes(query.toLowerCase()) && (!category || item.category === category) && (!stockedOnly || quantity > 0);
  });

  const update = (itemId: string, value: number) => {
    const next = Math.max(0, Math.floor(Number(value) || 0));
    void setInventoryQuantity(itemId, next);
  };

  return (
    <div className="space-y-5">
      {/* Filters Head */}
      <div className="flex flex-wrap items-center justify-between gap-4 glass-panel p-4 rounded-xl">
        <div className="flex flex-1 flex-wrap items-center gap-3 max-w-2xl">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Search inventory items..."
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
          <label className="flex items-center gap-2 text-sm text-zinc-300 font-medium cursor-pointer select-none bg-zinc-900/40 border border-zinc-800/80 rounded-lg px-3.5 py-2.5 hover:bg-zinc-800/40 transition-colors">
            <input
              type="checkbox"
              checked={stockedOnly}
              onChange={(event) => setStockedOnly(event.target.checked)}
              className="rounded border-zinc-800 bg-zinc-950 text-emerald-500 focus:ring-0 focus:ring-offset-0 h-4 w-4"
            />
            <span>Stocked Items Only</span>
          </label>
        </div>
      </div>

      {/* Table Container */}
      <div className="glass-panel overflow-hidden rounded-xl border border-zinc-800/80 shadow-md">
        <table className="w-full text-sm text-left">
          <thead className="bg-zinc-900/40 border-b border-zinc-800/80 text-zinc-400 font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="p-4">Item Details</th>
              <th className="p-4">Category</th>
              <th className="p-4">Stock Level Adjuster</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout">
              {filtered.map((item) => {
                const quantity = quantityFor(item.id);
                return (
                  <motion.tr
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="border-b border-zinc-800/60 hover:bg-zinc-900/20 transition-colors"
                  >
                    <td className="p-4 font-semibold">
                      <ItemBadge item={item} />
                    </td>
                    <td className="p-4">
                      {item.category ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-zinc-900/60 border border-zinc-800/80 px-2 py-0.5 rounded-full text-zinc-300">
                          {item.category}
                        </span>
                      ) : (
                        <span className="text-zinc-600">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex max-w-[180px] items-center gap-1 rounded-lg border border-zinc-800/80 bg-zinc-950/40 p-1">
                        <SecondaryButton
                          onClick={() => update(item.id, quantity - 1)}
                          className="!p-1.5 !rounded-md border-0 bg-transparent hover:bg-zinc-800/80 hover:text-rose-400 active:scale-95"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </SecondaryButton>
                        <input
                          type="number"
                          min={0}
                          value={quantity}
                          onChange={(event) => update(item.id, Number(event.target.value))}
                          className="w-full text-center bg-transparent border-0 text-sm font-semibold text-zinc-100 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <SecondaryButton
                          onClick={() => update(item.id, quantity + 1)}
                          className="!p-1.5 !rounded-md border-0 bg-transparent hover:bg-zinc-800/80 hover:text-emerald-400 active:scale-95"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </SecondaryButton>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-zinc-400 font-medium bg-zinc-950/20">
            No items in catalog match your current inventory search.
          </div>
        ) : null}
      </div>
    </div>
  );
}
