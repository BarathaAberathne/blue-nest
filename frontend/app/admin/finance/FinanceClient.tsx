"use client";

// Finance dashboard — collection KPIs + every family billing account with its
// derived balance and Direct Debit state. Balances are computed server-side
// from charges − allocated payments (never stored).

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PoundSterling } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import StageBadge from "@/components/admin/ui/StageBadge";
import { formatPence, mandateStatusAccent, mandateStatusLabel } from "@/lib/finance";
import type { Family, FinanceDashboard } from "@/types";

const MANDATE_FILTERS = [
  { key: "", label: "All mandates" },
  { key: "active", label: "DD active" },
  { key: "pending", label: "DD pending" },
  { key: "none", label: "No Direct Debit" },
];

export default function FinanceClient() {
  const [kpis, setKpis] = useState<FinanceDashboard | null>(null);
  const [families, setFamilies] = useState<Family[]>([]);
  const [q, setQ] = useState("");
  const [mandateFilter, setMandateFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const token = getAccessToken();
    if (!token) { setError("Not authenticated."); setLoading(false); return; }
    try {
      const [dash, fams] = await Promise.all([
        api.adminGetFinanceDashboard(token),
        api.adminGetFamilies(token),
      ]);
      setKpis(dash);
      setFamilies(fams ?? []);
      setError(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load"); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  useAutoRefresh(load, 30_000);

  const filtered = useMemo(() => families.filter((f) => {
    if (q && !`${f.name} ${f.ref ?? ""} ${f.billing_parent_name ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (mandateFilter === "none" && f.mandate_status !== "") return false;
    if (mandateFilter && mandateFilter !== "none" && f.mandate_status !== mandateFilter) return false;
    return true;
  }).sort((a, b) => b.balance_pence - a.balance_pence), [families, q, mandateFilter]);

  const tiles = kpis ? [
    { label: "Outstanding", value: formatPence(kpis.outstanding_pence), tone: "text-slate-900" },
    { label: "Due this week", value: formatPence(kpis.due_this_week_pence), tone: "text-blue-700" },
    { label: "Overdue", value: `${formatPence(kpis.overdue_pence)} (${kpis.overdue_count})`, tone: "text-red-600" },
    { label: "Failed", value: `${formatPence(kpis.failed_pence)} (${kpis.failed_count})`, tone: "text-rose-600" },
    { label: "Expected this month", value: formatPence(kpis.expected_month_pence), tone: "text-slate-900" },
    { label: "Collected this month", value: formatPence(kpis.collected_month_pence), tone: "text-green-700" },
    { label: "Families", value: String(kpis.families_total), tone: "text-slate-900" },
    { label: "Without Direct Debit", value: String(kpis.families_without_dd), tone: kpis.families_without_dd > 0 ? "text-amber-600" : "text-slate-900" },
  ] : [];

  return (
    <>
      <div className="mb-6">
        <h1 className="flex items-center gap-2 font-heading text-2xl font-bold text-slate-900"><PoundSterling className="h-6 w-6 text-teal-600" /> Finance</h1>
        <p className="text-sm text-slate-500">Family billing accounts, charges and Direct Debit collection.</p>
      </div>

      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">{error}</p>}

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        {tiles.map((t) => (
          <div key={t.label} className="card px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t.label}</p>
            <p className={`mt-1 text-lg font-bold ${t.tone}`}>{t.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search family, ref or billing parent…"
          className="w-72 rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <select value={mandateFilter} onChange={(e) => setMandateFilter(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          {MANDATE_FILTERS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
        </select>
        <span className="ml-auto text-sm text-slate-400">{filtered.length} shown</span>
      </div>

      <div className="card overflow-x-auto">
        {loading ? <p className="p-4 text-sm text-slate-400">Loading…</p> : filtered.length === 0 ? (
          <p className="p-6 text-sm text-slate-400">
            No family accounts yet. Create one from a child profile (Family account → Set up) once a parent is linked.
          </p>
        ) : (
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3">Family</th>
                <th className="px-4 py-3">Ref</th>
                <th className="px-4 py-3">Billing parent</th>
                <th className="px-4 py-3">Children</th>
                <th className="px-4 py-3">Direct Debit</th>
                <th className="px-4 py-3 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f) => (
                <tr key={f.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                  <td className="px-4 py-2.5">
                    <Link href={`/admin/finance/${f.id}`} className="font-medium text-slate-800 hover:text-teal-600">{f.name}</Link>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{f.ref || "—"}</td>
                  <td className="px-4 py-2.5 text-slate-600">{f.billing_parent_name || "—"}</td>
                  <td className="px-4 py-2.5 text-slate-500">{f.child_ids?.length ?? 0}</td>
                  <td className="px-4 py-2.5">
                    <StageBadge label={mandateStatusLabel[f.mandate_status] ?? f.mandate_status} accent={mandateStatusAccent[f.mandate_status] ?? "slate"} withDot />
                  </td>
                  <td className={`px-4 py-2.5 text-right font-semibold ${f.balance_pence > 0 ? "text-slate-900" : "text-green-700"}`}>
                    {formatPence(f.balance_pence)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
