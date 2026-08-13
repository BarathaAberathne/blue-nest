"use client";

// Branch SEND / Additional Support view (permission send.manage) — KPI tiles +
// the per-child operational table. Everything is DERIVED live from canonical
// child records + room provision + the normal room assignments; there is no
// second SEND child list. Specialist + mainstream + unallocated always
// reconciles to the SEND total.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { HeartHandshake } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import { branchShortName } from "@/lib/branch";
import StageBadge from "@/components/admin/ui/StageBadge";
import { provisionAccent, provisionLabel, sendPlanLabel, sendStatusAccent, sendStatusLabel } from "@/lib/send";
import type { Branch, SendOverview } from "@/types";

export default function SendOverviewClient() {
  const [ov, setOv] = useState<SendOverview | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branch, setBranch] = useState("");
  const [provisionFilter, setProvisionFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token) { setError("Not authenticated."); setLoading(false); return; }
    try {
      const [data, b] = await Promise.all([
        api.adminGetSendOverview(token, branch || undefined),
        api.adminGetBranches(token).catch(() => [] as Branch[]),
      ]);
      setOv(data);
      setBranches(b ?? []);
      setError(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load"); }
    finally { setLoading(false); }
  }, [branch]);

  useEffect(() => { void load(); }, [load]);
  useAutoRefresh(load, 30_000);

  const rows = (ov?.rows ?? []).filter((r) => !provisionFilter || r.provision === provisionFilter);
  const branchName = new Map(branches.map((b) => [b.slug, branchShortName(b)]));

  const tiles = ov ? [
    { label: "SEND children", value: ov.total_send, tone: "text-slate-900" },
    { label: "Dedicated SEND rooms", value: ov.dedicated_rooms, tone: "text-slate-900" },
    { label: "In specialist rooms", value: ov.in_specialist, tone: "text-violet-700" },
    { label: "In mainstream rooms", value: ov.in_mainstream, tone: "text-teal-700" },
    { label: "Without room allocation", value: ov.unallocated, tone: ov.unallocated > 0 ? "text-amber-600" : "text-slate-900" },
    { label: "Active support plans", value: ov.active_plans, tone: "text-green-700" },
  ] : [];

  return (
    <>
      <div className="mb-6">
        <h1 className="flex items-center gap-2 font-heading text-2xl font-bold text-slate-900"><HeartHandshake className="h-6 w-6 text-violet-600" /> SEND / Additional Support</h1>
        <p className="text-sm text-slate-500">Children requiring additional support and their room provision — one view over the canonical child records.</p>
      </div>

      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">{error}</p>}

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {tiles.map((t) => (
          <div key={t.label} className="card px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t.label}</p>
            <p className={`mt-1 text-2xl font-bold ${t.tone}`}>{t.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select value={branch} onChange={(e) => setBranch(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="">All branches</option>
          {branches.map((b) => <option key={b.slug} value={b.slug}>{branchShortName(b)}</option>)}
        </select>
        <select value={provisionFilter} onChange={(e) => setProvisionFilter(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="">All provision</option>
          <option value="send_dedicated">Specialist rooms</option>
          <option value="mainstream">Mainstream rooms</option>
          <option value="unallocated">Without allocation</option>
        </select>
        <span className="ml-auto text-sm text-slate-400">{rows.length} shown</span>
      </div>

      <div className="card overflow-x-auto">
        {loading ? <p className="p-4 text-sm text-slate-400">Loading…</p> : rows.length === 0 ? (
          <p className="p-6 text-sm text-slate-400">No children currently recorded as requiring SEND/additional support{provisionFilter ? " for this filter" : ""}.</p>
        ) : (
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3">Child</th>
                <th className="px-4 py-3">Age</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Room</th>
                <th className="px-4 py-3">Provision</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Support plan</th>
                <th className="px-4 py-3">SEND lead</th>
                <th className="px-4 py-3">Key person</th>
                <th className="px-4 py-3">Next review</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.child_id} className="border-b border-slate-50 hover:bg-slate-50/60">
                  <td className="px-4 py-2.5">
                    <Link href={`/admin/children/${r.child_id}`} className="font-medium text-slate-800 hover:text-teal-600">{r.child_name}</Link>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{r.age_label || "—"}</td>
                  <td className="px-4 py-2.5 text-slate-500">{branchName.get(r.branch_slug) ?? r.branch_slug}</td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {r.room_id ? <Link href={`/admin/rooms/${r.room_id}`} className="hover:text-teal-600">{r.room_name || "Room"}</Link> : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-2.5"><StageBadge label={provisionLabel[r.provision]} accent={provisionAccent[r.provision]} withDot={false} /></td>
                  <td className="px-4 py-2.5"><StageBadge label={sendStatusLabel[r.status]} accent={sendStatusAccent[r.status]} withDot /></td>
                  <td className="px-4 py-2.5 text-slate-500">{r.plan_status ? sendPlanLabel[r.plan_status as keyof typeof sendPlanLabel] ?? r.plan_status : "—"}</td>
                  <td className="px-4 py-2.5 text-slate-500">{r.send_lead || "—"}</td>
                  <td className="px-4 py-2.5 text-slate-500">{r.key_person || "—"}</td>
                  <td className="px-4 py-2.5 text-slate-500">{r.review_date || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
