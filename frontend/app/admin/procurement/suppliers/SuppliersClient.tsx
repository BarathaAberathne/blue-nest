"use client";

import { useEffect, useMemo, useState } from "react";
import { PoundSterling, ShoppingBag, Truck } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import ProcurementTabs from "@/components/admin/procurement/ProcurementTabs";
import StatCard from "@/components/admin/ui/StatCard";
import type { OrderRequest, PurchaseCart } from "@/types";

const money = (pence: number) => `£${(pence / 100).toFixed(2)}`;
const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");
const isOpen = (s: string) => s === "draft" || s === "sent" || s === "ordered" || s === "partially_received";
const isPlaced = (s: string) => s === "sent" || s === "ordered" || s === "partially_received" || s === "received";

type Row = { supplier: string; orders: number; openPOs: number; spend: number; requestItems: number; lastOrder?: string };

export default function SuppliersClient() {
  const [carts, setCarts] = useState<PurchaseCart[]>([]);
  const [requests, setRequests] = useState<OrderRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) { setLoading(false); return; }
    Promise.allSettled([api.adminGetPurchaseCarts(token), api.adminGetOrderRequests(token)])
      .then(([c, r]) => {
        if (c.status === "fulfilled") setCarts((c.value as PurchaseCart[]) ?? []);
        if (r.status === "fulfilled") setRequests((r.value as OrderRequest[]) ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo<Row[]>(() => {
    const map = new Map<string, Row>();
    const get = (s: string) => { const k = s || "Other"; if (!map.has(k)) map.set(k, { supplier: k, orders: 0, openPOs: 0, spend: 0, requestItems: 0 }); return map.get(k)!; };
    carts.forEach((c) => {
      const row = get(c.supplier);
      row.orders++;
      if (isOpen(c.status)) row.openPOs++;
      if (isPlaced(c.status)) row.spend += c.subtotal ?? 0;
      if (!row.lastOrder || new Date(c.created_at) > new Date(row.lastOrder)) row.lastOrder = c.created_at;
    });
    requests.forEach((r) => r.items.forEach((it) => { get(it.supplier).requestItems += 1; }));
    return [...map.values()].sort((a, b) => b.spend - a.spend);
  }, [carts, requests]);

  const totals = useMemo(() => ({
    suppliers: rows.length,
    spend: rows.reduce((s, r) => s + r.spend, 0),
    openPOs: rows.reduce((s, r) => s + r.openPOs, 0),
  }), [rows]);

  return (
    <>
      <ProcurementTabs />
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-slate-900">Suppliers</h1>
        <p className="text-sm text-slate-500">Derived from your orders &amp; requests. <span className="text-slate-400">A full supplier directory (contacts, terms, lead-times) lands with the inventory module.</span></p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Suppliers" value={totals.suppliers} icon={Truck} accent="blue" />
        <StatCard label="Total spend" value={money(totals.spend)} sub="placed orders" icon={PoundSterling} accent="teal" />
        <StatCard label="Open purchase orders" value={totals.openPOs} icon={ShoppingBag} accent="amber" />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr>{["Supplier", "Orders", "Open POs", "Spend", "Requested items", "Last order"].map((h) => <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-6 text-slate-400">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">No suppliers yet.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.supplier} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{r.supplier}</td>
                <td className="px-4 py-3 text-slate-700">{r.orders}</td>
                <td className="px-4 py-3 text-slate-700">{r.openPOs}</td>
                <td className="px-4 py-3 font-semibold text-slate-800">{money(r.spend)}</td>
                <td className="px-4 py-3 text-slate-500">{r.requestItems}</td>
                <td className="px-4 py-3 text-slate-500">{fmtDate(r.lastOrder)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
