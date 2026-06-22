"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import Badge from "@/components/ui/Badge";
import type { AuditLog } from "@/types";

const ACTION_VARIANT: Record<string, "green" | "amber" | "blue" | "gray"> = {
  create: "green",
  update: "blue",
  update_status: "blue",
  reset_password: "amber",
  import: "blue",
  delete: "gray",
};

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function titleize(s: string) {
  return s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AdminActivityClient() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [actor, setActor] = useState("");
  const [entity, setEntity] = useState("");
  const [action, setAction] = useState("");

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setError("Not authenticated — please sign in as admin.");
      setLoading(false);
      return;
    }
    api.adminGetAuditLogs(token)
      .then((data) => setLogs(Array.isArray(data) ? (data as AuditLog[]) : []))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load activity"))
      .finally(() => setLoading(false));
  }, []);

  const actorOptions = useMemo(
    () => [...new Set(logs.map((l) => l.actor_email).filter(Boolean))].sort(),
    [logs],
  );
  const entityOptions = useMemo(
    () => [...new Set(logs.map((l) => l.entity_type).filter(Boolean))].sort(),
    [logs],
  );
  const actionOptions = useMemo(
    () => [...new Set(logs.map((l) => l.action).filter(Boolean))].sort(),
    [logs],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs
      .filter((l) => (actor ? l.actor_email === actor : true))
      .filter((l) => (entity ? l.entity_type === entity : true))
      .filter((l) => (action ? l.action === action : true))
      .filter((l) =>
        q ? [l.summary, l.actor_email, l.entity_type].some((f) => (f ?? "").toLowerCase().includes(q)) : true,
      );
  }, [logs, search, actor, entity, action]);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">Activity Log</h1>
          {!loading && !error && (
            <p className="text-sm text-gray-500">{logs.length} recent actions</p>
          )}
        </div>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search summary, actor…"
          className="min-w-[14rem] flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          aria-label="Search activity"
        />
        <select value={actor} onChange={(e) => setActor(e.target.value)} aria-label="Filter by actor"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
          <option value="">All admins</option>
          {actorOptions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={entity} onChange={(e) => setEntity(e.target.value)} aria-label="Filter by entity"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
          <option value="">All types</option>
          {entityOptions.map((t) => <option key={t} value={t}>{titleize(t)}</option>)}
        </select>
        <select value={action} onChange={(e) => setAction(e.target.value)} aria-label="Filter by action"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
          <option value="">All actions</option>
          {actionOptions.map((a) => <option key={a} value={a}>{titleize(a)}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
            <tr>
              {["When", "Who", "Action", "Type", "Summary"].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3.5 w-24 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">
                  {logs.length === 0 ? "No activity recorded yet." : "No activity matches your filters."}
                </td>
              </tr>
            ) : (
              filtered.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDateTime(l.created_at)}</td>
                  <td className="px-4 py-3 text-gray-900">
                    {l.actor_email || "—"}
                    <span className="block text-xs font-normal text-gray-400">{titleize(l.actor_role || "")}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge label={titleize(l.action)} variant={ACTION_VARIANT[l.action] ?? "gray"} />
                  </td>
                  <td className="px-4 py-3 text-gray-700">{titleize(l.entity_type)}</td>
                  <td className="px-4 py-3 text-gray-700">{l.summary}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
