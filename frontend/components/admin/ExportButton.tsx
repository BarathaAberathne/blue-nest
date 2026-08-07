"use client";

import { useState } from "react";
import { ChevronDown, Download } from "lucide-react";
import { downloadCsv } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

// ExportButton downloads a server-side export (CSV or Excel) from the given admin
// API path (already including any filter query), honouring the auth header + the
// server's filename. `path` should NOT include a format param — it's appended.
export default function ExportButton({ path, label = "Export" }: { path: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (format: "csv" | "xlsx") => {
    setOpen(false);
    const token = getAccessToken();
    if (!token) { setError("Not authenticated"); return; }
    setBusy(true); setError(null);
    try {
      const sep = path.includes("?") ? "&" : "?";
      await downloadCsv(`${path}${sep}format=${format}`, token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally { setBusy(false); }
  };

  return (
    <span className="relative inline-flex flex-col items-end">
      <button type="button" onClick={() => setOpen((o) => !o)} disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
        <Download className="h-4 w-4" /> {busy ? "Exporting…" : label} <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-32 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          <button type="button" onClick={() => run("csv")} className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">CSV</button>
          <button type="button" onClick={() => run("xlsx")} className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">Excel (.xlsx)</button>
        </div>
      )}
      {error && <span className="mt-1 text-xs text-rose-600">{error}</span>}
    </span>
  );
}
