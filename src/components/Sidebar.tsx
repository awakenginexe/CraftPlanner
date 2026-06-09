import { Boxes, Calculator, Gauge, Home, Package, Settings, Upload, Warehouse } from "lucide-react";

const nav = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "items", label: "Items", icon: Package },
  { id: "recipes", label: "Recipes", icon: Boxes },
  { id: "inventory", label: "Inventory", icon: Warehouse },
  { id: "calculator", label: "Calculator", icon: Calculator },
  { id: "import-export", label: "Import / Export", icon: Upload },
  { id: "settings", label: "Settings", icon: Settings }
];

type SidebarProps = {
  activeScreen: string;
  onNavigate: (screen: string) => void;
};

export function Sidebar({ activeScreen, onNavigate }: SidebarProps) {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-100/65 dark:bg-zinc-950/65 backdrop-blur-md transition-colors duration-300">
      <div className="border-b border-zinc-200/80 dark:border-zinc-800/80 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <Gauge className="h-5 w-5 text-zinc-950 stroke-[2.5]" />
          </div>
          <div>
            <span className="text-base font-extrabold tracking-wide text-zinc-800 dark:text-zinc-100">CRAFTPLANNER</span>
            <span className="block text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 tracking-wider">WORKSPACE</span>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1.5 p-4">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = activeScreen === item.id;
          return (
            <button
              key={item.id}
              className={`flex w-full items-center gap-3.5 rounded-lg px-4 py-3 text-left text-sm font-medium transition-all duration-200 ${
                active
                  ? "bg-gradient-to-r from-emerald-500/10 to-teal-500/5 text-emerald-600 dark:text-emerald-400 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] border border-emerald-500/20"
                  : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200/40 dark:hover:bg-zinc-900/35 hover:text-zinc-800 dark:hover:text-zinc-200 border border-transparent"
              }`}
              onClick={() => onNavigate(item.id)}
            >
              <Icon className={`h-4.5 w-4.5 transition-transform duration-200 ${active ? "text-emerald-600 dark:text-emerald-400 scale-105" : "text-zinc-400 dark:text-zinc-500"}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
