"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Columns3, Table2 } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import ProcurementTabs from "@/components/admin/procurement/ProcurementTabs";
import KanbanBoard from "@/components/admin/ui/KanbanBoard";
import KanbanCard from "@/components/admin/ui/KanbanCard";
import StageBadge from "@/components/admin/ui/StageBadge";
import ViewToggle from "@/components/admin/ui/ViewToggle";
import { PRIORITY_RANK, PURCHASE_CART_LANES, PURCHASE_CART_STATUS_META, priorityMeta } from "@/lib/admin-status";
import type { ProcurementPriority, PurchaseCart, PurchaseCartStatus } from "@/types";

const money = (pence: number) => `£${(pence / 100).toFixed(2)}`;
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

// Any status from "placed" onwards counts as placed (legacy sent/ordered included).
const PLACED_STATUSES: PurchaseCartStatus[] = [
  "sent", "ordered", "placed", "tracking", "dispatched", "partially_received", "received", "completed",
];
const isPlaced = (s: PurchaseCartStatus) => PLACED_STATUSES.includes(s);
const isDone = (s: PurchaseCartStatus) => s === "received" || s === "completed";

function isOverdue(c: PurchaseCart) {
  if (isDone(c.status) || !c.expected_delivery_date || !isPlaced(c.status)) return false;
  return new Date(c.expected_delivery_date) < new Date(new Date().toDateString());
}

function receivedPct(c: PurchaseCart) {
  const total = c.lines.reduce((s, l) => s + l.qty, 0);
  if (total === 0) return 0;
  const done = c.lines.reduce((s, l) => s + Math.min(l.qty_received ?? 0, l.qty), 0);
  return Math.round((done / total) * 100);
}
const receivedFrac = (c: PurchaseCart) => `${c.lines.filter((l) => (l.qty_received ?? 0) >= l.qty).length}/${c.lines.length}`;

export default function AdminPurchaseCartsClient() {
  const router = useRouter();
  const [carts, setCarts] = useState<PurchaseCart[]>([]);
  const [view, setView] = useState<"board" | "table">("board");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token) { setError("Not authenticated — please sign in as admin."); setLoading(false); return; }
    try {
      const data = await api.adminGetPurchaseCarts(token);
      setCarts(Array.isArray(data) ? (data as PurchaseCart[]) : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load carts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // PO transitions are action-based (placing emails the supplier; receiving
  // updates stock) — so the board's side-effecting moves go through confirms,
  // and ambiguous drops (partial / cancel) route to the detail stepper.
  const placeOrder = async (c: PurchaseCart) => {
    if (!window.confirm(`Place this ${c.supplier} order? This emails the supplier.`)) return;
    const token = getAccessToken();
    if (!token) return;
    try { await api.adminSendPurchaseCart(token, c.id); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to place order"); }
  };

  const receiveAll = async (c: PurchaseCart) => {
    if (!window.confirm(`Mark all lines of this ${c.supplier} order as received? This updates stock.`)) return;
    const token = getAccessToken();
    if (!token) return;
    try {
      await api.adminReceiveCart(token, c.id, c.lines.map((l) => ({ code: l.code ?? "", name: l.name, qty_received: l.qty })));
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to receive order"); }
  };

  // Move through the lifecycle (placed → tracking → dispatched → completed)
  // without a side-effecting email/receive — used by the in-transit lane.
  const setStatus = async (c: PurchaseCart, status: PurchaseCartStatus) => {
    const token = getAccessToken();
    if (!token) return;
    try { await api.adminUpdatePurchaseCartStatus(token, c.id, status); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to update order"); }
  };

  const handleDrop = (c: PurchaseCart, dropStatus: PurchaseCartStatus) => {
    if (dropStatus === c.status) return;
    if (dropStatus === "placed" && !isPlaced(c.status)) return placeOrder(c);
    if (dropStatus === "tracking" && isPlaced(c.status)) return setStatus(c, "tracking");
    if (dropStatus === "received") return receiveAll(c);
    router.push(`/admin/purchase-carts/${c.id}`); // partial / cancel need the stepper
  };

  const filtered = useMemo(() => {
    const rank = (p?: string) => PRIORITY_RANK[(p as ProcurementPriority)] ?? PRIORITY_RANK.normal;
    const base = !statusFilter
      ? carts
      : statusFilter === "placed"
        ? carts.filter((c) => c.status === "placed" || c.status === "ordered" || c.status === "sent")
        : carts.filter((c) => c.status === statusFilter);
    return [...base].sort((a, b) => rank(a.priority) - rank(b.priority) || +new Date(b.created_at) - +new Date(a.created_at));
  }, [carts, statusFilter]);

  return (
    <>
      <ProcurementTabs />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">Purchase Orders</h1>
          <p className="text-sm text-slate-500">Per-supplier orders generated from staff supply requests — review, place, track delivery, then receive.</p>
        </div>
        <ViewToggle active={view} onChange={setView} options={[{ key: "board", label: "Board", icon: Columns3 }, { key: "table", label: "Table", icon: Table2 }]} />
      </div>

      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">{error}</p>}

      {view === "table" && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="placed">Placed</option>
            <option value="tracking">Tracking</option>
            <option value="dispatched">Dispatched</option>
            <option value="partially_received">Partially received</option>
            <option value="received">Received</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      )}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-3"><div className="h-40 animate-pulse rounded-xl bg-slate-100" /><div className="h-40 animate-pulse rounded-xl bg-slate-100" /><div className="h-40 animate-pulse rounded-xl bg-slate-100" /></div>
      ) : view === "board" ? (
        <KanbanBoard<PurchaseCart, PurchaseCartStatus>
          columns={PURCHASE_CART_LANES}
          items={filtered}
          statusOf={(c) => c.status}
          idOf={(c) => c.id}
          onDrop={(c, status) => handleDrop(c, status)}
          renderCard={(c) => {
            const showPriority = c.priority && c.priority !== "normal";
            const pr = priorityMeta(c.priority);
            return (
              <KanbanCard
                accent={PURCHASE_CART_STATUS_META[c.status]?.accent ?? "slate"}
                title={c.supplier}
                href={`/admin/purchase-carts/${c.id}`}
                rightTop={<span className="text-sm font-bold text-slate-900">{money(c.subtotal)}</span>}
                subtitle={
                  <>
                    {c.lines.length} line{c.lines.length !== 1 ? "s" : ""}
                    {c.branch_slug ? ` · ${c.branch_slug.replace(/[-_]/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase())}` : ""}
                    {c.classroom ? ` · ${c.classroom}` : ""}
                  </>
                }
                badges={showPriority ? [{ label: pr.label, accent: pr.accent }] : undefined}
                meta={
                  <>
                    {c.ref && <span className="font-mono font-medium text-slate-500">{c.ref}</span>}
                    {c.expected_delivery_date
                      ? <span className={isOverdue(c) ? "font-semibold text-amber-600" : ""}>{fmtDate(c.expected_delivery_date)}{isOverdue(c) ? " · overdue" : ""}</span>
                      : <span>{fmtDate(c.created_at)}</span>}
                  </>
                }
                progress={isPlaced(c.status) ? { value: receivedPct(c), accent: "green", label: `Received ${receivedFrac(c)}` } : undefined}
                primary={
                  c.status === "draft" ? { label: "Place order", onClick: () => placeOrder(c) }
                    : isPlaced(c.status) && !isDone(c.status) ? { label: "Receive all", onClick: () => receiveAll(c) }
                    : undefined
                }
              />
            );
          }}
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr>{["Date", "Supplier", "Lines", "Subtotal", "Status", "Expected", "Received", ""].map((h) => <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-400">{carts.length === 0 ? "No purchase orders yet." : "No orders match this filter."}</td></tr>
              ) : filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-500">{fmtDate(c.created_at)}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{c.supplier}</td>
                  <td className="px-4 py-3 text-slate-700">{c.lines.length}</td>
                  <td className="px-4 py-3 text-slate-700">{money(c.subtotal)}</td>
                  <td className="px-4 py-3"><StageBadge label={PURCHASE_CART_STATUS_META[c.status]?.label ?? c.status} accent={PURCHASE_CART_STATUS_META[c.status]?.accent ?? "slate"} /></td>
                  <td className="px-4 py-3 text-xs">{c.expected_delivery_date ? <span className={isOverdue(c) ? "font-medium text-amber-600" : "text-slate-500"}>{fmtDate(c.expected_delivery_date)}{isOverdue(c) ? " · overdue" : ""}</span> : <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{isPlaced(c.status) ? receivedFrac(c) : "—"}</td>
                  <td className="px-4 py-3"><Link href={`/admin/purchase-carts/${c.id}`} className="text-xs font-medium text-teal-600 hover:underline">{c.status === "draft" ? "Review & place" : isDone(c.status) ? "View" : "Manage"}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
