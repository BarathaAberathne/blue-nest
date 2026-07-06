"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ClipboardList, FileText, PackageCheck, PoundSterling, ShoppingBag, Truck } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import ProcurementTabs from "@/components/admin/procurement/ProcurementTabs";
import StatCard from "@/components/admin/ui/StatCard";
import SectionHeading from "@/components/admin/ui/SectionHeading";
import StageBadge from "@/components/admin/ui/StageBadge";
import ProgressBar from "@/components/admin/ui/ProgressBar";
import { ACCENT } from "@/lib/admin-theme";
import { PURCHASE_CART_STATUS_META } from "@/lib/admin-status";
import type { OrderRequest, Product, PurchaseCart } from "@/types";

const money = (pence: number) => `£${(pence / 100).toFixed(2)}`;
const fmtBranch = (b: string) => (b ? b.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—");
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const isPlaced = (s: string) => s === "sent" || s === "ordered" || s === "partially_received" || s === "received";

export default function ProcurementOverviewClient() {
  const [carts, setCarts] = useState<PurchaseCart[]>([]);
  const [requests, setRequests] = useState<OrderRequest[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

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

  const m = useMemo(() => {
    const placed = carts.filter((c) => isPlaced(c.status));
    const spend = placed.reduce((s, c) => s + (c.subtotal ?? 0), 0);
    const reqById = new Map(requests.map((r) => [r.id, r]));
    const bySupplier = new Map<string, number>();
    const byBranch = new Map<string, number>();
    placed.forEach((c) => {
      bySupplier.set(c.supplier, (bySupplier.get(c.supplier) ?? 0) + c.subtotal);
      const firstReq = (c.source_request_ids ?? []).map((id) => reqById.get(id)).find(Boolean);
      const branch = firstReq?.branch_slug || "Unattributed";
      byBranch.set(branch, (byBranch.get(branch) ?? 0) + c.subtotal);
    });
    const top = (mp: Map<string, number>) => [...mp.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    return {
      pendingRequests: requests.filter((r) => r.status === "pending").length,
      drafts: carts.filter((c) => c.status === "draft").length,
      placed: placed.length,
      awaiting: carts.filter((c) => c.status === "ordered" || c.status === "sent").length,
      partial: carts.filter((c) => c.status === "partially_received").length,
      completed: carts.filter((c) => c.status === "received").length,
      spend,
      lowStock: products.filter((p) => p.stock_qty < (p.reorder_point ?? 100)),
      supplierSpend: top(bySupplier),
      branchSpend: top(byBranch),
      maxSupplier: Math.max(1, ...[...bySupplier.values()]),
      maxBranch: Math.max(1, ...[...byBranch.values()]),
      recentPOs: [...carts].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 6),
    };
  }, [carts, requests, products]);

  if (loading) {
    return <><ProcurementTabs /><div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />)}</div></>;
  }

  return (
    <>
      <ProcurementTabs />
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-slate-900">Procurement Overview</h1>
        <p className="text-sm text-slate-500">The whole purchasing pipeline at a glance — requests, orders, deliveries and spend.</p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Pending requests" value={m.pendingRequests} icon={ClipboardList} accent="amber" href="/admin/order-requests" />
        <StatCard label="Draft orders" value={m.drafts} icon={FileText} accent="slate" href="/admin/purchase-carts" />
        <StatCard label="Awaiting delivery" value={m.awaiting} icon={Truck} accent="blue" href="/admin/purchase-carts" />
        <StatCard label="Partially received" value={m.partial} icon={ShoppingBag} accent="orange" href="/admin/purchase-carts" />
        <StatCard label="Completed orders" value={m.completed} icon={CheckCircle2} accent="green" href="/admin/purchase-carts" />
        <StatCard label="Orders placed" value={m.placed} icon={PackageCheck} accent="indigo" href="/admin/purchase-carts" />
        <StatCard label="Supplier spend" value={money(m.spend)} sub="placed orders" icon={PoundSterling} accent="teal" />
        <StatCard label="Low stock" value={m.lowStock.length} icon={AlertTriangle} accent="red" href="/admin/products" />
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <SectionHeading>Spend by supplier</SectionHeading>
          {m.supplierSpend.length === 0 ? <p className="py-4 text-sm text-slate-400">No placed orders yet.</p> : (
            <div className="space-y-3">
              {m.supplierSpend.map(([name, val]) => (
                <div key={name}>
                  <div className="mb-1 flex justify-between text-sm"><span className="font-medium text-slate-700">{name}</span><span className="text-slate-500">{money(val)}</span></div>
                  <ProgressBar value={(val / m.maxSupplier) * 100} accent="teal" height="h-2" />
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <SectionHeading>Spend by branch <span className="font-normal lowercase tracking-normal text-slate-300">· estimated</span></SectionHeading>
          {m.branchSpend.length === 0 ? <p className="py-4 text-sm text-slate-400">No placed orders yet.</p> : (
            <div className="space-y-3">
              {m.branchSpend.map(([name, val]) => (
                <div key={name}>
                  <div className="mb-1 flex justify-between text-sm"><span className="font-medium text-slate-700">{fmtBranch(name)}</span><span className="text-slate-500">{money(val)}</span></div>
                  <ProgressBar value={(val / m.maxBranch) * 100} accent="violet" height="h-2" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <SectionHeading action={<Link href="/admin/purchase-carts" className="text-xs font-medium text-teal-600 hover:underline">View all</Link>}>Recent purchase orders</SectionHeading>
          {m.recentPOs.length === 0 ? <p className="py-4 text-sm text-slate-400">No purchase orders yet.</p> : (
            <ul className="divide-y divide-slate-50">
              {m.recentPOs.map((c) => (
                <li key={c.id}>
                  <Link href={`/admin/purchase-carts/${c.id}`} className="flex items-center justify-between gap-2 py-2.5 hover:bg-slate-50">
                    <div className="min-w-0"><p className="truncate text-sm font-medium text-slate-800">{c.supplier}</p><p className="text-xs text-slate-400">{c.lines.length} line{c.lines.length !== 1 ? "s" : ""} · {fmtDate(c.created_at)}</p></div>
                    <div className="flex shrink-0 items-center gap-2"><span className="text-sm font-semibold text-slate-700">{money(c.subtotal)}</span><StageBadge label={PURCHASE_CART_STATUS_META[c.status]?.label ?? c.status} accent={PURCHASE_CART_STATUS_META[c.status]?.accent ?? "slate"} /></div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <SectionHeading action={<Link href="/admin/products" className="text-xs font-medium text-teal-600 hover:underline">Manage</Link>}>Low stock alerts</SectionHeading>
          {m.lowStock.length === 0 ? <p className="py-4 text-sm text-slate-400">Everything well stocked 🎉</p> : (
            <ul className="divide-y divide-slate-50">
              {m.lowStock.slice(0, 6).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 py-2.5">
                  <div className="flex items-center gap-2"><span style={{ background: ACCENT.red.solid }} className="h-2 w-2 shrink-0 rounded-full" /><span className="text-sm font-medium text-slate-700">{p.name}</span></div>
                  <span className="text-xs font-medium text-red-600">{p.stock_qty} left · reorder at {p.reorder_point ?? 100}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
