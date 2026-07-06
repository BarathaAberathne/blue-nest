"use client";

import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, Clock, PoundSterling, Truck, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import ProcurementTabs from "@/components/admin/procurement/ProcurementTabs";
import StatCard from "@/components/admin/ui/StatCard";
import SectionHeading from "@/components/admin/ui/SectionHeading";
import ProgressBar from "@/components/admin/ui/ProgressBar";
import { CHART_COLORS } from "@/lib/admin-theme";
import type { Product, ProcurementAnalytics, PurchaseCart } from "@/types";

const money = (pence: number) => `£${(pence / 100).toFixed(2)}`;
const fmtBranch = (b: string) => (b ? b.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—");
const monthLabel = (ym: string) => { const [y, m] = ym.split("-"); const d = new Date(Number(y), Number(m) - 1, 1); return d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }); };
const tooltipStyle = { borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12, boxShadow: "0 8px 24px rgba(90,74,66,0.10)" };

export default function ProcurementAnalyticsClient() {
  const [server, setServer] = useState<ProcurementAnalytics | null>(null);
  const [carts, setCarts] = useState<PurchaseCart[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const token = getAccessToken();
    if (!token) { setLoading(false); return; }
    Promise.allSettled([
      api.adminGetProcurementAnalytics(token),
      api.adminGetPurchaseCarts(token),
      api.adminGetProducts(token),
    ])
      .then(([s, c, p]) => {
        if (s.status === "fulfilled") setServer((s.value as ProcurementAnalytics) ?? null);
        if (c.status === "fulfilled") setCarts((c.value as PurchaseCart[]) ?? []);
        if (p.status === "fulfilled") setProducts((p.value as Product[]) ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  // Headline figures come from the server roll-up; supplier performance + low
  // stock stay client-side (they need per-line / product data the endpoint omits).
  const a = useMemo(() => {
    const monthly = (server?.monthly_spend ?? []).map((m) => ({ label: monthLabel(m.month), value: Math.round(m.spend / 100) }));
    const branch = (server?.spend_by_branch ?? []).map((b) => ({ label: fmtBranch(b.branch), value: Math.round(b.spend / 100) }));
    const items = (server?.top_items ?? []).slice(0, 8).map((it) => ({ label: it.name.length > 22 ? it.name.slice(0, 21) + "…" : it.name, value: it.qty }));

    // Supplier performance — completion rate (received / orders), from carts.
    const perf = new Map<string, { orders: number; received: number }>();
    carts.forEach((c) => { const p = perf.get(c.supplier) ?? { orders: 0, received: 0 }; p.orders++; if (c.status === "received" || c.status === "completed") p.received++; perf.set(c.supplier, p); });
    const suppliers = [...perf.entries()].map(([name, p]) => ({ name, ...p, rate: p.orders ? Math.round((p.received / p.orders) * 100) : 0 })).sort((x, y) => y.orders - x.orders);

    const rsc = server?.request_status_counts ?? {};
    const osc = server?.order_status_counts ?? {};
    return {
      monthly, branch, items, suppliers,
      totalSpend: server?.total_spend ?? 0,
      avgReqToOrder: server && server.avg_request_to_order_days > 0 ? server.avg_request_to_order_days : null,
      avgOrderToDelivery: server && server.avg_order_to_delivery_days > 0 ? server.avg_order_to_delivery_days : null,
      pending: server?.pending_requests ?? rsc["pending"] ?? 0,
      cancelled: rsc["cancelled"] ?? 0,
      partial: osc["partially_received"] ?? 0,
      lowStock: products.filter((p) => p.stock_qty < (p.reorder_point ?? 100)).length,
    };
  }, [server, carts, products]);

  return (
    <>
      <ProcurementTabs />
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-slate-900">Procurement Analytics</h1>
        <p className="text-sm text-slate-500">Spend, cycle times and supplier performance across your purchasing pipeline.</p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total spend" value={money(a.totalSpend)} sub="placed orders" icon={PoundSterling} accent="teal" />
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
