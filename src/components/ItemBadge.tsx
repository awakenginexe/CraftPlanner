import { useEffect, useState } from "react";
import type { Item } from "../domain/types";
import { readAssetDataUrl } from "../tauri/api";

export function ItemBadge({ item, quantity, compact = false }: { item?: Item; quantity?: number; compact?: boolean }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (item?.imageMode === "file" && item.thumbnailPath) {
      readAssetDataUrl(item.thumbnailPath).then((url) => active && setDataUrl(url)).catch(() => active && setDataUrl(null));
    } else if (item?.imageMode === "file" && item.imagePath) {
      readAssetDataUrl(item.imagePath).then((url) => active && setDataUrl(url)).catch(() => active && setDataUrl(null));
    } else {
      setDataUrl(null);
    }
    return () => {
      active = false;
    };
  }, [item?.imageMode, item?.imagePath, item?.thumbnailPath]);

  if (!item) return <span className="inline-flex items-center gap-2 text-zinc-400 dark:text-zinc-500 font-medium">?</span>;

  const icon = dataUrl ? (
    <img src={dataUrl} alt={item.name} className="h-full w-full object-cover transition-transform duration-300 hover:scale-110" />
  ) : item.imageMode === "emoji" && item.emoji ? (
    <span className="text-lg transition-transform duration-200 hover:scale-110">{item.emoji}</span>
  ) : (
    <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">{item.name.slice(0, 2).toUpperCase()}</span>
  );

  return (
    <span className="inline-flex min-w-0 items-center gap-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-100/50 dark:bg-zinc-900/50 shadow-inner">
        {icon}
      </span>
      {!compact ? <span className="min-w-0 truncate text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-zinc-100">{item.name}</span> : null}
      {quantity !== undefined ? (
        <span className="rounded-md bg-zinc-200/60 dark:bg-zinc-900/80 border border-zinc-300 dark:border-zinc-800/80 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
          x{quantity}
        </span>
      ) : null}
    </span>
  );
}
