import { useState } from "react";
import { buildJsonExport, mergeImportedData, parseJsonImport, previewImport } from "../domain/importExport";
import type { CraftPlanData, ImportPreview } from "../domain/types";
import { Button, DangerButton, SecondaryButton, Textarea } from "../components/ui";
import { chooseJsonFile, chooseZipFile, createBackup, exportFullPackage, importFullPackage, readTextFile, writeJsonExport } from "../tauri/api";
import { useCraftPlanStore } from "../store/useCraftPlanStore";
import { motion, AnimatePresence } from "framer-motion";
import { FileJson, Archive, Sparkles, Check, AlertCircle } from "lucide-react";

export function ImportExport() {
  const { data, saveData, initialize } = useCraftPlanStore();
  const [jsonText, setJsonText] = useState("");
  const [incoming, setIncoming] = useState<CraftPlanData | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [message, setMessage] = useState("");

  function parse(text: string) {
    setJsonText(text);
    const parsed = parseJsonImport(text);
    if (parsed.ok && parsed.value) {
      setIncoming(parsed.value);
      setPreview(previewImport(parsed.value));
      setMessage("Import preview ready.");
    } else {
      setIncoming(null);
      setPreview(null);
      setMessage(parsed.errors.join(" "));
    }
  }

  async function loadJsonFile() {
    const path = await chooseJsonFile();
    if (!path) return;
    parse(await readTextFile(path));
  }

  async function exportJson() {
    const path = await writeJsonExport(JSON.stringify(buildJsonExport(data), null, 2));
    setMessage(`JSON export successfully written to: ${path}`);
  }

  async function replaceImport() {
    if (!incoming || !window.confirm("Replace current data? A backup will be created first.")) return;
    await createBackup().catch(() => undefined);
    await saveData(incoming);
    setMessage("Current data replaced with imported JSON.");
  }

  async function mergeImport() {
    if (!incoming) return;
    const merged = mergeImportedData(data, incoming);
    await saveData(merged.data);
    setMessage(merged.warnings.length ? merged.warnings.join(" ") : "Imported data merged successfully.");
  }

  async function exportPackage() {
    const path = await exportFullPackage();
    setMessage(`Full package bundle successfully exported: ${path}`);
  }

  async function importPackage() {
    const path = await chooseZipFile();
    if (!path || !window.confirm("Import full package and replace current package files? A backup will be created first.")) return;
    await createBackup().catch(() => undefined);
    await importFullPackage(path);
    await initialize();
    setMessage("Full package imported successfully.");
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2 items-start">
      {/* JSON Panel */}
      <section className="glass-panel glow-card rounded-2xl border border-zinc-800/80 p-5 shadow-lg space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
          <FileJson className="h-4 w-4" />
          <span>JSON Sync Controls</span>
        </h2>
        <p className="text-xs text-zinc-400 leading-relaxed">
          JSON formats carry raw tables for items, recipe hierarchies, and stock. Attached image assets are omitted.
        </p>
        
        <div className="flex flex-wrap gap-2.5">
          <Button onClick={() => void exportJson()}>Export JSON Data</Button>
          <SecondaryButton onClick={() => void loadJsonFile()}>Load File Import</SecondaryButton>
        </div>

        <Textarea
          rows={10}
          placeholder="Paste external CraftPlanner JSON schema raw contents directly here..."
          value={jsonText}
          onChange={(event) => parse(event.target.value)}
          className="font-mono text-xs border-zinc-800/80 bg-zinc-950/50"
        />

        <AnimatePresence>
          {preview ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="mt-2"
            >
              <Preview preview={preview} />
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="flex gap-2.5 pt-2 border-t border-zinc-800/60">
          <Button disabled={!incoming} onClick={() => void mergeImport()} className="flex-1">
            Merge Import
          </Button>
          <DangerButton disabled={!incoming} onClick={() => void replaceImport()} className="flex-1">
            Overwrite Current
          </DangerButton>
        </div>
      </section>

      {/* Package Archive Panel */}
      <section className="glass-panel glow-card rounded-2xl border border-zinc-800/80 p-5 shadow-lg space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
          <Archive className="h-4 w-4" />
          <span>Full Package Archives (.zip)</span>
        </h2>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Package bundles zip all database records together with uploaded item icons, allowing seamless workstation moves.
        </p>
        <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
          <Button onClick={() => void exportPackage()} className="flex-1">
            Export Package File
          </Button>
          <DangerButton onClick={() => void importPackage()} className="flex-1">
            Import Package File
          </DangerButton>
        </div>
      </section>

      {/* Operations logs */}
      {message ? (
        <div className="xl:col-span-2 rounded-lg border border-emerald-500/20 bg-emerald-950/20 px-4 py-3 text-sm font-semibold text-emerald-400 flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          <span>{message}</span>
        </div>
      ) : null}
    </div>
  );
}

function Preview({ preview }: { preview: ImportPreview }) {
  return (
    <div className="grid grid-cols-2 gap-3.5 rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4 text-xs font-semibold">
      <div className="flex items-center gap-2 text-zinc-300">
        <Check className="h-4 w-4 text-emerald-400" />
        <span>Items: <strong className="text-zinc-100">{preview.items}</strong></span>
      </div>
      <div className="flex items-center gap-2 text-zinc-300">
        <Check className="h-4 w-4 text-emerald-400" />
        <span>Recipes: <strong className="text-zinc-100">{preview.recipes}</strong></span>
      </div>
      <div className="flex items-center gap-2 text-zinc-300">
        <Check className="h-4 w-4 text-emerald-400" />
        <span>Inventory: <strong className="text-zinc-100">{preview.inventory}</strong></span>
      </div>
      <div className="flex items-center gap-2 text-zinc-300">
        {preview.hasAssets ? (
          <Check className="h-4 w-4 text-emerald-400" />
        ) : (
          <AlertCircle className="h-4 w-4 text-zinc-500" />
        )}
        <span>Asset Icons: <strong className="text-zinc-100">{preview.hasAssets ? "Packed" : "None"}</strong></span>
      </div>
    </div>
  );
}
