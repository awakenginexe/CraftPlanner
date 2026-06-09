import { AlertTriangle, RefreshCw } from "lucide-react";

type PermissionErrorProps = {
  path: string;
  message: string;
  onRetry: () => void;
};

export function PermissionError({ path, message, onRetry }: PermissionErrorProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 text-zinc-100">
      <section className="w-full max-w-2xl rounded-lg border border-red-500/40 bg-red-950/30 p-6">
        <div className="flex items-start gap-4">
          <AlertTriangle className="mt-1 h-6 w-6 text-red-300" />
          <div>
            <h1 className="text-xl font-semibold">CraftPlanner cannot access its data folder</h1>
            <p className="mt-3 text-sm text-red-100">{message}</p>
            <div className="mt-4 rounded-md border border-red-500/30 bg-zinc-950 p-3 font-mono text-xs text-red-100">{path}</div>
            <p className="mt-4 text-sm text-zinc-300">Move CraftPlanner to a writable folder or allow read/write permissions for CraftPlanData, then retry.</p>
            <button className="mt-5 inline-flex items-center gap-2 rounded-md bg-red-300 px-4 py-2 text-sm font-medium text-red-950" onClick={onRetry}>
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
