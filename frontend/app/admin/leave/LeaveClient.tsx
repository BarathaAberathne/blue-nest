"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { fmtBranch } from "@/lib/enquiry";
import type { LeaveRequest, LeaveStatus } from "@/types";

const TYPE_LABEL: Record<string, string> = {
  leave: "Annual leave",
  unpaid_leave: "Unpaid leave",
  maternity: "Maternity / paternity",
  dependant_sick: "Dependant sick leave",
  sick: "Sick leave",
};

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  declined: "bg-rose-100 text-rose-700",
  cancelled: "bg-slate-200 text-slate-600",
};

const TABS: { key: LeaveStatus | "all"; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "declined", label: "Declined" },
  { key: "all", label: "All" },
];

function fmt(d: string) {
  const dt = new Date(d + "T00:00:00");
  return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function LeaveClient() {
  const token = typeof window !== "undefined" ? getAccessToken() : "";
  const [items, setItems] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tab, setTab] = useState<LeaveStatus | "all">("pending");

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    api.adminGetLeaveRequests(token)
      .then((r) => setItems(r ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load leave requests"))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const approve = async (id: string) => {
    if (!token) return;
    setBusyId(id); setError(null);
    try { await api.adminApproveLeaveRequest(token, id); load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to approve"); }
    finally { setBusyId(null); }
  };

  const decline = async (id: string) => {
    if (!token) return;
    const reason = window.prompt("Reason for declining this leave request?");
    if (reason === null) return;
    if (!reason.trim()) { setError("A reason is required to decline."); return; }
    setBusyId(id); setError(null);
    try { await api.adminDeclineLeaveRequest(token, id, reason.trim()); load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to decline"); }
    finally { setBusyId(null); }
  };

  const shown = tab === "all" ? items : items.filter((lr) => lr.status === tab);
  const pendingCount = items.filter((lr) => lr.status === "pending").length;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 font-heading text-2xl font-bold text-slate-900">
          <CalendarDays className="h-6 w-6 text-teal-600" /> Leave Requests
        </h1>
        <p className="text-sm text-slate-500">Approve or decline staff time-off. Approved leave is written to the attendance register automatically.</p>
      </div>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>}

      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${tab === t.key ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
            {t.label}{t.key === "pending" && pendingCount > 0 ? ` (${pendingCount})` : ""}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <p className="px-5 py-8 text-center text-sm text-slate-400">Loading…</p>
        ) : shown.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-400">No {tab === "all" ? "" : tab} leave requests.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {shown.map((lr) => (
              <li key={lr.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">
                    {lr.staff_name} <span className="font-normal text-slate-400">· {fmtBranch(lr.branch_slug)}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {TYPE_LABEL[lr.type] ?? lr.type} · {fmt(lr.start_date)} → {fmt(lr.end_date)} · {lr.days} day{lr.days === 1 ? "" : "s"}{lr.reason ? ` · ${lr.reason}` : ""}
                  </p>
                  {lr.status === "declined" && lr.decline_reason && <p className="text-xs text-rose-600">Declined: {lr.decline_reason}</p>}
                  {lr.status !== "pending" && lr.reviewed_by && <p className="text-xs text-slate-400">by {lr.reviewed_by}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE[lr.status] ?? "bg-slate-100 text-slate-600"}`}>{lr.status}</span>
                  {lr.status === "pending" && (
                    <>
                      <button type="button" onClick={() => approve(lr.id)} disabled={busyId === lr.id}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50">Approve</button>
                      <button type="button" onClick={() => decline(lr.id)} disabled={busyId === lr.id}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50">Decline</button>
                    </>
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
