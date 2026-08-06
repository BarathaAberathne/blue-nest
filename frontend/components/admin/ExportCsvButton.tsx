"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { downloadCsv } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

// ExportCsvButton downloads a server-side CSV export from the given admin API
// path (already including any query filters), honouring the auth header + the
// server's filename. Reusable across the admin list pages.
export default function ExportCsvButton({ path, label = "Export CSV" }: { path: string; label?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    const token = getAccessToken();
    if (!token) { setError("Not authenticated"); return; }
    setBusy(true); setError(null);
    try {
      await downloadCsv(path, token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally { setBusy(false); }
  };

  return (
    <span className="inline-flex flex-col items-end">
      <button type="button" onClick={run} disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
        <Download className="h-4 w-4" /> {busy ? "Exporting…" : label}
      </button>
      {error && <span className="mt-1 text-xs text-rose-600">{error}</span>}
    </span>
  );
}
