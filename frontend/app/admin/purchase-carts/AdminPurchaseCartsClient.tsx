"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import Badge from "@/components/ui/Badge";
import type { PurchaseCart, PurchaseCartStatus } from "@/types";

const STATUS_VARIANT: Record<PurchaseCartStatus, "amber" | "green" | "gray" | "blue"> = {
  draft: "amber",
  sent: "blue",
  ordered: "blue",
  partially_received: "amber",
  received: "green",
  cancelled: "gray",
  failed: "gray",
};

const STATUS_LABEL: Record<PurchaseCartStatus, string> = {
  draft: "draft",
  sent: "ordered",
  ordered: "ordered",
  partially_received: "partially received",
  received: "received",
  cancelled: "cancelled",
  failed: "failed",
};

const money = (pence: number) => `£${(pence / 100).toFixed(2)}`;
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

const isPlaced = (s: PurchaseCartStatus) =>
  s === "sent" || s === "ordered" || s === "partially_received" || s === "received";

// "Overdue" = placed, not fully received, expected delivery date has passed.
function isOverdue(c: PurchaseCart) {
  if (c.status === "received" || !c.expected_delivery_date) return false;
  if (!isPlaced(c.status)) return false;
  return new Date(c.expected_delivery_date) < new Date(new Date().toDateString());
}

export default function AdminPurchaseCartsClient() {
  const [carts, setCarts] = useState<PurchaseCart[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setError("Not authenticated — please sign in as admin.");
      setLoading(false);
      return;
    }
    api.adminGetPurchaseCarts(token)
      .then((data) => setCarts(Array.isArray(data) ? (data as PurchaseCart[]) : []))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load carts"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!statusFilter) return carts;
    if (statusFilter === "ordered") return carts.filter((c) => c.status === "ordered" || c.status === "sent");
    return carts.filter((c) => c.status === statusFilter);
  }, [carts, statusFilter]);

  const receivedProgress = (c: PurchaseCart) => {
    const total = c.lines.length;
    const done = c.lines.filter((l) => (l.qty_received ?? 0) >= l.qty).length;
    return `${done}/${total}`;
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold text-gray-900">Purchase Orders</h1>
        <p className="text-sm text-gray-500">Per-supplier orders generated from staff supply requests — review, place, track delivery, then receive.</p>
      </div>

      {error && <p className="mb-4 text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="ordered">Ordered</option>
          <option value="partially_received">Partially received</option>
          <option value="received">Received</option>
          <option value="cancelled">Cancelled</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
            <tr>
              {["Date", "Supplier", "Lines", "Subtotal", "Status", "Expected", "Received", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-6 text-gray-500">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-sm">
                {carts.length === 0 ? "No purchase orders yet. Select supply requests and click “Generate cart”." : "No orders match this filter."}
              </td></tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{fmtDate(c.created_at)}</td>
                  <td className="px-4 py-3 text-gray-900 font-medium">{c.supplier}</td>
                  <td className="px-4 py-3 text-gray-700">{c.lines.length}</td>
                  <td className="px-4 py-3 text-gray-700">{money(c.subtotal)}</td>
                  <td className="px-4 py-3"><Badge label={STATUS_LABEL[c.status] ?? c.status} variant={STATUS_VARIANT[c.status] ?? "gray"} /></td>
                  <td className="px-4 py-3 text-xs">
                    {c.expected_delivery_date ? (
                      <span className={isOverdue(c) ? "font-medium text-amber-600" : "text-gray-500"}>
                        {fmtDate(c.expected_delivery_date)}{isOverdue(c) ? " · overdue" : ""}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {isPlaced(c.status) ? receivedProgress(c) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/purchase-carts/${c.id}`} className="text-teal-600 hover:underline text-xs font-medium">
                      {c.status === "draft" ? "Review & place" : c.status === "received" ? "View" : "Manage"}
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
