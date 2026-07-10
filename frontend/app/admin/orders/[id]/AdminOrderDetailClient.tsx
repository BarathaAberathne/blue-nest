"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { displayRef } from "@/lib/ref";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import type { Order, OrderStatus, PaymentStatus, ShippingAddress } from "@/types";

const STATUS_VARIANT: Record<OrderStatus, "green" | "blue" | "amber" | "gray"> = {
  paid: "green",
  delivered: "green",
  processing: "blue",
  shipped: "amber",
  pending: "gray",
  cancelled: "gray",
};

const PAYMENT_VARIANT: Record<PaymentStatus, "green" | "amber" | "gray"> = {
  paid: "green",
  unpaid: "amber",
  failed: "gray",
  refunded: "gray",
};

const ALL_STATUSES: OrderStatus[] = ["pending", "paid", "processing", "shipped", "delivered", "cancelled"];

function fmt(pence: number) { return `£${(pence / 100).toFixed(2)}`; }

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function paymentOf(o: Order): PaymentStatus {
  return o.payment_status ?? (o.status === "paid" || o.paid_at ? "paid" : "unpaid");
}

/** A label/value row; renders "Not recorded" (muted) when the value is empty. */
function Row({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  const has = !!value && value.trim() !== "";
  return (
    <div className="flex gap-2">
      <dt className="text-gray-500 w-32 shrink-0">{label}</dt>
      <dd className={`${has ? "text-gray-800" : "text-gray-300 italic"} ${mono ? "font-mono text-xs break-all" : ""}`}>
        {has ? value : "Not recorded"}
      </dd>
    </div>
  );
}

function AddressBlock({ addr }: { addr?: ShippingAddress }) {
  const lines = addr
    ? [addr.name, addr.line1, addr.line2, addr.city, addr.county, addr.postal_code, addr.country].filter(Boolean)
    : [];
  if (lines.length === 0) return <p className="text-sm text-gray-300 italic">Not recorded</p>;
  return (
    <address className="not-italic text-sm text-gray-700 leading-relaxed">
      {lines.map((line, i) => <span key={i} className="block">{line}</span>)}
      {addr?.phone && <span className="block text-gray-400 mt-1">{addr.phone}</span>}
    </address>
  );
}

export default function AdminOrderDetailClient({ id }: { id: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<OrderStatus>("pending");
  const [updating, setUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) { setError("Not authenticated."); setLoading(false); return; }
    api.adminGetOrder(token, id)
      .then((data) => { const o = data as Order; setOrder(o); setNewStatus(o.status); })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load order"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleUpdateStatus = async () => {
    const token = getAccessToken();
    if (!token || !order) return;
    setUpdating(true);
    setUpdateMsg(null);
    try {
      await api.adminUpdateOrderStatus(token, order.id, newStatus);
      setOrder((prev) => (prev ? { ...prev, status: newStatus } : prev));
      setUpdateMsg("Status updated successfully.");
    } catch (err) {
      setUpdateMsg(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>;
  }
  if (error || !order) {
    return <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error ?? "Order not found."}</p>;
  }

  const pay = paymentOf(order);
  const branchApplicable = !!order.branch_slug && order.branch_slug !== "n/a";

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Link href="/admin/orders" className="text-sm text-gray-500 hover:text-gray-700">← Orders</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-heading font-bold text-gray-900 font-mono">{displayRef(order.ref, order.id, "ORD")}</h1>
        <Badge label={order.status} variant={STATUS_VARIANT[order.status] ?? "gray"} />
        <Badge label={`Payment: ${pay}`} variant={PAYMENT_VARIANT[pay] ?? "gray"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* Order items */}
          <Card>
            <h2 className="font-semibold text-gray-900 mb-4">Order Items</h2>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <tr>{["Product", "Age/Size", "Qty", "Unit Price", "Line Total"].map((h) => <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {order.items.map((item, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5 font-medium text-gray-900">{item.name}</td>
                    <td className="px-3 py-2.5 text-gray-500">{item.size ?? "—"}</td>
                    <td className="px-3 py-2.5 text-gray-700">{item.qty}</td>
                    <td className="px-3 py-2.5 text-gray-700">{fmt(item.price)}</td>
                    <td className="px-3 py-2.5 font-semibold text-gray-900">{fmt(item.price * item.qty)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200">
                  <td colSpan={4} className="px-3 py-2.5 text-right font-semibold text-gray-700 text-sm">Order Total</td>
                  <td className="px-3 py-2.5 font-bold text-gray-900">{fmt(order.total_amount)}</td>
                </tr>
              </tfoot>
            </table>
          </Card>

          {/* Customer + nursery */}
          <Card>
            <h2 className="font-semibold text-gray-900 mb-3">Customer</h2>
            <dl className="space-y-1.5 text-sm">
              <Row label="Full name" value={order.customer_name} />
              <Row label="Email" value={order.customer_email} />
              <Row label="Telephone" value={order.customer_phone} />
              <Row label="Nursery" value={branchApplicable ? (order.branch_name || order.branch_slug) : "Not applicable"} />
              {branchApplicable && <Row label="Child / reference" value={order.child_ref} />}
            </dl>
          </Card>

          {/* Payment */}
          <Card>
            <h2 className="font-semibold text-gray-900 mb-3">Payment</h2>
            <dl className="space-y-1.5 text-sm">
              <div className="flex gap-2">
                <dt className="text-gray-500 w-32 shrink-0">Payment status</dt>
                <dd><Badge label={pay} variant={PAYMENT_VARIANT[pay] ?? "gray"} /></dd>
              </div>
              <Row label="Paid at" value={order.paid_at ? fmtDate(order.paid_at) : ""} />
              <Row label="Currency" value={order.currency?.toUpperCase()} />
              <Row label="Stripe session" value={order.stripe_session_id} mono />
              <Row label="Payment intent" value={order.payment_intent_id} mono />
              <Row label="Stripe customer" value={order.stripe_customer_id} mono />
            </dl>
          </Card>
        </div>

        {/* Sidebar: addresses + admin */}
        <div className="space-y-5">
          <Card>
            <h2 className="font-semibold text-gray-900 mb-3">Delivery Address</h2>
            <AddressBlock addr={order.shipping_address} />
          </Card>

          <Card>
            <h2 className="font-semibold text-gray-900 mb-3">Billing Address</h2>
            <AddressBlock addr={order.billing_address} />
          </Card>

          <Card>
            <h2 className="font-semibold text-gray-900 mb-3">Administration</h2>
            <dl className="space-y-1.5 text-sm">
              <Row label="Order ID" value={order.id} mono />
              <Row label="Placed" value={fmtDate(order.created_at)} />
              <Row label="Updated" value={order.updated_at ? fmtDate(order.updated_at) : ""} />
            </dl>
          </Card>

          <Card>
            <h2 className="font-semibold text-gray-900 mb-3">Update Status</h2>
            <select value={newStatus} onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
              {ALL_STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
            <button type="button" onClick={() => void handleUpdateStatus()} disabled={updating || newStatus === order.status}
              className="btn-primary w-full mt-3 text-sm py-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {updating ? "Updating…" : "Update Status"}
            </button>
            {updateMsg && <p className={`mt-2 text-xs ${updateMsg.includes("success") ? "text-green-600" : "text-red-500"}`}>{updateMsg}</p>}
          </Card>
        </div>
      </div>
    </>
  );
}
