"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, GraduationCap, LogOut, Plane, UserCheck, UserX } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { branchShortName } from "@/lib/branch";
import StatCard from "@/components/admin/ui/StatCard";
import StageBadge from "@/components/admin/ui/StageBadge";
import { fmtTime } from "@/lib/child";
import { staffAttendanceAccent } from "@/lib/staff";
import type { Branch, StaffAttendanceRecord, StaffStats } from "@/types";

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function StaffAttendanceClient() {
  const [rows, setRows] = useState<StaffAttendanceRecord[]>([]);
  const [stats, setStats] = useState<StaffStats | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [date, setDate] = useState(todayStr());
  const [branch, setBranch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const loadBranches = async () => {
    try { setBranches((await api.getBranches()) as Branch[]); } catch { /* non-fatal */ }
  };
  const load = async () => {
    const token = getAccessToken();
    if (!token) { setError("Not authenticated — please sign in as admin."); setLoading(false); return; }
    setLoading(true);
    const [r, s] = await Promise.allSettled([
      api.adminGetStaffRegister(token, { date, branch }),
      api.adminGetStaffStats(token, { date, branch }),
    ]);
    if (r.status === "fulfilled") setRows((r.value as StaffAttendanceRecord[]) ?? []);
    if (s.status === "fulfilled") setStats(s.value as StaffStats);
    setLoading(false);
  };
  useEffect(() => { void loadBranches(); }, []);
  useEffect(() => { void load(); }, [date, branch]);

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
  const mark = (r: StaffAttendanceRecord, status: string) => act(() => api.adminMarkStaffAttendance(getAccessToken()!, { staff_id: r.staff_id, date, status }), `mark-${r.staff_id}`);

  const attendanceRate = stats?.attendance_rate ?? 0;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">Staff rota</h1>
          <p className="text-sm text-slate-500">Clock staff in and out, or record leave, sickness &amp; training. Live figures feed the Command Centre.</p>
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
        <StatCard label="Present" value={stats?.present ?? "—"} sub={stats ? `${stats.late_arrival} late` : undefined} icon={UserCheck} accent="green" />
        <StatCard label="On leave" value={stats?.on_leave ?? "—"} icon={Plane} accent="sky" />
        <StatCard label="Training" value={stats?.training ?? "—"} icon={GraduationCap} accent="violet" />
        <StatCard label="Sick" value={stats?.sick ?? "—"} icon={UserX} accent="amber" />
        <StatCard label="Staff attendance" value={stats ? `${attendanceRate}%` : "—"} sub={stats ? `${stats.present}/${stats.total} present` : undefined} accent="blue" progress={attendanceRate} />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr>{["Staff", "Branch", "Status", "In", "Out", "Actions"].map((h) => <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-6 text-slate-400">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">No active staff for this selection.</td></tr>
            ) : rows.map((r) => {
              const anyBusy = busy === `in-${r.staff_id}` || busy === `out-${r.staff_id}` || busy === `mark-${r.staff_id}`;
              return (
                <tr key={r.staff_id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{r.staff_name}</td>
                  <td className="px-4 py-3 text-slate-500">{branchName.get(r.branch_slug) ?? r.branch_slug}</td>
                  <td className="px-4 py-3"><StageBadge label={r.status} accent={staffAttendanceAccent[r.status]} withDot /></td>
                  <td className="px-4 py-3 text-slate-500">{fmtTime(r.clock_in)}{r.late_arrival && <span className="ml-1 align-middle"><StageBadge label="late" accent="amber" withDot={false} /></span>}</td>
                  <td className="px-4 py-3 text-slate-500">{fmtTime(r.clock_out)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {!r.clock_in ? (
                        <button type="button" disabled={anyBusy} onClick={() => clockIn(r)} className="inline-flex items-center gap-1 rounded-md bg-teal-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-50"><CheckCircle2 className="h-3.5 w-3.5" /> In</button>
                      ) : !r.clock_out ? (
                        <button type="button" disabled={anyBusy} onClick={() => clockOut(r)} className="inline-flex items-center gap-1 rounded-md bg-slate-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"><LogOut className="h-3.5 w-3.5" /> Out</button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400"><Clock className="h-3.5 w-3.5" /> Done</span>
                      )}
                      {r.status !== "leave" && <button type="button" disabled={anyBusy} onClick={() => mark(r, "leave")} className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50">Leave</button>}
                      {r.status !== "sick" && <button type="button" disabled={anyBusy} onClick={() => mark(r, "sick")} className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50">Sick</button>}
                      {r.status !== "training" && <button type="button" disabled={anyBusy} onClick={() => mark(r, "training")} className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50">Training</button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
