"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, X, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { usePermissions } from "@/lib/usePermissions";
import StageBadge from "@/components/admin/ui/StageBadge";
import { dailyTypeLabelOf, typeFields, approvalLabel, approvalAccent } from "@/lib/dailyLog";
import type { DailyRecord } from "@/types";

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
      <p className="text-sm text-slate-800 whitespace-pre-wrap">{value}</p>
    </div>
  );
}

export default function DailyLogDetailClient({ id }: { id: string }) {
  const [rec, setRec] = useState<DailyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const { has } = usePermissions();

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    try {
      setRec(await api.adminGetDailyRecord(token, id));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const approve = async () => {
    const token = getAccessToken();
    if (!token) return;
    setBusy(true); setError(null);
    try { await api.adminApproveDailyRecord(token, id); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to approve"); }
    finally { setBusy(false); }
  };
  const share = async () => {
    const token = getAccessToken();
    if (!token) return;
    setBusy(true); setError(null);
    try { await api.adminShareDailyRecord(token, id); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to share"); }
    finally { setBusy(false); }
  };
  const unshare = async () => {
    const token = getAccessToken();
    if (!token) return;
    setBusy(true); setError(null);
    try { await api.adminUnshareDailyRecord(token, id); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to withdraw"); }
    finally { setBusy(false); }
  };
  const reject = async () => {
    const token = getAccessToken();
    if (!token || !reason.trim()) { setError("A reason is required to reject."); return; }
    setBusy(true); setError(null);
    try { await api.adminRejectDailyRecord(token, id, reason); setRejecting(false); setReason(""); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to reject"); }
    finally { setBusy(false); }
  };

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>;
  if (!rec) return <p className="text-sm text-red-500">{error ?? "Not found"}</p>;

  const f = typeFields(rec.type);
  const st = rec.approval_status ?? "";
  const isPending = st === "pending";

  return (
    <div className="mx-auto max-w-3xl">

      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">{error}</p>}

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <StageBadge label={dailyTypeLabelOf(rec.type)} accent="sky" withDot={false} />
            {rec.severity && <StageBadge label={rec.severity} accent={rec.severity === "high" ? "red" : rec.severity === "medium" ? "amber" : "slate"} withDot={false} />}
            <StageBadge label={approvalLabel[st] ?? st} accent={approvalAccent[st] ?? "slate"} withDot={isPending} />
          </div>
          <span className="font-mono text-xs text-slate-400">{rec.ref}</span>
        </div>

        <h1 className="font-heading text-2xl font-bold text-slate-900">{rec.title}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {rec.child_name ? <>For <Link href={`/admin/children/${rec.child_id}`} className="text-teal-600 hover:underline">{rec.child_name}</Link> · </> : null}
          {rec.date}{rec.submitted_by_name ? ` · logged by ${rec.submitted_by_name}` : ""}
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={f.detailLabel} value={rec.detail} />
          {f.firstAid && <Field label="First aid administered" value={rec.first_aid} />}
          {f.witnesses && <Field label="Witnesses" value={(rec.witnesses ?? []).join(", ")} />}
          {f.otherStaff && <Field label="Other staff present" value={(rec.other_staff ?? []).join(", ")} />}
          {f.parentsNotified && <Field label="Parents notified" value={rec.parents_notified} />}
          {f.nextSteps && <Field label="Next steps" value={rec.next_steps} />}
          {f.actionTaken && <Field label="Action taken" value={rec.action_taken} />}
          {f.reportedTo && <Field label="Reported to (not visible to parents)" value={(rec.reported_to ?? []).join(", ")} />}
          {f.otherNotes && <Field label="Other notes" value={rec.other_notes} />}
          {f.medication && <>
            <Field label="Medication" value={rec.medication} />
            <Field label="Dose" value={rec.dose} />
            <Field label="Time given" value={rec.admin_time} />
            <Field label="Administered by" value={rec.administered_by} />
            <Field label="Parent consent" value={rec.parent_consent ? "Yes" : "No"} />
          </>}
          {f.meal && <>
            <Field label="Meal" value={rec.meal_type} />
            <Field label="Amount eaten" value={rec.eaten} />
            <Field label="Menu" value={rec.menu} />
          </>}
        </div>

        {f.eyfs && rec.eyfs_areas && rec.eyfs_areas.length > 0 && (
          <div className="mt-4">
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-400">EYFS areas</p>
            <div className="flex flex-wrap gap-1.5">{rec.eyfs_areas.map((a) => <StageBadge key={a} label={a} accent="violet" withDot={false} />)}</div>
          </div>
        )}

        {rec.attachments && rec.attachments.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400">Photos</p>
            <div className="flex flex-wrap gap-2">
              {rec.attachments.map((url) => (
                // eslint-disable-next-line @next/next/no-img-element
                <a key={url} href={url} target="_blank" rel="noreferrer"><img src={url} alt="attachment" className="h-28 w-28 rounded-lg border border-slate-200 object-cover" /></a>
              ))}
            </div>
          </div>
        )}

        {/* Approval state + actions */}
        <div className="mt-6 border-t border-slate-100 pt-4">
          {st === "approved" && rec.approved_by_name && <p className="text-sm text-green-700"><ShieldCheck className="mr-1 inline h-4 w-4" /> Approved by {rec.approved_by_name}</p>}
          {st === "rejected" && <p className="text-sm text-red-600">Rejected{rec.approved_by_name ? ` by ${rec.approved_by_name}` : ""}{rec.rejection_reason ? `: ${rec.rejection_reason}` : ""}</p>}
          {isPending && (
            has("daily_logs.approve") ? (
              rejecting ? (
                <div className="space-y-2">
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Reason for rejection…" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                  <div className="flex gap-2">
                    <button onClick={reject} disabled={busy} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">Confirm reject</button>
                    <button onClick={() => setRejecting(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-amber-600">Awaiting approval —</span>
                  <button onClick={approve} disabled={busy} className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"><Check className="h-4 w-4" /> Approve</button>
                  <button onClick={() => setRejecting(true)} disabled={busy} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"><X className="h-4 w-4" /> Reject</button>
                  <span className="text-xs text-slate-400">(you can&apos;t approve your own submission)</span>
                </div>
              )
            ) : <p className="text-sm text-amber-600">Awaiting approval by a manager / EYFS lead.</p>
          )}
        </div>

        {/* Parent visibility — creating/approving a log NEVER shares it; sharing
            is an explicit, audited action (safeguarding is never shareable). */}
        <div className="mt-4 border-t border-slate-100 pt-4">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Parent visibility</h3>
          {rec.type === "safeguarding" ? (
            <p className="text-sm text-slate-500">Safeguarding records are internal and can never be shared with parents.</p>
          ) : rec.parent_shared ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-700">
                Shared with parent{rec.parent_shared_by ? ` by ${rec.parent_shared_by}` : ""}{rec.parent_shared_at ? ` · ${new Date(rec.parent_shared_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}
              </span>
              {has("daily_logs.approve") && (
                <button onClick={unshare} disabled={busy} className="rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50">
                  Withdraw from parent
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">Internal — not visible to parents</span>
              {has("daily_logs.approve") && st === "approved" && (
                <button onClick={share} disabled={busy} className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50">
                  Send to parent
                </button>
              )}
              {st !== "approved" && <span className="text-xs text-slate-400">Approve the record first to enable sharing.</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
