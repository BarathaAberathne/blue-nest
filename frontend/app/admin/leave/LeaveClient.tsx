"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, Plus, X } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { fmtBranch } from "@/lib/enquiry";
import ExportButton from "@/components/admin/ExportButton";
import type { LeaveRequest, LeaveStatus, LeaveType, Staff } from "@/types";

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

const TABS: { key: LeaveStatus | "all" | "schedule"; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "schedule", label: "Team schedule" },
  { key: "declined", label: "Declined" },
  { key: "all", label: "All" },
];

const TYPE_OPTIONS: { value: LeaveType; label: string }[] = [
  { value: "leave", label: "Annual leave" },
  { value: "unpaid_leave", label: "Unpaid leave" },
  { value: "maternity", label: "Maternity / paternity" },
  { value: "dependant_sick", label: "Dependant sick leave" },
  { value: "sick", label: "Sick leave" },
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
  const [tab, setTab] = useState<LeaveStatus | "all" | "schedule">("pending");

  // Phase 4 — manager files leave for a staff member.
  const [addOpen, setAddOpen] = useState(false);
  const [staffOpts, setStaffOpts] = useState<Staff[]>([]);
  const [form, setForm] = useState<{ staff_id: string; type: LeaveType; start_date: string; end_date: string; reason: string }>(
    { staff_id: "", type: "leave", start_date: "", end_date: "", reason: "" });
  const [saving, setSaving] = useState(false);

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

  const openAdd = () => {
    setAddOpen(true);
    if (staffOpts.length === 0 && token) {
      api.adminGetStaff(token, { status: "active" }).then((s) => setStaffOpts(s ?? [])).catch(() => { /* non-blocking */ });
    }
  };

  const submitAdd = async () => {
    if (!token || !form.staff_id || !form.start_date || !form.end_date) return;
    setSaving(true); setError(null);
    try {
      await api.adminApplyLeaveForStaff(token, {
        staff_id: form.staff_id, type: form.type, start_date: form.start_date, end_date: form.end_date,
        reason: form.reason.trim() || undefined,
      });
      setAddOpen(false);
      setForm({ staff_id: "", type: "leave", start_date: "", end_date: "", reason: "" });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to file leave");
    } finally {
      setSaving(false);
    }
  };

  // Team schedule — approved + pending, upcoming first (a chronological coverage view).
  const schedule = useMemo(
    () => items
      .filter((lr) => lr.status === "approved" || lr.status === "pending")
      .filter((lr) => lr.end_date >= new Date().toISOString().slice(0, 10))
      .sort((a, b) => a.start_date.localeCompare(b.start_date)),
    [items],
  );

  const shown = tab === "all" ? items : tab === "schedule" ? schedule : items.filter((lr) => lr.status === tab);
  const pendingCount = items.filter((lr) => lr.status === "pending").length;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-heading text-2xl font-bold text-slate-900">
            <CalendarDays className="h-6 w-6 text-teal-600" /> Leave Requests
          </h1>
          <p className="text-sm text-slate-500">Approve or decline staff time-off. Approved leave is written to the attendance register automatically.</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton path={`/api/v1/admin/leave-requests/export?status=${["pending", "approved", "declined", "cancelled"].includes(tab) ? tab : ""}`} />
          <button type="button" onClick={openAdd}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700">
            <Plus className="h-4 w-4" /> Add leave for staff
          </button>
        </div>
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
                  {(lr.overlaps ?? 0) > 0 && (
                    <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                      <AlertTriangle className="h-3.5 w-3.5" /> {lr.overlaps} other{lr.overlaps === 1 ? "" : "s"} off at {fmtBranch(lr.branch_slug)} on these dates
                    </p>
                  )}
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

      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={(e) => { if (e.target === e.currentTarget) setAddOpen(false); }}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <h2 className="font-heading text-lg font-bold text-slate-900">Add leave for a staff member</h2>
              <button type="button" onClick={() => setAddOpen(false)} className="rounded p-1 text-slate-400 hover:bg-slate-100" aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            <p className="mb-3 text-xs text-slate-500">Filed as pending — a different manager approves it (four-eyes).</p>
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-600">Staff member</span>
                <select value={form.staff_id} onChange={(e) => setForm({ ...form, staff_id: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <option value="">Select…</option>
                  {staffOpts.map((s) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} · {fmtBranch(s.branch_slug)}</option>)}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-600">Type</span>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as LeaveType })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  {TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-600">Start</span>
                  <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-600">End</span>
                  <input type="date" value={form.end_date} min={form.start_date || undefined} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </label>
              </div>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-600">Reason (optional)</span>
                <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setAddOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={submitAdd} disabled={saving || !form.staff_id || !form.start_date || !form.end_date}
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">{saving ? "Filing…" : "File leave"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
