"use client";

import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, Clock, Truck, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import ProcurementTabs from "@/components/admin/procurement/ProcurementTabs";
import StatCard from "@/components/admin/ui/StatCard";
import SectionHeading from "@/components/admin/ui/SectionHeading";
import ProgressBar from "@/components/admin/ui/ProgressBar";
import { CHART_COLORS } from "@/lib/admin-theme";
import type { OrderRequest, Product, PurchaseCart } from "@/types";

const money = (pence: number) => `£${(pence / 100).toFixed(2)}`;
const fmtBranch = (b: string) => (b ? b.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—");
const isPlaced = (s: string) => s === "sent" || s === "ordered" || s === "partially_received" || s === "received";
const days = (a: string, b: string) => (new Date(a).getTime() - new Date(b).getTime()) / 86_400_000;
const tooltipStyle = { borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12, boxShadow: "0 8px 24px rgba(90,74,66,0.10)" };

export default function ProcurementAnalyticsClient() {
  const [carts, setCarts] = useState<PurchaseCart[]>([]);
  const [requests, setRequests] = useState<OrderRequest[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const token = getAccessToken();
    if (!token) { setLoading(false); return; }
    Promise.allSettled([api.adminGetPurchaseCarts(token), api.adminGetOrderRequests(token), api.adminGetProducts(token)])
      .then(([c, r, p]) => {
        if (c.status === "fulfilled") setCarts((c.value as PurchaseCart[]) ?? []);
        if (r.status === "fulfilled") setRequests((r.value as OrderRequest[]) ?? []);
        if (p.status === "fulfilled") setProducts((p.value as Product[]) ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  const a = useMemo(() => {
    const placed = carts.filter((c) => isPlaced(c.status));
    const reqById = new Map(requests.map((r) => [r.id, r]));

    // Monthly spend — last 6 months.
    const byMonth = new Map<string, number>();
    placed.forEach((c) => { const k = new Date(c.created_at).toLocaleDateString("en-GB", { month: "short", year: "2-digit" }); byMonth.set(k, (byMonth.get(k) ?? 0) + c.subtotal / 100); });
    const monthly: { label: string; value: number }[] = [];
    for (let i = 5; i >= 0; i--) { const d = new Date(); d.setMonth(d.getMonth() - i); const k = d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }); monthly.push({ label: k, value: Math.round(byMonth.get(k) ?? 0) }); }

    // Spend by branch (estimated via source requests).
    const byBranch = new Map<string, number>();
    placed.forEach((c) => { const first = (c.source_request_ids ?? []).map((id) => reqById.get(id)).find(Boolean); byBranch.set(first?.branch_slug || "Unattributed", (byBranch.get(first?.branch_slug || "Unattributed") ?? 0) + c.subtotal / 100); });
    const branch = [...byBranch.entries()].sort((x, y) => y[1] - x[1]).map(([k, v]) => ({ label: fmtBranch(k), value: Math.round(v) }));

    // Most requested items.
    const byItem = new Map<string, number>();
    requests.forEach((r) => r.items.forEach((it) => byItem.set(it.item_name, (byItem.get(it.item_name) ?? 0) + it.qty)));
    const items = [...byItem.entries()].sort((x, y) => y[1] - x[1]).slice(0, 8).map(([k, v]) => ({ label: k.length > 22 ? k.slice(0, 21) + "…" : k, value: v }));

    // Cycle times.
    const reqToOrder = placed.map((c) => { const first = (c.source_request_ids ?? []).map((id) => reqById.get(id)).find(Boolean); return first ? days(c.created_at, first.created_at) : null; }).filter((d): d is number => d !== null && d >= 0);
    const orderToDelivery = carts.filter((c) => c.delivered_at).map((c) => days(c.delivered_at as string, c.sent_at || c.created_at)).filter((d) => d >= 0);
    const avg = (arr: number[]) => (arr.length ? Math.round((arr.reduce((s, x) => s + x, 0) / arr.length) * 10) / 10 : null);

    // Supplier performance — completion rate (received / orders).
    const perf = new Map<string, { orders: number; received: number }>();
    carts.forEach((c) => { const p = perf.get(c.supplier) ?? { orders: 0, received: 0 }; p.orders++; if (c.status === "received") p.received++; perf.set(c.supplier, p); });
    const suppliers = [...perf.entries()].map(([name, p]) => ({ name, ...p, rate: p.orders ? Math.round((p.received / p.orders) * 100) : 0 })).sort((x, y) => y.orders - x.orders);

    return {
      monthly, branch, items, suppliers,
      avgReqToOrder: avg(reqToOrder), avgOrderToDelivery: avg(orderToDelivery),
      pending: requests.filter((r) => r.status === "pending").length,
      cancelled: requests.filter((r) => r.status === "cancelled").length,
      partial: carts.filter((c) => c.status === "partially_received").length,
      lowStock: products.filter((p) => p.stock_qty < (p.reorder_point ?? 100)).length,
    };
  }, [carts, requests, products]);

  return (
    <>
      <ProcurementTabs />
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-slate-900">Procurement Analytics</h1>
        <p className="text-sm text-slate-500">Spend, cycle times and supplier performance across your purchasing pipeline.</p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Avg request → order" value={a.avgReqToOrder !== null ? `${a.avgReqToOrder}d` : "—"} icon={Clock} accent="blue" />
        <StatCard label="Avg order → delivery" value={a.avgOrderToDelivery !== null ? `${a.avgOrderToDelivery}d` : "—"} icon={Truck} accent="indigo" />
        <StatCard label="Pending requests" value={a.pending} icon={Clock} accent="amber" />
        <StatCard label="Partially received" value={a.partial} icon={Truck} accent="orange" />
        <StatCard label="Cancelled requests" value={a.cancelled} icon={XCircle} accent="slate" />
        <StatCard label="Low stock" value={a.lowStock} icon={AlertTriangle} accent="red" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <SectionHeading>Monthly spend (£)</SectionHeading>
          <div className="h-64">{mounted && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={a.monthly} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <defs><linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0d9488" stopOpacity={0.3} /><stop offset="100%" stopColor="#0d9488" stopOpacity={0} /></linearGradient></defs>
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={40} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`£${v}`, "Spend"]} />
                <Area type="monotone" dataKey="value" stroke="#0d9488" strokeWidth={2.5} fill="url(#spendFill)" />
              </AreaChart>
            </ResponsiveContainer>
          )}</div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <SectionHeading>Spend by branch (£) <span className="font-normal lowercase tracking-normal text-slate-300">· estimated</span></SectionHeading>
          <div className="h-64">{mounted && a.branch.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={a.branch} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={40} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`£${v}`, "Spend"]} cursor={{ fill: "rgba(13,148,136,0.06)" }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>{a.branch.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : mounted ? <p className="flex h-full items-center justify-center text-sm text-slate-400">No spend data yet.</p> : null}</div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <SectionHeading>Most requested items</SectionHeading>
          <div className="h-64">{mounted && a.items.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={a.items} margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={130} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(13,148,136,0.06)" }} />
                <Bar dataKey="value" name="Qty" radius={[0, 6, 6, 0]}>{a.items.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : mounted ? <p className="flex h-full items-center justify-center text-sm text-slate-400">No requests yet.</p> : null}</div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <SectionHeading>Supplier performance</SectionHeading>
          {a.suppliers.length === 0 ? <p className="py-4 text-sm text-slate-400">No orders yet.</p> : (
            <div className="space-y-3">
              {a.suppliers.map((s) => (
                <div key={s.name}>
                  <div className="mb-1 flex justify-between text-sm"><span className="font-medium text-slate-700">{s.name}</span><span className="text-slate-500">{s.received}/{s.orders} received · {s.rate}%</span></div>
                  <ProgressBar value={s.rate} accent="green" height="h-2" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
