"use client";

import { useEffect, useState } from "react";
import BackLink from "@/components/admin/ui/BackLink";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import StageBadge from "@/components/admin/ui/StageBadge";
import { ORDER_REQUEST_STATUS_META, priorityMeta } from "@/lib/admin-status";
import { displayRef } from "@/lib/ref";
import type { OrderRequest, OrderRequestStatus } from "@/types";

// Workflow order for the status switcher. Cancelled doubles as "reject".
const STATUSES: OrderRequestStatus[] = [
  "pending", "approved", "converted_to_po", "ordered", "received", "cancelled",
];

function fmtBranch(branch: string) {
  if (!branch) return "—";
  return branch.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function AdminOrderRequestDetailClient({ id }: { id: string }) {
  const [req, setReq] = useState<OrderRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setError("Not authenticated — please sign in as admin.");
      setLoading(false);
      return;
    }
    api.adminGetOrderRequest(token, id)
      .then((data) => setReq(data as OrderRequest))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load request"))
      .finally(() => setLoading(false));
  }, [id]);

  const updateStatus = async (status: OrderRequestStatus) => {
    const token = getAccessToken();
    if (!token || !req) return;
    setSaving(true);
    setError(null);
    try {
      await api.adminUpdateOrderRequestStatus(token, req.id, status);
      setReq({ ...req, status });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>;
  if (error) return <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>;
  if (!req) return <p className="text-sm text-gray-400">Request not found.</p>;

  return (
    <>
      <BackLink fallback="/admin/order-requests" />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">
            <span className="font-mono">{displayRef(req.ref, req.id, "SR")}</span>
          </h1>
          <p className="text-sm text-gray-500">{fmtDate(req.created_at)}</p>
        </div>
        <div className="flex items-center gap-2">
          {req.priority && req.priority !== "normal" && (
            <StageBadge label={priorityMeta(req.priority).label} accent={priorityMeta(req.priority).accent} />
          )}
          <StageBadge
            label={ORDER_REQUEST_STATUS_META[req.status]?.label ?? req.status}
            accent={ORDER_REQUEST_STATUS_META[req.status]?.accent ?? "slate"}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">Requested by</p>
          <p className="text-sm font-medium text-gray-900">{req.requested_by_name || "—"}</p>
          <p className="text-xs text-gray-500">{req.requested_by_email}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">Branch</p>
          <p className="text-sm font-medium text-gray-900">{fmtBranch(req.branch_slug)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">Classroom</p>
          <p className="text-sm font-medium text-gray-900">{req.classroom || "—"}</p>
        </div>
      </div>

      {/* Status workflow */}
      <div className="card p-4 mb-6">
        <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Update status</p>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => updateStatus(s)}
              disabled={saving || req.status === s}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium border transition-colors ${
                req.status === s
                  ? "border-teal-600 bg-teal-600 text-white"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              } disabled:opacity-60`}
            >
              {s === "cancelled" ? "Reject / cancel" : ORDER_REQUEST_STATUS_META[s]?.label ?? s}
            </button>
          ))}
        </div>
      </div>

      {/* Items */}
      <div className="card overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
            <tr>
              {["Code", "Item", "Supplier", "Qty", "Notes"].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {req.items.map((it, i) => (
              <tr key={i}>
                <td className="px-4 py-3 font-mono text-xs text-gray-700">{it.code || "—"}</td>
                <td className="px-4 py-3 text-gray-900 font-medium">{it.item_name}</td>
                <td className="px-4 py-3 text-gray-700">{it.supplier}</td>
                <td className="px-4 py-3 text-gray-700">{it.qty}</td>
                <td className="px-4 py-3 text-gray-500">{it.notes || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {req.notes && (
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">Notes</p>
          <p className="text-sm text-gray-700 whitespace-pre-line">{req.notes}</p>
        </div>
      )}
    </>
  );
}
