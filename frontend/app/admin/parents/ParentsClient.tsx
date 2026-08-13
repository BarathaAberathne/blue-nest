"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Users } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import StageBadge from "@/components/admin/ui/StageBadge";
import type { Parent } from "@/types";

const portalAccent: Record<string, "slate" | "teal" | "amber" | "red" | "indigo"> = {
  invited: "indigo", temporary: "amber", active: "teal", restricted: "amber", suspended: "red",
};

export default function ParentsClient() {
  const [parents, setParents] = useState<Parent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const load = async () => {
    const token = getAccessToken();
    if (!token) { setError("Not authenticated — please sign in as admin."); setLoading(false); return; }
    try {
      setParents((await api.adminGetParents(token)) ?? []);
      setError(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load parents"); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  useAutoRefresh(load, 30_000);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return parents;
    return parents.filter((p) => `${p.first_name} ${p.last_name} ${p.email ?? ""} ${p.ref ?? ""}`.toLowerCase().includes(needle));
  }, [parents, q]);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-heading text-2xl font-bold text-slate-900"><Users className="h-6 w-6 text-teal-600" /> Parents & Guardians</h1>
          <p className="text-sm text-slate-500">Every parent, carer and contact — one record per person, shared across siblings.</p>
        </div>
      </div>

      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">{error}</p>}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email or ref…" className="rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm" />
        </div>
        <span className="ml-auto text-sm text-slate-400">{rows.length} shown</span>
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <p className="p-4 text-sm text-slate-400">Loading…</p>
        ) : (
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3">Ref</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Mobile</th>
                <th className="px-4 py-3">Portal</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-400">
                    <Link href={`/admin/parents/${p.id}`}>{p.ref ?? "—"}</Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <Link href={`/admin/parents/${p.id}`} className="font-medium text-slate-800 hover:text-teal-600">{p.first_name} {p.last_name}</Link>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{p.email || "—"}</td>
                  <td className="px-4 py-2.5 text-slate-500">{p.mobile_phone || "—"}</td>
                  <td className="px-4 py-2.5">
                    {p.portal_state ? <StageBadge label={p.portal_state} accent={portalAccent[p.portal_state] ?? "slate"} withDot /> : <span className="text-xs text-slate-300">no access</span>}
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
