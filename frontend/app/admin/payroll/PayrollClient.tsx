"use client";

// Payroll (Phase D) — the monthly worked-hours roll-up from the staff
// attendance register: per-staff worked days/hours, overtime, lates, the full
// leave taxonomy, unauthorised absences and the data-quality flags payroll
// must chase (missing clock-outs, corrected days). Month picker + branch
// scope, CSV/Excel export with the same filters.

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Wallet } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken, scopedBranches } from "@/lib/auth";
import { branchShortName } from "@/lib/branch";
import ExportButton from "@/components/admin/ExportButton";
import StatCard from "@/components/admin/ui/StatCard";
import type { Branch, PayrollRow, PayrollSummary } from "@/types";

// First/last day of the month containing `d`, as YYYY-MM-DD.
function monthRange(d: Date): { from: string; to: string } {
  const from = new Date(d.getFullYear(), d.getMonth(), 1);
  const to = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const ymd = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  return { from: ymd(from), to: ymd(to) };
}

const hm = (mins: number) => `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, "0")}`;

export default function PayrollClient() {
  const [month, setMonth] = useState(() => new Date());
  const [branch, setBranch] = useState("");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [summary, setSummary] = useState<PayrollSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { from, to } = monthRange(month);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    api.adminGetBranches(token).then((b) => setBranches(scopedBranches((b as Branch[]) ?? []))).catch(() => {});
  }, []);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) { setError("Not authenticated — please sign in as admin."); setLoading(false); return; }
    setLoading(true);
    api.adminGetPayroll(token, { from, to, branch: branch || undefined })
      .then((s) => { setSummary(s); setError(null); })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load payroll"))
      .finally(() => setLoading(false));
  }, [from, to, branch]);

  const exportPath = useMemo(() => {
    const p = new URLSearchParams({ from, to });
    if (branch) p.set("branch", branch);
    return `/api/v1/admin/payroll/export?${p.toString()}`;
  }, [from, to, branch]);

  const monthLabel = month.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const t = summary?.totals;

  const leaveCell = (r: PayrollRow) => {
    const parts: string[] = [];
    if (r.annual_leave_days) parts.push(`${r.annual_leave_days} annual`);
    if (r.sick_days) parts.push(`${r.sick_days} sick`);
    if (r.dependant_sick_days) parts.push(`${r.dependant_sick_days} dependant`);
    if (r.unpaid_leave_days) parts.push(`${r.unpaid_leave_days} unpaid`);
    if (r.maternity_days) parts.push(`${r.maternity_days} maternity`);
    if (r.training_days) parts.push(`${r.training_days} training`);
    return parts.join(" · ") || "—";
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">Payroll</h1>
          <p className="text-sm text-slate-500">Worked hours &amp; leave per staff member for the month — straight from the attendance register, the single payroll source.</p>
        </div>
        <ExportButton path={exportPath} />
      </div>

      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">{error}</p>}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-1 py-1">
          <button type="button" onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))} aria-label="Previous month" className="rounded-md p-1.5 text-slate-500 hover:bg-slate-50"><ChevronLeft className="h-4 w-4" /></button>
          <span className="min-w-[130px] px-1 text-center text-sm font-semibold text-slate-800">{monthLabel}</span>
          <button type="button" onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))} aria-label="Next month" className="rounded-md p-1.5 text-slate-500 hover:bg-slate-50"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <select value={branch} onChange={(e) => setBranch(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="">All branches</option>
          {branches.map((b) => <option key={b.slug} value={b.slug}>{branchShortName(b)}</option>)}
        </select>
        <span className="ml-auto text-sm text-slate-400">{summary?.rows.length ?? 0} staff</span>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Hours worked" value={t ? hm(t.worked_minutes) : "—"} sub={t ? `${t.worked_days} staff-days` : undefined} icon={Wallet} accent="blue" />
        <StatCard label="Overtime" value={t ? hm(t.overtime_minutes) : "—"} accent="violet" />
        <StatCard label="Leave days" value={t ? t.annual_leave_days + t.sick_days + t.dependant_sick_days + t.unpaid_leave_days + t.maternity_days : "—"} sub={t ? `${t.absent_days} unauthorised absent` : undefined} accent="amber" />
        <StatCard label="To chase" value={t ? t.missing_clock_outs : "—"} sub="missing clock-outs" accent="red" />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>{["Staff", "Role", "Type", "Contract hrs/wk", "Days", "Hours", "Overtime", "Lates", "Leave & training", "Absent", "To chase"].map((h) => <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={11} className="px-4 py-6 text-slate-400">Loading…</td></tr>
            ) : (summary?.rows.length ?? 0) === 0 ? (
              <tr><td colSpan={11} className="px-4 py-8 text-center text-slate-400">No staff in scope for this month.</td></tr>
            ) : (
              <>
                {summary!.rows.map((r) => (
                  <tr key={r.staff_id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{r.staff_name}</p>
                      <p className="font-mono text-xs text-slate-400">{r.ref || r.branch_slug}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.job_title || "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{r.staff_type}</td>
                    <td className="px-4 py-3 text-slate-600">{r.contract_hours || "—"}</td>
                    <td className="px-4 py-3 text-slate-800">{r.worked_days}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{hm(r.worked_minutes)}</td>
                    <td className="px-4 py-3 text-slate-600">{r.overtime_minutes ? hm(r.overtime_minutes) : "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{r.late_count ? `${r.late_count} (${hm(r.late_minutes)})` : "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{leaveCell(r)}</td>
                    <td className={`px-4 py-3 ${r.absent_days ? "font-semibold text-red-600" : "text-slate-400"}`}>{r.absent_days || "—"}</td>
                    <td className="px-4 py-3 text-xs">
                      {r.missing_clock_outs > 0 && <span className="mr-1 rounded-full bg-red-50 px-2 py-0.5 font-medium text-red-600">{r.missing_clock_outs} no clock-out</span>}
                      {r.corrected_days > 0 && <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700">{r.corrected_days} corrected</span>}
                      {r.missing_clock_outs === 0 && r.corrected_days === 0 && <span className="text-slate-400">—</span>}
                    </td>
                  </tr>
                ))}
                {t && (
                  <tr className="bg-slate-50 font-semibold text-slate-800">
                    <td className="px-4 py-3">Total</td>
                    <td className="px-4 py-3" colSpan={3}></td>
                    <td className="px-4 py-3">{t.worked_days}</td>
                    <td className="px-4 py-3">{hm(t.worked_minutes)}</td>
                    <td className="px-4 py-3">{t.overtime_minutes ? hm(t.overtime_minutes) : "—"}</td>
                    <td className="px-4 py-3">{t.late_count || "—"}</td>
                    <td className="px-4 py-3">{leaveCell(t)}</td>
                    <td className="px-4 py-3">{t.absent_days || "—"}</td>
                    <td className="px-4 py-3">{t.missing_clock_outs ? `${t.missing_clock_outs} to chase` : "—"}</td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
