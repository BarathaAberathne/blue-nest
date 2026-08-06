"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, LogOut, Pencil, Search, Timer, UserCheck, UserMinus, UserX } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken, getAuthUser, isOrgWideRole } from "@/lib/auth";
import { branchShortName } from "@/lib/branch";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import StatCard from "@/components/admin/ui/StatCard";
import ExportCsvButton from "@/components/admin/ExportCsvButton";
import StageBadge from "@/components/admin/ui/StageBadge";
import { fmtTime } from "@/lib/child";
import { staffAttendanceAccent } from "@/lib/staff";
import type { AttendanceDaySummary, Branch, StaffAttendanceRecord } from "@/types";

const todayStr = () => new Date().toISOString().slice(0, 10);

// fmtHours renders worked minutes as "7h 30m"; 0/undefined → "—".
const fmtHours = (min?: number) => {
  if (!min || min <= 0) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h${m ? ` ${m}m` : ""}` : `${m}m`;
};
const fmtMins = (min?: number) => (min && min > 0 ? `${min}m` : "—");

// toHM converts an ISO timestamp to a local "HH:MM" for the correction form.
const toHM = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

// Attendance statuses a manager can mark, with human labels. The leave/absence
// taxonomy is explicit so sickness, dependant care, unpaid and maternity leave
// are each recorded (and reported) distinctly rather than lumped as "on leave".
const STATUS_OPTIONS = [
  "present", "absent", "leave", "sick", "dependant_sick",
  "unpaid_leave", "maternity", "training", "meeting", "remote",
] as const;
const STATUS_LABEL: Record<string, string> = {
  expected: "Expected",
  present: "Present",
  absent: "Unauthorised absence",
  leave: "Annual leave",
  sick: "Sick leave",
  dependant_sick: "Dependant / child sick",
  unpaid_leave: "Unpaid (no-pay) leave",
  maternity: "Maternity leave",
  training: "Training",
  meeting: "Meeting",
  remote: "Remote",
};
const statusLabel = (s: string) => STATUS_LABEL[s] ?? s;

export default function StaffAttendanceClient() {
  const [rows, setRows] = useState<StaffAttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceDaySummary | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [date, setDate] = useState(todayStr());
  const [branch, setBranch] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<StaffAttendanceRecord | null>(null);

  // Org-wide roles may view "All branches"; scoped roles only see their own
  // branches and are pinned to one at a time (matches the backend scope).
  const orgWide = isOrgWideRole(getAuthUser()?.role);
  const loadBranches = async () => {
    const token = getAccessToken();
    if (!token) return;
    try {
      const list = ((await api.adminGetBranches(token)) ?? []).filter((b) => !b.archived_at) as Branch[];
      setBranches(list);
      if (!orgWide) setBranch((cur) => cur || list[0]?.slug || "");
    } catch { /* non-fatal */ }
  };
  // requestIdRef guards against an in-flight response from a superseded
  // filter (e.g. Harrow → Pinner mid-flight) overwriting newer data.
  const requestIdRef = useRef(0);
  const load = async (opts?: { silent?: boolean }) => {
    const token = getAccessToken();
    if (!token) { setError("Not authenticated — please sign in as admin."); setLoading(false); return; }
    const myId = ++requestIdRef.current;
    if (!opts?.silent) setLoading(true);
    const [r, s] = await Promise.allSettled([
      api.adminGetStaffRegister(token, { date, branch }),
      api.adminGetAttendanceSummary(token, { date, branch }),
    ]);
    if (requestIdRef.current !== myId) return; // superseded by a newer request — discard
    if (r.status === "fulfilled") setRows((r.value as StaffAttendanceRecord[]) ?? []);
    if (s.status === "fulfilled") setSummary(s.value as AttendanceDaySummary);
    if (!opts?.silent) setLoading(false);
  };
  useEffect(() => { void loadBranches(); }, []);
  useEffect(() => { void load(); }, [date, branch]);
  // Background auto-refresh — same data, no loading flash — so the page
  // reflects kiosk clock-ins etc. without a manual browser refresh.
  useAutoRefresh(() => load({ silent: true }), 30_000);

  const branchName = useMemo(() => new Map(branches.map((b) => [b.slug, branchShortName(b)])), [branches]);

  const act = async (fn: () => Promise<unknown>, key: string) => {
    const token = getAccessToken();
    if (!token) return;
    setBusy(key); setError(null);
    try { await fn(); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Action failed"); }
    finally { setBusy(null); }
  };

  const clockIn = (r: StaffAttendanceRecord) => act(() => api.adminStaffClockIn(getAccessToken()!, { staff_id: r.staff_id, date }), `in-${r.staff_id}`);
  const clockOut = (r: StaffAttendanceRecord) => act(() => api.adminStaffClockOut(getAccessToken()!, { staff_id: r.staff_id, date }), `out-${r.staff_id}`);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.staff_name.toLowerCase().includes(q) ||
        (r.job_title ?? "").toLowerCase().includes(q) ||
        (r.room_name ?? "").toLowerCase().includes(q)
      );
    }).sort((a, b) => {
      // Grouped by branch (alphabetical), staff alphabetical within.
      const ba = branchName.get(a.branch_slug) ?? a.branch_slug, bb = branchName.get(b.branch_slug) ?? b.branch_slug;
      const byBranch = ba.localeCompare(bb, undefined, { sensitivity: "base" });
      return byBranch !== 0 ? byBranch : a.staff_name.localeCompare(b.staff_name, undefined, { sensitivity: "base" });
    });
  }, [rows, query, statusFilter, branchName]);

  const rate = summary?.attendance_rate ?? 0;
  const allBranches = branch === "" && (summary?.branches?.length ?? 0) > 0;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">Staff Attendance</h1>
          <p className="text-sm text-slate-500">The authoritative record of worked hours — captured at the kiosk, corrected here, feeding payroll &amp; the Command Centre.</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <select value={branch} onChange={(e) => setBranch(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            {orgWide && <option value="">All branches</option>}
            {branches.map((b) => <option key={b.slug} value={b.slug}>{branchShortName(b)}</option>)}
          </select>
          <ExportCsvButton path={`/api/v1/admin/staff-attendance/export?date=${encodeURIComponent(date)}&branch=${encodeURIComponent(branch)}`} />
        </div>
      </div>

      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">{error}</p>}

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-8">
        <StatCard label="Currently in" value={summary?.currently_in ?? "—"} icon={UserCheck} accent="green" />
        <StatCard label="Clocked out" value={summary?.clocked_out ?? "—"} icon={LogOut} accent="slate" />
        <StatCard label="Unauthorised absent" value={summary?.absent ?? "—"} icon={UserX} accent="red" />
        <StatCard label="Away (leave)" value={summary?.on_leave ?? "—"} icon={UserMinus} accent="sky" />
        <StatCard label="Late" value={summary?.late ?? "—"} icon={Clock} accent="amber" />
        <StatCard label="Overtime" value={summary ? fmtMins(summary.overtime_minutes) : "—"} icon={Timer} accent="violet" />
        <StatCard label="Missing clock-out" value={summary?.missing_clockout ?? "—"} icon={AlertTriangle} accent="orange" />
        <StatCard label="Attendance" value={summary ? `${rate}%` : "—"} sub={summary ? `avg in ${summary.avg_arrival || "—"}` : undefined} accent="blue" progress={rate} />
      </div>

      {/* Leave & absence breakdown — so "Away (leave)" is never a black box that
          hides sickness or maternity behind a single number. */}
      {summary && summary.on_leave > 0 && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Leave &amp; absence breakdown</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: "Annual leave", value: summary.annual_leave },
              { label: "Sick leave", value: summary.sick },
              { label: "Dependant / child sick", value: summary.dependant_sick },
              { label: "Unpaid (no-pay)", value: summary.unpaid_leave },
              { label: "Maternity", value: summary.maternity },
              { label: "Training / other", value: summary.other_away },
            ].map((b) => (
              <div key={b.label} className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-lg font-bold text-slate-900">{b.value ?? 0}</p>
                <p className="text-xs text-slate-500">{b.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {allBranches && (
        <div className="card mb-6 overflow-x-auto">
          <div className="border-b border-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Branch comparison</div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr>{["Branch", "In", "Attended", "Late", "Rate", "Total"].map((h) => <th key={h} className="px-4 py-2.5 text-left font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {summary!.branches!.map((b) => (
                <tr key={b.branch} className="cursor-pointer hover:bg-slate-50" onClick={() => setBranch(b.branch)}>
                  <td className="px-4 py-2.5 font-medium text-slate-900">{branchName.get(b.branch) ?? b.branch}</td>
                  <td className="px-4 py-2.5 text-slate-600">{b.currently_in}</td>
                  <td className="px-4 py-2.5 text-slate-600">{b.attended}</td>
                  <td className="px-4 py-2.5 text-slate-600">{b.late}</td>
                  <td className="px-4 py-2.5"><StageBadge label={`${b.attendance_rate}%`} accent={b.attendance_rate >= 80 ? "green" : b.attendance_rate >= 50 ? "amber" : "red"} withDot={false} /></td>
                  <td className="px-4 py-2.5 text-slate-400">{b.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, position, room…" className="w-64 rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="">All statuses</option>
          {(["expected", ...STATUS_OPTIONS] as string[]).map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
        </select>
        <span className="ml-auto text-xs text-slate-400">{filtered.length} of {rows.length} staff</span>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr>{["Staff", "Position", "Room", "In", "Out", "Hours", "Late", "OT", "Status", "Actions"].map((h) => <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={10} className="px-4 py-6 text-slate-400">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-sm text-slate-400">No staff match this selection.</td></tr>
            ) : filtered.map((r, i) => {
              const anyBusy = busy === `in-${r.staff_id}` || busy === `out-${r.staff_id}`;
              const showHeader = i === 0 || filtered[i - 1].branch_slug !== r.branch_slug;
              return (
                <Fragment key={r.staff_id}>
                {showHeader && (
                  <tr className="bg-slate-50/70"><td colSpan={10} className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">{branchName.get(r.branch_slug) ?? r.branch_slug}</td></tr>
                )}
                <tr className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{r.staff_name}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{r.job_title || "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{r.room_name || "—"}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {fmtTime(r.clock_in)}
                    {r.late_arrival && <span className="ml-1 align-middle"><StageBadge label="late" accent="amber" withDot={false} /></span>}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {fmtTime(r.clock_out)}
                    {r.missing_clockout && <span className="ml-1 align-middle"><StageBadge label="missing" accent="orange" withDot={false} /></span>}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-700">{fmtHours(r.worked_minutes)}</td>
                  <td className="px-4 py-3 text-slate-500">{fmtMins(r.late_minutes)}</td>
                  <td className="px-4 py-3 text-slate-500">{fmtMins(r.overtime_minutes)}</td>
                  <td className="px-4 py-3"><StageBadge label={statusLabel(r.status)} accent={staffAttendanceAccent[r.status]} withDot /></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {!r.clock_in ? (
                        <button type="button" disabled={anyBusy} onClick={() => clockIn(r)} className="inline-flex items-center gap-1 rounded-md bg-teal-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-50"><CheckCircle2 className="h-3.5 w-3.5" /> In</button>
                      ) : !r.clock_out ? (
                        <button type="button" disabled={anyBusy} onClick={() => clockOut(r)} className="inline-flex items-center gap-1 rounded-md bg-slate-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"><LogOut className="h-3.5 w-3.5" /> Out</button>
                      ) : null}
                      <button type="button" onClick={() => setEditing(r)} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"><Pencil className="h-3.5 w-3.5" /> Correct</button>
                    </div>
                  </td>
                </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <CorrectionModal
          record={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await load(); }}
        />
      )}
    </>
  );
}

function CorrectionModal({ record, onClose, onSaved }: { record: StaffAttendanceRecord; onClose: () => void; onSaved: () => void }) {
  const [status, setStatus] = useState<string>(record.status);
  const [clockIn, setClockIn] = useState(toHM(record.clock_in));
  const [clockOut, setClockOut] = useState(toHM(record.clock_out));
  const [notes, setNotes] = useState(record.notes ?? "");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    const token = getAccessToken();
    if (!token) return;
    if (!reason.trim()) { setErr("A reason is required for the audit log."); return; }
    setSaving(true); setErr(null);
    // Only send fields that changed, so unchanged values don't append noise entries.
    // staff_id + date let the backend create the record when the day has none yet.
    const body: import("@/types").AttendanceCorrectionInput = { reason: reason.trim(), staff_id: record.staff_id, date: record.date };
    if (status !== record.status) body.status = status;
    if (clockIn !== toHM(record.clock_in)) body.clock_in = clockIn;
    if (clockOut !== toHM(record.clock_out)) body.clock_out = clockOut;
    if (notes !== (record.notes ?? "")) body.notes = notes;
    try {
      await api.adminCorrectAttendance(token, record.id, body);
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save correction");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-heading text-lg font-bold text-slate-900">Correct attendance</h2>
        <p className="mb-4 text-sm text-slate-500">{record.staff_name} · {record.date}</p>
        {err && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-500">{err}</p>}
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              {[record.status === "expected" ? "expected" : null, ...STATUS_OPTIONS].filter(Boolean).map((s) => <option key={s as string} value={s as string}>{statusLabel(s as string)}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Clock in</span>
              <input type="time" value={clockIn} onChange={(e) => setClockIn(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Clock out</span>
              <input type="time" value={clockOut} onChange={(e) => setClockOut(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Notes</span>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Reason for change <span className="text-red-400">*</span></span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. forgot to clock out" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </label>
        </div>
        {(record.corrections?.length ?? 0) > 0 && (
          <div className="mt-4 max-h-32 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-slate-500">
            <div className="mb-1 font-medium text-slate-600">History</div>
            {record.corrections!.map((c, i) => (
              <div key={i}>{c.field}: {c.from || "—"} → {c.to || "—"} <span className="text-slate-400">by {c.actor_name}</span></div>
            ))}
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
          <button type="button" disabled={saving} onClick={save} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{saving ? "Saving…" : "Save correction"}</button>
        </div>
      </div>
    </div>
  );
}
