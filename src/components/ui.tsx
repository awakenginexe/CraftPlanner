import type React from "react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Button({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-400 px-4 py-2.5 text-sm font-semibold text-zinc-950 shadow-[0_4px_20px_-4px_rgba(16,185,129,0.4)] hover:from-emerald-400 hover:to-teal-300 hover:shadow-[0_4px_25px_-2px_rgba(16,185,129,0.6)] active:scale-[0.98] transition-all duration-200 ease-out disabled:pointer-events-none disabled:opacity-40 ${className}`}
      {...props}
    />
  );
}

export function SecondaryButton({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800/80 bg-zinc-100/50 dark:bg-zinc-900/50 px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-100 backdrop-blur-md hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-200/80 dark:hover:bg-zinc-800/80 active:scale-[0.98] transition-all duration-200 ease-out disabled:pointer-events-none disabled:opacity-40 ${className}`}
      {...props}
    />
  );
}

export function DangerButton({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg border border-rose-500/30 bg-rose-950/20 px-4 py-2.5 text-sm font-semibold text-rose-600 dark:text-rose-200 backdrop-blur-md hover:border-rose-500/50 hover:bg-rose-900/45 dark:hover:bg-rose-900/40 active:scale-[0.98] transition-all duration-200 ease-out disabled:pointer-events-none disabled:opacity-40 ${className}`}
      {...props}
    />
  );
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 bg-white/40 dark:bg-zinc-950/40 px-3.5 py-2.5 text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none transition-all duration-200 input-glow focus:border-emerald-500/40 focus:bg-white/80 focus:dark:bg-zinc-950/60 ${className}`}
      {...props}
    />
  );
}

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 bg-white/40 dark:bg-zinc-950/40 px-3.5 py-2.5 text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none transition-all duration-200 input-glow focus:border-emerald-500/40 focus:bg-white/80 focus:dark:bg-zinc-950/60 ${className}`}
      {...props}
    />
  );
}

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`w-full rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 bg-white/40 dark:bg-zinc-950/40 px-3.5 py-2.5 text-sm text-zinc-800 dark:text-zinc-100 outline-none transition-all duration-200 input-glow focus:border-emerald-500/40 focus:bg-white/80 focus:dark:bg-zinc-950/60 ${className}`}
      {...props}
    />
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="text-zinc-500 dark:text-zinc-400 font-medium">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-zinc-400 dark:text-zinc-500 font-normal">{hint}</span> : null}
    </label>
  );
}
