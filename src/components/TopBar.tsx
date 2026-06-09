import { useEffect, useState } from "react";
import { CloudUpload, RefreshCw } from "lucide-react";
import { useCraftPlanStore } from "../store/useCraftPlanStore";
import { formatLastUpdatedAgo } from "../domain/sync";

type TopBarProps = {
  title: string;
  subtitle?: string;
};

export function TopBar({ title, subtitle }: TopBarProps) {
  const { syncState, syncBusy, saveOnline, updateFromOnline, syncMessage } = useCraftPlanStore();
  const [timeAgo, setTimeAgo] = useState(() => formatLastUpdatedAgo(syncState?.lastRemoteUpdatedAt));

  useEffect(() => {
    if (syncState?.databaseMode !== "online" || !syncState?.lastRemoteUpdatedAt) {
      setTimeAgo("");
      return;
    }
    const update = () => {
      setTimeAgo(formatLastUpdatedAgo(syncState.lastRemoteUpdatedAt));
    };
    update();
    const timer = setInterval(update, 10000);
    return () => clearInterval(timer);
  }, [syncState?.lastRemoteUpdatedAt, syncState?.databaseMode]);

  const isOnline = syncState?.databaseMode === "online";

  return (
    <header className="z-10 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-100/40 dark:bg-zinc-950/40 px-6 py-4 backdrop-blur-md transition-colors duration-300">
      <div className="flex items-center gap-6">
        {/* Left Side: Sync actions if using online db */}
        {isOnline ? (
          <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => void updateFromOnline()}
                disabled={Boolean(syncBusy)}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800/85 bg-zinc-50/60 dark:bg-zinc-900/60 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-100 transition-all hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:border-emerald-500/30 disabled:opacity-50 active:scale-95 shadow-sm"
                title="Update database from remote sheet"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400 ${syncBusy === "update" ? "animate-spin" : ""}`} />
                <span>Update</span>
              </button>

              <button
                onClick={() => void saveOnline()}
                disabled={Boolean(syncBusy)}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800/85 bg-zinc-50/60 dark:bg-zinc-900/60 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-100 transition-all hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:border-emerald-500/30 disabled:opacity-50 active:scale-95 shadow-sm"
                title="Save snapshot to remote database"
              >
                <CloudUpload className={`h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400 ${syncBusy === "save" ? "animate-bounce" : ""}`} />
                <span>Save</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span
                className={`h-2 w-2 rounded-full ${
                  syncState.lastSyncStatus === "success"
                    ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                    : syncState.lastSyncStatus === "error"
                    ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"
                    : syncState.lastSyncStatus === "conflict"
                    ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                    : "bg-zinc-400 dark:bg-zinc-500"
                }`}
              />
              <span className="text-zinc-500 dark:text-zinc-400 font-medium">
                {timeAgo}
                {syncState.lastRevision ? ` (rev ${syncState.lastRevision})` : ""}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Right Side: Title & Subtitle */}
      <div className="text-right">
        <h1 className="text-lg font-bold tracking-tight text-zinc-800 dark:text-zinc-100 md:text-xl">{title}</h1>
        {subtitle ? <p className="text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p> : null}
      </div>

      {/* Optional sync feedback message inline */}
      {syncMessage && isOnline ? (
        <div className="w-full mt-2 text-left animate-fade-in">
          <span
            className={`text-xs px-2.5 py-1 rounded bg-zinc-200/40 dark:bg-zinc-900/40 border border-zinc-300 dark:border-zinc-800/80 ${
              syncState.lastSyncStatus === "error" || syncState.lastSyncStatus === "conflict"
                ? "text-rose-600 dark:text-rose-400"
                : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {syncMessage}
          </span>
        </div>
      ) : null}
    </header>
  );
}
