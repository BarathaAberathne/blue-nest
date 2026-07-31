"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { CalendarCheck, CheckCircle2, Clock, LogOut, UserCheck, UserX } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { branchShortName } from "@/lib/branch";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import StatCard from "@/components/admin/ui/StatCard";
import StageBadge from "@/components/admin/ui/StageBadge";
import { attendanceAccent, fmtTime } from "@/lib/child";
import type { AttendanceRecord, AttendanceStats, Branch } from "@/types";

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function AttendanceClient() {
  const [rows, setRows] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [date, setDate] = useState(todayStr());
  const [branch, setBranch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const loadBranches = async () => {
    try { setBranches((await api.getBranches()) as Branch[]); } catch { /* non-fatal */ }
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
      api.adminGetRegister(token, { date, branch }),
      api.adminGetAttendanceToday(token, { date, branch }),
    ]);
    if (requestIdRef.current !== myId) return; // superseded by a newer request — discard
    if (r.status === "fulfilled") setRows((r.value as AttendanceRecord[]) ?? []);
    if (s.status === "fulfilled") setStats(s.value as AttendanceStats);
    if (!opts?.silent) setLoading(false);
  };
  useEffect(() => { void loadBranches(); }, []);
  useEffect(() => { void load(); }, [date, branch]);
  // Background auto-refresh — same data, no loading flash — so the page
  // reflects kiosk clock-ins etc. without a manual browser refresh.
  useAutoRefresh(() => load({ silent: true }), 30_000);

  const branchName = useMemo(() => new Map(branches.map((b) => [b.slug, branchShortName(b)])), [branches]);

  // Register grouped by branch (alphabetical), children alphabetical within.
  const sortedRows = useMemo(() => [...rows].sort((a, b) => {
    const ba = branchName.get(a.branch_slug) ?? a.branch_slug, bb = branchName.get(b.branch_slug) ?? b.branch_slug;
    const byBranch = ba.localeCompare(bb, undefined, { sensitivity: "base" });
    return byBranch !== 0 ? byBranch : (a.child_name || "").localeCompare(b.child_name || "", undefined, { sensitivity: "base" });
  }), [rows, branchName]);

  const act = async (fn: () => Promise<unknown>, key: string) => {
    const token = getAccessToken();
    if (!token) return;
    setBusy(key); setError(null);
    try { await fn(); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Action failed"); }
    finally { setBusy(null); }
  };

  const checkIn = (r: AttendanceRecord) => act(() => api.adminCheckIn(getAccessToken()!, { child_id: r.child_id, date }), `in-${r.child_id}`);
  const checkOut = (r: AttendanceRecord) => act(() => api.adminCheckOut(getAccessToken()!, { child_id: r.child_id, date }), `out-${r.child_id}`);
  const mark = (r: AttendanceRecord, status: string) => act(() => api.adminMarkAttendance(getAccessToken()!, { child_id: r.child_id, date, status }), `mark-${r.child_id}`);

  const isToday = date === todayStr();

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">Child attendance register</h1>
          <p className="text-sm text-slate-500">Check children in and out, or mark absences. Live figures feed the Command Centre.</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <select value={branch} onChange={(e) => setBranch(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="">All branches</option>
            {branches.map((b) => <option key={b.slug} value={b.slug}>{branchShortName(b)}</option>)}
          </select>
        </div>
      </div>

      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">{error}</p>}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Present" value={stats?.present ?? "—"} icon={UserCheck} accent="green" />
        <StatCard label="Checked in" value={stats?.checked_in ?? "—"} sub="not yet out" icon={Clock} accent="teal" />
        <StatCard label="Absent" value={stats?.absent ?? "—"} icon={UserX} accent="red" />
        <StatCard label="Expected" value={stats?.expected ?? "—"} icon={CalendarCheck} accent="slate" />
        <StatCard label="Child attendance" value={stats ? `${stats.attendance_rate}%` : "—"} sub={stats ? `${stats.late_pickups} late pickups` : undefined} accent="blue" progress={stats?.attendance_rate} />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr>{["Child", "Branch", "Status", "In", "Out", "Actions"].map((h) => <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-6 text-slate-400">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">No active children for this selection.</td></tr>
            ) : sortedRows.map((r, i) => {
              const busyIn = busy === `in-${r.child_id}`, busyOut = busy === `out-${r.child_id}`, busyMark = busy === `mark-${r.child_id}`;
              const anyBusy = busyIn || busyOut || busyMark;
              const showHeader = i === 0 || sortedRows[i - 1].branch_slug !== r.branch_slug;
              return (
                <Fragment key={r.child_id}>
                {showHeader && (
                  <tr className="bg-slate-50/70"><td colSpan={6} className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">{branchName.get(r.branch_slug) ?? r.branch_slug}</td></tr>
                )}
                <tr className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{r.child_name}</td>
                  <td className="px-4 py-3 text-slate-500">{branchName.get(r.branch_slug) ?? r.branch_slug}</td>
                  <td className="px-4 py-3"><StageBadge label={r.status} accent={attendanceAccent[r.status]} withDot /></td>
                  <td className="px-4 py-3 text-slate-500">{fmtTime(r.check_in)}</td>
                  <td className="px-4 py-3 text-slate-500">{fmtTime(r.check_out)}{r.late_pickup && <span className="ml-1 align-middle"><StageBadge label="late" accent="amber" withDot={false} /></span>}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {!r.check_in ? (
                        <button type="button" disabled={anyBusy} onClick={() => checkIn(r)} className="inline-flex items-center gap-1 rounded-md bg-teal-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-50"><CheckCircle2 className="h-3.5 w-3.5" /> In</button>
                      ) : !r.check_out ? (
                        <button type="button" disabled={anyBusy} onClick={() => checkOut(r)} className="inline-flex items-center gap-1 rounded-md bg-slate-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"><LogOut className="h-3.5 w-3.5" /> Out</button>
                      ) : (
                        <span className="text-xs text-slate-400">Done</span>
                      )}
                      {r.status !== "absent" && <button type="button" disabled={anyBusy} onClick={() => mark(r, "absent")} className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50">Absent</button>}
                      {r.status !== "sick" && <button type="button" disabled={anyBusy} onClick={() => mark(r, "sick")} className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50">Sick</button>}
                      {r.status !== "holiday" && <button type="button" disabled={anyBusy} onClick={() => mark(r, "holiday")} className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50">Holiday</button>}
                    </div>
                  </td>
                </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {!isToday && <p className="mt-3 text-xs text-slate-400">Editing a past/future date — check-in/out timestamps use the current time.</p>}
    </>
  );
}
