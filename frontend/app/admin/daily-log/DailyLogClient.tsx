"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { approvalLabel, approvalAccent } from "@/lib/dailyLog";
import { BookOpen, CheckCircle2, Download, HeartPulse, Plus, Search, ShieldAlert, TriangleAlert, Utensils, X } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken, scopedBranches } from "@/lib/auth";
import DailyLogForm from "@/components/admin/daily/DailyLogForm";
import { branchShortName } from "@/lib/branch";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import { fmtDate } from "@/lib/child";
import { dailyStatusAccent, dailyStatusLabel, dailyTypeAccent, dailyTypeLabel, severityAccent } from "@/lib/daily";
import StatCard from "@/components/admin/ui/StatCard";
import StageBadge from "@/components/admin/ui/StageBadge";
import SearchSelect from "@/components/ui/SearchSelect";
import type { Branch, Child, DailyRecord, DailyRecordType, DailyStats } from "@/types";

const TYPES: DailyRecordType[] = ["observation", "incident", "safeguarding", "medication", "meal"];

export default function DailyLogClient() {
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [typeFilter, setTypeFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [approval, setApproval] = useState("approved"); // approved | pending | rejected | "" (all)
  const [q, setQ] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const token = getAccessToken();
    if (!token) { setError("Not authenticated — please sign in as admin."); setLoading(false); return; }
    const [r, s, b] = await Promise.allSettled([
      api.adminGetDailyRecords(token, { type: typeFilter, branch: branchFilter, approval, q, limit: 500 }),
      api.adminGetDailyStats(token),
      api.adminGetBranches(token),
    ]);
    if (r.status === "fulfilled") setRecords((r.value as DailyRecord[]) ?? []);
    if (s.status === "fulfilled") setStats(s.value as DailyStats);
    if (b.status === "fulfilled") setBranches(scopedBranches((b.value as Branch[]) ?? []));
    setLoading(false);
  };
  useEffect(() => { void load(); }, [typeFilter, branchFilter, approval, q]);
  // Safeguarding/medication entries logged by another staff member show up
  // here without a manual reload — this is the highest-value page for it.
  useAutoRefresh(load, 30_000);

  const branchName = useMemo(() => {
    const m = new Map(branches.map((b) => [b.slug, branchShortName(b)]));
    return (slug: string) => m.get(slug) ?? slug;
  }, [branches]);


  const openCreate = () => setShowForm(true);

  const setStatus = async (rec: DailyRecord, status: string) => {
    const token = getAccessToken();
    if (!token) return;
    setBusy(rec.id); setError(null);
    try { await api.adminSetDailyRecordStatus(token, rec.id, status); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Action failed"); }
    finally { setBusy(null); }
  };

  const exportCsv = () => {
    const header = ["Ref", "Type", "Child", "Branch", "Title", "Date", "Status", "Severity"];
    const lines = records.map((r) => [
      r.ref ?? "", r.type, r.child_name ?? "", branchName(r.branch_slug), r.title, r.date, r.status, r.severity ?? "",
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `daily-log-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };


  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">Daily log</h1>
          <p className="text-sm text-slate-500">Observations, incidents, safeguarding, medication &amp; meals — the practitioner record that feeds the Command Centre &amp; Ofsted view.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><Download className="h-4 w-4" /> CSV</button>
          <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700"><Plus className="h-4 w-4" /> Add record</button>
        </div>
      </div>

      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">{error}</p>}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Safeguarding open" value={stats?.safeguarding_open ?? "—"} icon={ShieldAlert} accent="red" />
        <StatCard label="Incidents today" value={stats?.incidents_today ?? "—"} icon={TriangleAlert} accent="orange" />
        <StatCard label="Medication due" value={stats?.medication_due ?? "—"} icon={HeartPulse} accent="violet" />
        <StatCard label="Meals served" value={stats?.meals_served ?? "—"} icon={Utensils} accent="green" />
        <StatCard label="Observations" value={stats?.observations_week ?? "—"} sub="last 7 days" icon={BookOpen} accent="sky" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => setTypeFilter("")} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${typeFilter === "" ? "bg-teal-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>All</button>
          {TYPES.map((t) => (
            <button key={t} type="button" onClick={() => setTypeFilter(t)} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${typeFilter === t ? "bg-teal-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{dailyTypeLabel[t]}</button>
          ))}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, child, ref…" className="rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-sm" />
        </div>
        <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="">All branches</option>
          {branches.map((b) => <option key={b.slug} value={b.slug}>{branchShortName(b)}</option>)}
        </select>
        <span className="ml-auto text-sm text-slate-400">{records.length} shown</span>
      </div>

      <div className="mb-3 flex gap-2">
        {[{ k: "approved", label: "Approved" }, { k: "pending", label: "Awaiting approval" }, { k: "rejected", label: "Rejected" }, { k: "", label: "All" }].map((t) => (
          <button key={t.k} type="button" onClick={() => setApproval(t.k)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${approval === t.k ? "bg-teal-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{t.label}</button>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr>{["Ref", "Type", "Child", "Branch", "Title", "Date", "Status", "Approval", ""].map((h) => <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={9} className="px-4 py-6 text-slate-400">Loading…</td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-400">No records match.</td></tr>
            ) : records.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs text-slate-500"><Link href={`/admin/daily-log/${r.id}`} className="hover:text-teal-600">{r.ref ?? "view"}</Link></td>
                <td className="px-4 py-3"><StageBadge label={dailyTypeLabel[r.type]} accent={dailyTypeAccent[r.type]} withDot={false} /></td>
                <td className="px-4 py-3 text-slate-700">{r.child_name || "—"}</td>
                <td className="px-4 py-3 text-slate-500">{branchName(r.branch_slug)}</td>
                <td className="px-4 py-3 text-slate-800">
                  {r.title}
                  {r.severity && <span className="ml-2 align-middle"><StageBadge label={r.severity} accent={severityAccent[r.severity] ?? "slate"} withDot={false} /></span>}
                </td>
                <td className="px-4 py-3 text-slate-500">{fmtDate(r.date)}</td>
                <td className="px-4 py-3"><StageBadge label={dailyStatusLabel[r.status]} accent={dailyStatusAccent[r.status]} withDot={r.status === "open"} /></td>
                <td className="px-4 py-3"><StageBadge label={approvalLabel[r.approval_status ?? ""] ?? "—"} accent={approvalAccent[r.approval_status ?? ""] ?? "slate"} withDot={(r.approval_status ?? "") === "pending"} /></td>
                <td className="px-4 py-3 text-right">
                  {r.status === "open" && (r.type === "safeguarding" || r.type === "incident") && (
                    <button type="button" disabled={busy === r.id} onClick={() => setStatus(r, "resolved")} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"><CheckCircle2 className="h-3.5 w-3.5" /> Resolve</button>
                  )}
                  {r.status === "open" && r.type === "medication" && (
                    <button type="button" disabled={busy === r.id} onClick={() => setStatus(r, "administered")} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"><CheckCircle2 className="h-3.5 w-3.5" /> Administer</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <DailyLogForm
          branches={branches}
          defaultBranch={branchFilter}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); void load(); }}
        />
      )}

      <style jsx>{`
        :global(.inp) { width: 100%; border-radius: 0.5rem; border: 1px solid rgb(226 232 240); padding: 0.5rem 0.75rem; font-size: 0.875rem; }
      `}</style>
    </>
  );
}

