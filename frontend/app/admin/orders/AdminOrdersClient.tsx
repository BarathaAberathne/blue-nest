"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Columns3, Table2 } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import KanbanBoard from "@/components/admin/ui/KanbanBoard";
import KanbanCard from "@/components/admin/ui/KanbanCard";
import StageBadge from "@/components/admin/ui/StageBadge";
import ViewToggle from "@/components/admin/ui/ViewToggle";
import { ORDER_LANES, ORDER_NEXT, ORDER_STATUS_META } from "@/lib/admin-status";
import { displayRef } from "@/lib/ref";
import type { Order, OrderStatus, PaymentStatus } from "@/types";

function fmt(pence: number) { return `£${(pence / 100).toFixed(2)}`; }
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); }

const PAYMENT_META: Record<PaymentStatus, { label: string; cls: string }> = {
  paid: { label: "Paid", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  unpaid: { label: "Unpaid", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  failed: { label: "Failed", cls: "bg-red-50 text-red-600 border-red-200" },
  refunded: { label: "Refunded", cls: "bg-slate-100 text-slate-600 border-slate-200" },
};

function paymentOf(o: Order): PaymentStatus {
  return o.payment_status ?? (o.status === "paid" || o.paid_at ? "paid" : "unpaid");
}
function customerName(o: Order) { return o.customer_name?.trim() || o.customer_email?.trim() || "Not recorded"; }
function branchLabel(o: Order) {
  if (!o.branch_slug || o.branch_slug === "n/a") return "—";
  return o.branch_name?.trim() || o.branch_slug;
}

function PaymentBadge({ status }: { status: PaymentStatus }) {
  const m = PAYMENT_META[status] ?? PAYMENT_META.unpaid;
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${m.cls}`}>{m.label}</span>;
}

export default function AdminOrdersClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [view, setView] = useState<"board" | "table">("board");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Server-side pages of PAGE_SIZE, newest first — the endpoint no longer
  // returns the whole collection. "Load older orders" appends the next page.
  const PAGE_SIZE = 200;
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token) { setError("Not authenticated — please sign in as admin."); setLoading(false); return; }
    try {
      const data = await api.adminGetOrders(token, { limit: PAGE_SIZE });
      const page = Array.isArray(data) ? (data as Order[]) : [];
      setOrders(page);
      setHasMore(page.length === PAGE_SIZE);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    setLoadingMore(true);
    try {
      const data = await api.adminGetOrders(token, { limit: PAGE_SIZE, skip: orders.length });
      const page = Array.isArray(data) ? (data as Order[]) : [];
      setOrders((prev) => [...prev, ...page]);
      setHasMore(page.length === PAGE_SIZE);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load more orders");
    } finally {
      setLoadingMore(false);
    }
  }, [orders.length]);

  useEffect(() => { void load(); }, [load]);

  const changeStatus = async (o: Order, status: OrderStatus) => {
    if (status === o.status) return;
    if (status === "cancelled" && !window.confirm(`Cancel order ${displayRef(o.ref, o.id, "ORD")}?`)) return;
    const token = getAccessToken();
    if (!token) return;
    try {
      await api.adminUpdateOrderStatus(token, o.id, status);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update order");
    }
  };

  const branchOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of orders) if (o.branch_slug && o.branch_slug !== "n/a") m.set(o.branch_slug, branchLabel(o));
    return [...m.entries()];
  }, [orders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromT = from ? new Date(from).getTime() : -Infinity;
    const toT = to ? new Date(to).getTime() + 86_400_000 : Infinity; // inclusive end-of-day
    return [...orders]
      .filter((o) => {
        if (q) {
          const hay = [displayRef(o.ref, o.id, "ORD"), o.customer_name, o.customer_email, o.customer_phone].join(" ").toLowerCase();
          if (!hay.includes(q)) return false;
        }
        if (paymentFilter && paymentOf(o) !== paymentFilter) return false;
        if (branchFilter && o.branch_slug !== branchFilter) return false;
        const t = new Date(o.created_at).getTime();
        if (t < fromT || t > toT) return false;
        return true;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [orders, search, paymentFilter, branchFilter, from, to]);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">Orders</h1>
          {!loading && !error && <p className="text-sm text-slate-500">{filtered.length} of {orders.length}</p>}
        </div>
        <ViewToggle active={view} onChange={setView} options={[{ key: "board", label: "Board", icon: Columns3 }, { key: "table", label: "Table", icon: Table2 }]} />
      </div>

      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">{error}</p>}

      {view === "table" && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search ref, name, email, phone…"
            className="min-w-[220px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} aria-label="Payment status"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white">
            <option value="">All payments</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
          <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} aria-label="Branch"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white">
            <option value="">All nurseries</option>
            {branchOptions.map(([slug, name]) => <option key={slug} value={slug}>{name}</option>)}
          </select>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          {(search || paymentFilter || branchFilter || from || to) && (
            <button type="button" onClick={() => { setSearch(""); setPaymentFilter(""); setBranchFilter(""); setFrom(""); setTo(""); }}
              className="text-xs font-medium text-slate-500 hover:text-slate-700">Clear</button>
          )}
        </div>
      )}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-3"><div className="h-40 animate-pulse rounded-xl bg-slate-100" /><div className="h-40 animate-pulse rounded-xl bg-slate-100" /><div className="h-40 animate-pulse rounded-xl bg-slate-100" /></div>
      ) : view === "board" ? (
        <KanbanBoard<Order, OrderStatus>
          columns={ORDER_LANES}
          items={filtered}
          statusOf={(o) => o.status}
          idOf={(o) => o.id}
          onDrop={(o, status) => changeStatus(o, status)}
          renderCard={(o) => {
            const next = ORDER_NEXT[o.status];
            return (
              <KanbanCard
                accent={ORDER_STATUS_META[o.status]?.accent ?? "slate"}
                title={displayRef(o.ref, o.id, "ORD")}
                href={`/admin/orders/${o.id}`}
                rightTop={<span className="text-sm font-bold text-slate-900">{fmt(o.total_amount)}</span>}
                subtitle={
                  <>
                    {customerName(o)} · {o.items?.length ?? 0} item{(o.items?.length ?? 0) !== 1 ? "s" : ""}
                    {o.branch_slug && o.branch_slug !== "n/a" ? ` · ${branchLabel(o)}` : ""}
                  </>
                }
                meta={<span>{fmtDate(o.created_at)}</span>}
                primary={next ? { label: `Mark ${ORDER_STATUS_META[next].label}`, onClick: () => changeStatus(o, next) } : undefined}
              />
            );
          }}
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr>{["Order ID", "Customer", "Nursery", "Date", "Payment", "Status", "Items", "Total", ""].map((h) => <th key={h} className="px-4 py-3 text-left font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-400">{orders.length === 0 ? "No orders yet." : "No orders match these filters."}</td></tr>
              ) : filtered.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-slate-900 whitespace-nowrap">{displayRef(o.ref, o.id, "ORD")}</td>
                  <td className="px-4 py-3 text-slate-700">
                    <div className="font-medium text-slate-900">{customerName(o)}</div>
                    <div className="text-xs text-slate-400">{o.customer_phone || o.customer_email || ""}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{branchLabel(o)}</td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmtDate(o.created_at)}</td>
                  <td className="px-4 py-3"><PaymentBadge status={paymentOf(o)} /></td>
                  <td className="px-4 py-3"><StageBadge label={ORDER_STATUS_META[o.status]?.label ?? o.status} accent={ORDER_STATUS_META[o.status]?.accent ?? "slate"} /></td>
                  <td className="px-4 py-3 text-slate-700">{o.items?.length ?? 0}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{fmt(o.total_amount)}</td>
                  <td className="px-4 py-3"><Link href={`/admin/orders/${o.id}`} className="text-xs font-medium text-teal-600 hover:underline">View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {hasMore && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loadingMore}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            {loadingMore ? "Loading…" : "Load older orders"}
          </button>
        </div>
      )}
    </>
  );
}
