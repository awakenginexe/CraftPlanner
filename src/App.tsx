import { useEffect } from "react";
import { Layout } from "./components/Layout";
import { PermissionError } from "./components/PermissionError";
import { Calculator } from "./screens/Calculator";
import { Dashboard } from "./screens/Dashboard";
import { ImportExport } from "./screens/ImportExport";
import { Inventory } from "./screens/Inventory";
import { Items } from "./screens/Items";
import { Recipes } from "./screens/Recipes";
import { Settings } from "./screens/Settings";
import { useCraftPlanStore } from "./store/useCraftPlanStore";

const screenTitles: Record<string, string> = {
  dashboard: "Dashboard",
  items: "Items",
  recipes: "Recipes",
  inventory: "Inventory",
  calculator: "Calculator",
  "import-export": "Import / Export",
  settings: "Settings"
};

function Screen({ activeScreen }: { activeScreen: string }) {
  switch (activeScreen) {
    case "items":
      return <Items />;
    case "recipes":
      return <Recipes />;
    case "inventory":
      return <Inventory />;
    case "calculator":
      return <Calculator />;
    case "import-export":
      return <ImportExport />;
    case "settings":
      return <Settings />;
    default:
      return <Dashboard />;
  }
}

export default function App() {
  const { status, activeScreen, data, initialize, retryStorage, setActiveScreen } = useCraftPlanStore();

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    const root = document.documentElement;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = data.settings.theme === "dark" || (data.settings.theme === "system" && prefersDark);
    root.classList.toggle("dark", dark);
  }, [data.settings.theme]);

  if (status.kind === "loading") {
    return <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-100"><p className="text-sm text-zinc-400">Loading CraftPlan...</p></main>;
  }

  if (status.kind === "permission-error") {
    return <PermissionError path={status.path} message={status.message} onRetry={retryStorage} />;
  }

  return (
    <Layout activeScreen={activeScreen} title={screenTitles[activeScreen] ?? "CraftPlan"} onNavigate={setActiveScreen}>
      <Screen activeScreen={activeScreen} />
    </Layout>
  );
}
