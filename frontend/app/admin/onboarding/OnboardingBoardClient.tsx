"use client";

// Manager onboarding board — every non-left child with derived completeness +
// onboarding status, so bottlenecks (induction stuck, finance missing) are
// visible at a glance.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import { branchShortName } from "@/lib/branch";
import StageBadge from "@/components/admin/ui/StageBadge";
import { onboardingStatusAccent, onboardingStatusLabel } from "@/lib/induction";
import type { Branch, OnboardingView } from "@/types";

const COMPLETENESS_BANDS = [
  { key: "", label: "All completeness" },
  { key: "100", label: "100% complete" },
  { key: "75", label: "75–99%" },
  { key: "50", label: "50–74%" },
  { key: "0", label: "Below 50%" },
];

export default function OnboardingBoardClient() {
  const [rows, setRows] = useState<OnboardingView[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchFilter, setBranchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [band, setBand] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const token = getAccessToken();
    if (!token) { setError("Not authenticated."); setLoading(false); return; }
    try {
      const [data, b] = await Promise.all([
        api.adminGetOnboardingBoard(token, branchFilter || undefined),
        api.adminGetBranches(token).catch(() => [] as Branch[]),
      ]);
      setRows(data ?? []);
      setBranches((b as Branch[]) ?? []);
      setError(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load"); }
    finally { setLoading(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [branchFilter]);
  useAutoRefresh(load, 30_000);

  const filtered = useMemo(() => rows.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (band === "100" && r.percent !== 100) return false;
    if (band === "75" && (r.percent < 75 || r.percent >= 100)) return false;
    if (band === "50" && (r.percent < 50 || r.percent >= 75)) return false;
    if (band === "0" && r.percent >= 50) return false;
    return true;
  }).sort((a, b) => a.percent - b.percent), [rows, statusFilter, band]);

  const branchName = useMemo(() => new Map(branches.map((b) => [b.slug, branchShortName(b)])), [branches]);

  return (
    <>
      <div className="mb-6">
        <h1 className="flex items-center gap-2 font-heading text-2xl font-bold text-slate-900"><ClipboardList className="h-6 w-6 text-teal-600" /> Onboarding</h1>
        <p className="text-sm text-slate-500">Every child&apos;s journey to fully active — completeness, induction and finance at a glance.</p>
      </div>

      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">{error}</p>}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="">All branches</option>
          {branches.map((b) => <option key={b.slug} value={b.slug}>{branchShortName(b)}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="">All statuses</option>
          {Object.entries(onboardingStatusLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={band} onChange={(e) => setBand(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          {COMPLETENESS_BANDS.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
        </select>
        <span className="ml-auto text-sm text-slate-400">{filtered.length} shown</span>
      </div>

      <div className="card overflow-x-auto">
        {loading ? <p className="p-4 text-sm text-slate-400">Loading…</p> : (
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3">Child</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Completeness</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Top gaps</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.child_id} className="border-b border-slate-50 hover:bg-slate-50/60">
                  <td className="px-4 py-2.5">
                    <Link href={`/admin/children/${r.child_id}`} className="font-medium text-slate-800 hover:text-teal-600">{r.child_name || "Child"}</Link>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{branchName.get(r.branch_slug ?? "") ?? r.branch_slug}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full rounded-full ${r.percent >= 75 ? "bg-teal-500" : r.percent >= 50 ? "bg-amber-400" : "bg-red-400"}`} style={{ width: `${r.percent}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-slate-600">{r.percent}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <StageBadge label={onboardingStatusLabel[r.status] ?? r.status} accent={onboardingStatusAccent[r.status] ?? "slate"} withDot />
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">
                    {r.categories.flatMap((c) => c.missing ?? []).slice(0, 2).join(" · ") || "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {r.induction_status === "submitted" && (
                      <Link href={`/admin/children/${r.child_id}`} className="whitespace-nowrap rounded-lg bg-teal-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-700">
                        Review induction →
                      </Link>
                    )}
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
