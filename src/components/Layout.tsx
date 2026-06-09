import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { motion, AnimatePresence } from "framer-motion";

type LayoutProps = {
  activeScreen: string;
  title: string;
  subtitle?: string;
  onNavigate: (screen: string) => void;
  children: ReactNode;
};

export function Layout({ activeScreen, title, subtitle, onNavigate, children }: LayoutProps) {
  return (
    <div className="flex min-h-screen bg-transparent text-zinc-800 dark:text-zinc-100 selection:bg-emerald-500/20 selection:text-emerald-300">
      <Sidebar activeScreen={activeScreen} onNavigate={onNavigate} />
      <section className="flex min-w-0 flex-1 flex-col">
        <TopBar title={title} subtitle={subtitle} />
        <div className="min-h-0 flex-1 overflow-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeScreen}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="min-h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}
