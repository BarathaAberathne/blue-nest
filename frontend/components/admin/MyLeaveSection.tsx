"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import type { LeaveBalances, LeaveRequest, LeaveType } from "@/types";

const TYPE_OPTIONS: { value: LeaveType; label: string }[] = [
  { value: "leave", label: "Annual leave" },
  { value: "unpaid_leave", label: "Unpaid leave" },
  { value: "maternity", label: "Maternity / paternity" },
  { value: "dependant_sick", label: "Dependant sick leave" },
  { value: "sick", label: "Sick leave" },
];

const TYPE_LABEL: Record<string, string> = Object.fromEntries(TYPE_OPTIONS.map((t) => [t.value, t.label]));

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  declined: "bg-rose-100 text-rose-700",
  cancelled: "bg-slate-200 text-slate-600",
};

function fmt(d: string) {
  const dt = new Date(d + "T00:00:00");
  return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Self-service leave — balances, a request wizard (with the selected type's
 * remaining shown live), and the caller's own requests. Approval stays a
 * four-eyes manager action elsewhere; this is the applicant's view. Rendered
 * inside the My Profile hub's Leave tab.
 */
export default function MyLeaveSection() {
  const token = typeof window !== "undefined" ? getAccessToken() : "";
  const [items, setItems] = useState<LeaveRequest[]>([]);
  const [balances, setBalances] = useState<LeaveBalances>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [type, setType] = useState<LeaveType>("leave");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    api.getMyLeaveRequests(token)
      .then((r) => setItems(r ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load leave"))
      .finally(() => setLoading(false));
    api.getMyLeaveBalance(token).then((b) => setBalances(b ?? {})).catch(() => { /* non-blocking */ });
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const workingDays = useMemo(() => {
    if (!start || !end) return 0;
    const s = new Date(start + "T00:00:00");
    const e = new Date(end + "T00:00:00");
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e < s) return 0;
    let n = 0;
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      const wd = d.getDay();
      if (wd !== 0 && wd !== 6) n++;
    }
    return n;
  }, [start, end]);

  const submit = async () => {
    if (!token || !start || !end) return;
    setBusy(true); setError(null);
    try {
      await api.applyLeaveRequest(token, { type, start_date: start, end_date: end, reason: reason.trim() || undefined });
      setStart(""); setEnd(""); setReason(""); setType("leave");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit leave request");
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (id: string) => {
    if (!token) return;
    setBusy(true); setError(null);
    try { await api.cancelLeaveRequest(token, id); load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to cancel"); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>}

      {/* Balances — one card per leave type. Capped types (annual, and sick when
          an allowance is set) show remaining vs allowance; the rest show usage. */}
      {Object.keys(balances).length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TYPE_OPTIONS.map((t) => balances[t.value]).filter((b): b is NonNullable<typeof b> => !!b).map((b) => (
            <div key={b.type} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {TYPE_LABEL[b.type] ?? b.type} · {b.year}/{String((b.year + 1) % 100).padStart(2, "0")}
              </p>
              {b.capped ? (
                <>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="font-heading text-3xl leading-none text-emerald-600">{b.remaining}</span>
                    <span className="text-sm text-slate-500">of {b.allowance} days left</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{b.taken} taken · {b.pending} pending</p>
                </>
              ) : (
                <>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="font-heading text-3xl leading-none text-slate-700">{b.taken}</span>
                    <span className="text-sm text-slate-500">day{b.taken === 1 ? "" : "s"} taken this year</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{b.pending} pending · no allowance limit</p>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Apply form */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-600">
          <CalendarDays className="h-4 w-4 text-teal-600" /> Request leave
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-600">Type</span>
            <select value={type} onChange={(e) => setType(e.target.value as LeaveType)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              {TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-600">Reason (optional)</span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. family holiday" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-600">Start date</span>
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-600">End date</span>
            <input type="date" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </label>
        </div>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div className="text-sm">
            <p className="text-slate-500">{workingDays > 0 ? `${workingDays} working day${workingDays === 1 ? "" : "s"}` : "Pick a date range"}</p>
            {(() => {
              const sb = balances[type];
              if (sb?.capped) {
                const over = workingDays > sb.remaining;
                return <p className={`text-xs ${over ? "text-rose-600" : "text-slate-400"}`}>
                  {sb.remaining} of {sb.allowance} {TYPE_LABEL[type]?.toLowerCase()} days left{over ? " — exceeds your allowance" : ""}
                </p>;
              }
              return <p className="text-xs text-slate-400">{TYPE_LABEL[type]} isn&rsquo;t deducted from an allowance</p>;
            })()}
          </div>
          <button type="button" onClick={submit}
            disabled={busy || workingDays === 0 || (!!balances[type]?.capped && workingDays > (balances[type]?.remaining ?? 0))}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">
            {busy ? "Submitting…" : "Submit request"}
          </button>
        </div>
      </div>

      {/* My requests */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-3"><h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">My requests</h2></div>
        {loading ? (
          <p className="px-5 py-8 text-center text-sm text-slate-400">Loading…</p>
        ) : items.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-400">No leave requests yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((lr) => (
              <li key={lr.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{TYPE_LABEL[lr.type] ?? lr.type}</p>
                  <p className="text-xs text-slate-500">{fmt(lr.start_date)} → {fmt(lr.end_date)} · {lr.days} day{lr.days === 1 ? "" : "s"}{lr.reason ? ` · ${lr.reason}` : ""}</p>
                  {lr.status === "declined" && lr.decline_reason && <p className="text-xs text-rose-600">Declined: {lr.decline_reason}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE[lr.status] ?? "bg-slate-100 text-slate-600"}`}>{lr.status}</span>
                  {lr.status === "pending" && (
                    <button type="button" onClick={() => cancel(lr.id)} disabled={busy} className="text-xs font-medium text-slate-500 hover:text-rose-600 disabled:opacity-50">Cancel</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
