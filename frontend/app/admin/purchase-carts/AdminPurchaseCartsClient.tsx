"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import Badge from "@/components/ui/Badge";
import type { PurchaseCart, PurchaseCartStatus } from "@/types";

const STATUS_VARIANT: Record<PurchaseCartStatus, "amber" | "green" | "gray"> = {
  draft: "amber",
  sent: "green",
  failed: "gray",
};

const money = (pence: number) => `£${(pence / 100).toFixed(2)}`;
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default function AdminPurchaseCartsClient() {
  const [carts, setCarts] = useState<PurchaseCart[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold text-gray-900">Generated Carts</h1>
        <p className="text-sm text-gray-500">Per-supplier orders generated from supply requests.</p>
      </div>

      {error && <p className="mb-4 text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
            <tr>
              {["Date", "Supplier", "Lines", "Subtotal", "Status", "Recipient", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-6 text-gray-500">Loading…</td></tr>
            ) : carts.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">No carts generated yet. Select supply requests and click &ldquo;Generate cart&rdquo;.</td></tr>
            ) : (
              carts.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{fmtDate(c.created_at)}</td>
                  <td className="px-4 py-3 text-gray-900 font-medium">{c.supplier}</td>
                  <td className="px-4 py-3 text-gray-700">{c.lines.length}</td>
                  <td className="px-4 py-3 text-gray-700">{money(c.subtotal)}</td>
                  <td className="px-4 py-3"><Badge label={c.status} variant={STATUS_VARIANT[c.status] ?? "gray"} /></td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{c.recipient_email || "—"}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/purchase-carts/${c.id}`} className="text-teal-600 hover:underline text-xs font-medium">
                      {c.status === "draft" ? "Review & send" : "View"}
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
