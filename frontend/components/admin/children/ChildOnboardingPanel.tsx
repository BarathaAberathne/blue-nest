"use client";

// ChildOnboardingPanel — the manager-side onboarding & induction surface on the
// child profile. This closes the awaiting_review dead end: the four-eyes
// induction review endpoint (POST /admin/children/{id}/induction/review) had no
// UI caller anywhere, so a parent-submitted induction could never reach
// "reviewed" and onboarding stalled. The review action lives HERE — the
// "Induction form to review" notification already links to this page, and the
// onboarding board links through. Answers render read-only from the same field
// catalogue the portal wizard uses (lib/induction.ts), so the reviewer sees
// exactly what was submitted before signing off.

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, ClipboardList } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import StageBadge from "@/components/admin/ui/StageBadge";
import { INDUCTION_FIELDS, answerText, inductionStatusAccent, inductionStatusLabel, onboardingStatusAccent, onboardingStatusLabel } from "@/lib/induction";
import { fmtDate } from "@/lib/child";
import type { InductionBundle, OnboardingView } from "@/types";

export default function ChildOnboardingPanel({ childId, canManage }: { childId: string; canManage: boolean }) {
  const [onboarding, setOnboarding] = useState<OnboardingView | null>(null);
  const [bundle, setBundle] = useState<InductionBundle | null>(null);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token) { setLoading(false); return; }
    const [ob, ind] = await Promise.allSettled([
      api.adminGetOnboarding(token, childId),
      api.adminGetInduction(token, childId),
    ]);
    if (ob.status === "fulfilled") setOnboarding(ob.value);
    if (ind.status === "fulfilled") setBundle(ind.value);
    setLoading(false);
  }, [childId]);
  useEffect(() => { void load(); }, [load]);

  const review = async () => {
    const token = getAccessToken();
    if (!token) return;
    setBusy(true); setError(null);
    try {
      await api.adminReviewInduction(token, childId, note);
      setNote("");
      await load();
    } catch (e) {
      // Surfaces the four-eyes rejection ("you cannot review an induction you
      // submitted") and any other server rule verbatim.
      setError(e instanceof Error ? e.message : "Review failed");
    } finally { setBusy(false); }
  };

  const induction = bundle?.induction;
  const missing = onboarding?.categories.flatMap((c) => c.missing ?? []) ?? [];

  return (
    <div className="card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-400">
          <ClipboardList className="h-4 w-4" /> Onboarding &amp; induction
        </h2>
        {onboarding && (
          <StageBadge label={onboardingStatusLabel[onboarding.status] ?? onboarding.status} accent={onboardingStatusAccent[onboarding.status] ?? "slate"} withDot />
        )}
      </div>

      {loading ? <p className="text-sm text-slate-400">Loading…</p> : (
        <>
          {onboarding && (
            <div className="mb-4">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-slate-500">Profile completeness</span>
                <span className="font-semibold text-slate-700">{onboarding.percent}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${onboarding.percent >= 75 ? "bg-teal-500" : onboarding.percent >= 50 ? "bg-amber-400" : "bg-red-400"}`} style={{ width: `${onboarding.percent}%` }} />
              </div>
              {missing.length > 0 && (
                <p className="mt-2 text-xs text-slate-500">Missing: {missing.slice(0, 4).join(" · ")}{missing.length > 4 ? ` · +${missing.length - 4} more` : ""}</p>
              )}
            </div>
          )}

          {induction && (
            <div className="rounded-xl border border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800">Induction form</span>
                  <StageBadge label={inductionStatusLabel[induction.status] ?? induction.status} accent={inductionStatusAccent[induction.status] ?? "slate"} withDot={induction.status === "submitted"} />
                </div>
                <span className="text-xs text-slate-400">
                  {induction.status === "reviewed" && induction.reviewed_at
                    ? `Signed off ${fmtDate(induction.reviewed_at.slice(0, 10))}`
                    : induction.submitted_at
                      ? `Submitted ${fmtDate(induction.submitted_at.slice(0, 10))}`
                      : null}
                </span>
              </div>

              {/* Read-only answers, section by section, from the shared catalogue. */}
              <div className="divide-y divide-slate-50">
                {(bundle?.sections ?? []).map((def) => {
                  const sec = induction.sections?.[def.key];
                  const open = openSection === def.key;
                  return (
                    <div key={def.key}>
                      <button type="button" onClick={() => setOpenSection(open ? null : def.key)}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-slate-50">
                        {open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                        <span className="flex-1 text-slate-700">{def.label}{def.required && <span className="text-red-400"> *</span>}</span>
                        {sec?.complete
                          ? <span className="inline-flex items-center gap-1 text-xs font-medium text-teal-600"><CheckCircle2 className="h-3.5 w-3.5" /> Complete</span>
                          : <span className="text-xs text-slate-400">{sec ? "In progress" : "Not started"}</span>}
                      </button>
                      {open && (
                        <dl className="space-y-2 bg-slate-50/60 px-11 py-3 text-sm">
                          {(INDUCTION_FIELDS[def.key] ?? []).map((f) => (
                            <div key={f.key}>
                              <dt className="text-xs text-slate-400">{f.label}</dt>
                              <dd className="whitespace-pre-wrap text-slate-700">{answerText(sec?.data?.[f.key])}</dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Four-eyes sign-off — server rejects the submitter reviewing their own form. */}
              {canManage && induction.status === "submitted" && (
                <div className="border-t border-slate-100 px-4 py-3">
                  <p className="mb-2 text-xs text-slate-500">
                    Second-person review: check the answers above, then sign the induction off. The person who submitted it cannot review it.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Review note (optional)"
                      className="min-w-[220px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                    <button type="button" onClick={() => void review()} disabled={busy}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">
                      <CheckCircle2 className="h-4 w-4" /> {busy ? "Signing off…" : "Sign off review"}
                    </button>
                  </div>
                  {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
                </div>
              )}

              {induction.status === "reviewed" && induction.review_note && (
                <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">Review note: {induction.review_note}</p>
              )}
            </div>
          )}

          {!induction && !onboarding && <p className="text-sm text-slate-400">No onboarding data for this child yet.</p>}
        </>
      )}
    </div>
  );
}
