"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Columns3, Table2 } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import KanbanBoard from "@/components/admin/ui/KanbanBoard";
import KanbanCard from "@/components/admin/ui/KanbanCard";
import StageBadge from "@/components/admin/ui/StageBadge";
import ViewToggle from "@/components/admin/ui/ViewToggle";
import { ORDER_LANES, ORDER_NEXT, ORDER_STATUS_META } from "@/lib/admin-status";
import type { Order, OrderStatus } from "@/types";

function fmt(pence: number) { return `£${(pence / 100).toFixed(2)}`; }
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); }

export default function AdminOrdersClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [view, setView] = useState<"board" | "table">("board");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token) { setError("Not authenticated — please sign in as admin."); setLoading(false); return; }
    try {
      const data = await api.adminGetOrders(token);
      setOrders(Array.isArray(data) ? (data as Order[]) : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const changeStatus = async (o: Order, status: OrderStatus) => {
    if (status === o.status) return;
    if (status === "cancelled" && !window.confirm(`Cancel order ${o.id.slice(0, 8).toUpperCase()}?`)) return;
    const token = getAccessToken();
    if (!token) return;
    try {
      await api.adminUpdateOrderStatus(token, o.id, status);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update order");
    }
  };

  const sorted = [...orders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">Orders</h1>
          {!loading && !error && <p className="text-sm text-slate-500">{orders.length} total</p>}
        </div>
        <ViewToggle active={view} onChange={setView} options={[{ key: "board", label: "Board", icon: Columns3 }, { key: "table", label: "Table", icon: Table2 }]} />
      </div>

      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">{error}</p>}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-3"><div className="h-40 animate-pulse rounded-xl bg-slate-100" /><div className="h-40 animate-pulse rounded-xl bg-slate-100" /><div className="h-40 animate-pulse rounded-xl bg-slate-100" /></div>
      ) : view === "board" ? (
        <KanbanBoard<Order, OrderStatus>
          columns={ORDER_LANES}
          items={sorted}
          statusOf={(o) => o.status}
          idOf={(o) => o.id}
          onDrop={(o, status) => changeStatus(o, status)}
          renderCard={(o) => {
            const next = ORDER_NEXT[o.status];
            return (
              <KanbanCard
                accent={ORDER_STATUS_META[o.status]?.accent ?? "slate"}
                title={`#${o.id.slice(0, 8).toUpperCase()}`}
                href={`/admin/orders/${o.id}`}
                rightTop={<span className="text-sm font-bold text-slate-900">{fmt(o.total_amount)}</span>}
                subtitle={`${o.items?.length ?? 0} item${(o.items?.length ?? 0) !== 1 ? "s" : ""}`}
                meta={<span>{fmtDate(o.created_at)}</span>}
                primary={next ? { label: `Mark ${ORDER_STATUS_META[next].label}`, onClick: () => changeStatus(o, next) } : undefined}
              />
            );
          }}
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr>{["Order ID", "Date", "Items", "Total", "Status", ""].map((h) => <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">No orders yet.</td></tr>
              ) : sorted.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-slate-900">{o.id.slice(0, 8).toUpperCase()}</td>
                  <td className="px-4 py-3 text-slate-500">{fmtDate(o.created_at)}</td>
                  <td className="px-4 py-3 text-slate-700">{o.items?.length ?? 0} item{(o.items?.length ?? 0) !== 1 ? "s" : ""}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{fmt(o.total_amount)}</td>
                  <td className="px-4 py-3"><StageBadge label={ORDER_STATUS_META[o.status]?.label ?? o.status} accent={ORDER_STATUS_META[o.status]?.accent ?? "slate"} /></td>
                  <td className="px-4 py-3"><Link href={`/admin/orders/${o.id}`} className="text-xs font-medium text-teal-600 hover:underline">View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
