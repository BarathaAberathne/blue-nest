"use client";

// ConsentsCard — the staff view of the child's consents: the full catalogue
// with the LATEST decision per item (append-only rows, latest wins — same
// LatestConsents rule as the backend), who signed and when.

import { useEffect, useState } from "react";
import { CheckCircle2, MinusCircle, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { fmtDate } from "@/lib/child";
import type { ConsentsBundle } from "@/types";

export default function ConsentsCard({ childId }: { childId: string }) {
  const [bundle, setBundle] = useState<ConsentsBundle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) { setLoading(false); return; }
    api.adminGetConsents(token, childId)
      .then(setBundle)
      .catch(() => setBundle(null))
      .finally(() => setLoading(false));
  }, [childId]);

  return (
    <div className="card p-5">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Consents</h3>
      {loading ? <p className="text-sm text-slate-400">Loading…</p> : !bundle ? (
        <p className="text-sm text-slate-400">Consents could not be loaded.</p>
      ) : (
        <ul className="divide-y divide-slate-50">
          {bundle.catalogue.map((def) => {
            const latest = bundle.latest?.[def.key];
            return (
              <li key={def.key} className="flex items-start gap-3 py-2.5 text-sm">
                {latest ? (
                  latest.granted
                    ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                    : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                ) : (
                  <MinusCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-slate-700">{def.label}{def.required && <span className="text-red-400"> *</span>}</p>
                  {latest ? (
                    <p className="text-xs text-slate-400">
                      {latest.granted ? "Granted" : "Withdrawn"} · signed {latest.signature_name} · {fmtDate(latest.created_at?.slice(0, 10))}
                      {latest.note ? ` · ${latest.note}` : ""}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400">Not recorded</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
