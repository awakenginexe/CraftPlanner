import type { ReactNode } from "react";
import { motion } from "framer-motion";

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 dark:bg-zinc-950/70 p-4 backdrop-blur-sm"
    >
      <motion.section
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: "spring", duration: 0.3, bounce: 0.1 }}
        className="glass-panel max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
      >
        <header className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80 px-6 py-4">
          <h2 className="font-semibold text-zinc-800 dark:text-zinc-100">{title}</h2>
          <button
            className="rounded-lg border border-zinc-200 dark:border-zinc-800/80 bg-zinc-100/50 dark:bg-zinc-900/50 px-3 py-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
            onClick={onClose}
          >
            Close
          </button>
        </header>
        <div className="max-h-[calc(90vh-64px)] overflow-auto p-6">{children}</div>
      </motion.section>
    </motion.div>
  );
}
