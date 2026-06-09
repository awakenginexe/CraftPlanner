import { useCraftPlanStore } from "../store/useCraftPlanStore";
import { motion } from "framer-motion";
import { Boxes, Calculator, Home, Package, Settings, Upload, Warehouse, Plus } from "lucide-react";

export function Dashboard() {
  const { data, setActiveScreen } = useCraftPlanStore();
  const stockedCount = data.inventory.filter((entry) => entry.quantity > 0).length;
  const empty = data.items.length === 0 && data.recipes.length === 0 && data.inventory.length === 0;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100, damping: 15 } }
  };

  const actions = [
    { label: "Add Item", screen: "items", icon: Plus, desc: "Register a new base or crafted item" },
    { label: "Add Recipe", screen: "recipes", icon: Boxes, desc: "Define crafting requirements" },
    { label: "Open Inventory", screen: "inventory", icon: Warehouse, desc: "Check current storage quantities" },
    { label: "Open Calculator", screen: "calculator", icon: Calculator, desc: "Compute build trees and materials" },
    { label: "Import / Export", screen: "import-export", icon: Upload, desc: "Sync JSON data and image assets" },
    { label: "Settings", screen: "settings", icon: Settings, desc: "Configure database connection and theme" }
  ];

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8">
      {/* Stat Cards */}
      <motion.div variants={itemVariants} className="grid gap-5 md:grid-cols-3">
        <Stat label="Total Items" value={data.items.length} icon={Package} gradient="from-blue-500/20 to-indigo-500/10 border-blue-500/20" />
        <Stat label="Active Recipes" value={data.recipes.length} icon={Boxes} gradient="from-purple-500/20 to-pink-500/10 border-purple-500/20" />
        <Stat label="Stocked Items" value={stockedCount} icon={Warehouse} gradient="from-emerald-500/20 to-teal-500/10 border-emerald-500/20" />
      </motion.div>

      {/* Quick Actions */}
      <motion.section variants={itemVariants} className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.screen}
                className="group glass-panel glass-panel-hover glow-card flex items-start gap-4 rounded-xl p-5 text-left transition-all duration-300"
                onClick={() => setActiveScreen(action.screen)}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/30 group-hover:text-emerald-400 transition-colors">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-zinc-200 group-hover:text-zinc-100 transition-colors">{action.label}</h3>
                  <p className="text-xs text-zinc-400 line-clamp-1">{action.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </motion.section>

      {/* Getting Started Guide */}
      {empty ? (
        <motion.section variants={itemVariants} className="glass-panel glow-card rounded-2xl p-6">
          <h2 className="text-base font-bold text-zinc-100">Welcome to CraftPlan</h2>
          <p className="mt-1.5 text-sm text-zinc-400">Let's set up your first workspace layout in a few simple steps:</p>
          <ol className="mt-4 grid gap-4 md:grid-cols-4 text-sm text-zinc-300">
            <li className="relative rounded-lg bg-zinc-950/40 border border-zinc-800/80 p-4">
              <span className="absolute -top-3 left-3 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-zinc-950">1</span>
              <p className="mt-2 font-semibold">Add Items</p>
              <p className="mt-1 text-xs text-zinc-500">Define raw materials and items in catalog.</p>
            </li>
            <li className="relative rounded-lg bg-zinc-950/40 border border-zinc-800/80 p-4">
              <span className="absolute -top-3 left-3 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-zinc-950">2</span>
              <p className="mt-2 font-semibold">Add Recipes</p>
              <p className="mt-1 text-xs text-zinc-500">Define crafting components and quantities.</p>
            </li>
            <li className="relative rounded-lg bg-zinc-950/40 border border-zinc-800/80 p-4">
              <span className="absolute -top-3 left-3 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-zinc-950">3</span>
              <p className="mt-2 font-semibold">Update Stock</p>
              <p className="mt-1 text-xs text-zinc-500">Set quantities in your local inventory.</p>
            </li>
            <li className="relative rounded-lg bg-zinc-950/40 border border-zinc-800/80 p-4">
              <span className="absolute -top-3 left-3 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-zinc-950">4</span>
              <p className="mt-2 font-semibold">Calculate tree</p>
              <p className="mt-1 text-xs text-zinc-500">Run calculations and update quantities.</p>
            </li>
          </ol>
        </motion.section>
      ) : null}
    </motion.div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  gradient
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
}) {
  return (
    <div className={`glass-panel glow-card rounded-2xl bg-gradient-to-br ${gradient} border p-6 flex items-center justify-between`}>
      <div className="space-y-1">
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">{label}</span>
        <div className="text-3xl font-extrabold text-zinc-100 tracking-tight">{value}</div>
      </div>
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-950/40 border border-zinc-800/80 text-zinc-300">
        <Icon className="h-6 w-6" />
      </div>
    </div>
  );
}
