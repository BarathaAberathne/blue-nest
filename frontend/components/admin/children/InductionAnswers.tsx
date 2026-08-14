"use client";

// InductionAnswers — read-only, always-expanded view of selected induction
// sections, rendered from the SAME field catalogue the portal wizard writes
// with (lib/induction.ts). The profile tabs use it to surface what the parent
// filled in (contacts/collectors on the Family tab, professionals/health/
// routine on the Health tab) without a second form implementation.

import { answerText, INDUCTION_FIELDS } from "@/lib/induction";
import type { InductionBundle } from "@/types";

export default function InductionAnswers({
  bundle,
  keys,
  loading,
}: {
  bundle: InductionBundle | null;
  keys: string[];
  loading?: boolean;
}) {
  if (loading) return <p className="text-sm text-slate-400">Loading…</p>;
  const induction = bundle?.induction;
  const defs = (bundle?.sections ?? []).filter((d) => keys.includes(d.key));
  if (!induction || defs.length === 0) {
    return <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-400">No induction details recorded yet — these fill in as the family completes the induction form.</p>;
  }
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {defs.map((def) => {
        const sec = induction.sections?.[def.key];
        return (
          <div key={def.key} className="card p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">{def.label}</h3>
              {sec?.complete
                ? <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[0.65rem] font-semibold text-teal-700">Complete</span>
                : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.65rem] font-semibold text-slate-500">{sec ? "In progress" : "Not started"}</span>}
            </div>
            {sec ? (
              <dl className="space-y-2.5 text-sm">
                {(INDUCTION_FIELDS[def.key] ?? []).map((f) => (
                  <div key={f.key}>
                    <dt className="text-xs text-slate-400">{f.label}</dt>
                    <dd className="whitespace-pre-wrap text-slate-700">{answerText(sec.data?.[f.key])}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-slate-400">Not filled in yet.</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
