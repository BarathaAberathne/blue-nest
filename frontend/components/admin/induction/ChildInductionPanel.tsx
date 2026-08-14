"use client";

// Admin Induction & Onboarding panel on the child profile — the staff side of
// the parent/staff collaboration: view the submitted answers + consents, watch
// the derived completeness, and perform the FOUR-EYES review sign-off
// (reviewer must differ from the submitter — enforced server-side).

import { useCallback, useEffect, useState } from "react";
import { ClipboardCheck, ChevronDown, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import StageBadge from "@/components/admin/ui/StageBadge";
import { INDUCTION_FIELDS, inductionStatusAccent, onboardingStatusAccent, onboardingStatusLabel } from "@/lib/induction";
import type { ChildInduction, ConsentsBundle, InductionBundle, OnboardingView } from "@/types";

const STATUS_LABEL: Record<string, string> = {
  not_started: "Not started", in_progress: "In progress", submitted: "Submitted — awaiting review", reviewed: "Reviewed",
};

export default function ChildInductionPanel({ childId, canReview }: { childId: string; canReview: boolean }) {
  const [bundle, setBundle] = useState<InductionBundle | null>(null);
  const [consents, setConsents] = useState<ConsentsBundle | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingView | null>(null);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    const [b, c, o] = await Promise.all([
      api.adminGetInduction(token, childId).catch(() => null),
      api.adminGetConsents(token, childId).catch(() => null),
      api.adminGetOnboarding(token, childId).catch(() => null),
    ]);
    setBundle(b);
    setConsents(c);
    setOnboarding(o);
  }, [childId]);

  useEffect(() => { void load(); }, [load]);

  if (!bundle && !onboarding) return null;
  const induction: ChildInduction | null | undefined = bundle?.induction;
  const status = induction?.status ?? "not_started";

  const review = async () => {
    const token = getAccessToken();
    if (!token) return;
    setBusy(true); setError(null);
    try {
      await api.adminReviewInduction(token, childId, note.trim());
      setReviewing(false); setNote("");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Review failed"); }
    finally { setBusy(false); }
  };

  const sectionDefs = bundle?.sections ?? [];
  const grantedConsents = Object.values(consents?.latest ?? {}).filter((c) => c.granted).length;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-heading text-sm font-semibold text-slate-900">
          <ClipboardCheck className="h-4 w-4 text-teal-600" /> Induction &amp; Onboarding
        </h3>
        <StageBadge label={STATUS_LABEL[status] ?? status} accent={inductionStatusAccent[status] ?? "slate"} withDot />
      </div>

      {onboarding && (
        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between text-xs">
            <StageBadge label={onboardingStatusLabel[onboarding.status] ?? onboarding.status} accent={onboardingStatusAccent[onboarding.status] ?? "slate"} withDot={false} />
            <span className="font-semibold text-slate-600">{onboarding.percent}% complete</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${onboarding.percent >= 75 ? "bg-teal-500" : onboarding.percent >= 50 ? "bg-amber-400" : "bg-red-400"}`} style={{ width: `${onboarding.percent}%` }} />
          </div>
          {(() => {
            const missing = onboarding.categories.flatMap((c) => c.missing ?? []);
            return missing.length > 0 ? <p className="mt-1.5 text-xs text-slate-500">Outstanding: {missing.slice(0, 3).join(" · ")}{missing.length > 3 ? " …" : ""}</p> : null;
          })()}
        </div>
      )}

      {error && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

      {induction && (
        <ul className="mb-3 divide-y divide-slate-50 rounded-lg border border-slate-100">
          {sectionDefs.map((def) => {
            const sec = induction.sections?.[def.key];
            const open = openSection === def.key;
            const fields = INDUCTION_FIELDS[def.key] ?? [];
            return (
              <li key={def.key}>
                <button type="button" onClick={() => setOpenSection(open ? null : def.key)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50">
                  {open ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
                  <span className="flex-1 text-slate-700">{def.label}</span>
                  <span className={`text-xs font-semibold ${sec?.complete ? "text-teal-600" : "text-slate-300"}`}>{sec?.complete ? "✓ complete" : def.required ? "required" : "optional"}</span>
                </button>
                {open && (
                  <dl className="space-y-1.5 border-t border-slate-50 bg-slate-50/50 px-4 py-3 text-xs">
                    {fields.length === 0 && <p className="text-slate-400">No answers recorded.</p>}
                    {fields.map((f) => {
                      const v = sec?.data?.[f.key];
                      const display = Array.isArray(v) ? v.join(", ") : typeof v === "boolean" ? (v ? "Yes" : "No") : (v as string) ?? "";
                      return (
                        <div key={f.key}>
                          <dt className="font-semibold text-slate-500">{f.label}</dt>
                          <dd className="text-slate-700">{display || <span className="text-slate-300">—</span>}</dd>
                        </div>
                      );
                    })}
                  </dl>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="mb-3 text-xs text-slate-500">
        Consents: <span className="font-semibold text-slate-700">{grantedConsents} granted</span> of {Object.keys(consents?.latest ?? {}).length} decided
      </p>

      {status === "submitted" && canReview && (
        !reviewing ? (
          <button type="button" onClick={() => setReviewing(true)} className="w-full rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700">
            Review &amp; sign off
          </button>
        ) : (
          <div className="space-y-2">
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Review note (optional)" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <p className="text-[0.68rem] text-slate-400">Four-eyes: the reviewer must be a different person from the submitter.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => void review()} disabled={busy} className="flex-1 rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50">{busy ? "Signing off…" : "Confirm sign-off"}</button>
              <button type="button" onClick={() => setReviewing(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        )
      )}
      {status === "reviewed" && induction?.review_note && (
        <p className="text-xs text-slate-500">Review note: {induction.review_note}</p>
      )}
    </div>
  );
}
