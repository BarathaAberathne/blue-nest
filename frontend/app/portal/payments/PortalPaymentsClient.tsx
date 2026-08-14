"use client";

// Payments & Orders — ONE parent finance area: the family's nursery-fee
// account (canonical finance module) + their store orders (the same
// GET /orders/me the account area uses — no duplicated orders flow).

import { useEffect, useState } from "react";
import { Banknote, ShoppingBag } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { fmtDate } from "@/lib/child";
import { displayRef } from "@/lib/ref";
import { formatPence, mandateStatusLabel } from "@/lib/finance";
import type { FamilyView, Order } from "@/types";

export default function PortalPaymentsClient() {
  const [finance, setFinance] = useState<FamilyView | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ddBusy, setDdBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    Promise.allSettled([
      api.portalGetFinance(token).then((v) => { if (v && "charges" in v) setFinance(v as FamilyView); }),
      api.getMyOrders(token).then((data) => {
        const list = Array.isArray(data) ? (data as Order[]) : [];
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setOrders(list);
      }),
    ]).finally(() => setLoading(false));
  }, []);

  const startDirectDebit = async () => {
    const token = getAccessToken();
    if (!token) return;
    setDdBusy(true);
    try {
      const { setup_url } = await api.portalSetupDirectDebit(token);
      window.location.href = setup_url;
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "We could not start Direct Debit setup — please contact the nursery.");
      setDdBusy(false);
    }
  };

  if (loading) return <p className="text-slate-400">Loading…</p>;

  return (
    <>
      <h1 className="font-heading text-2xl font-bold text-slate-900">Payments &amp; Orders</h1>
      {notice && <p className="mt-3 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">{notice}</p>}

      {/* Nursery fees */}
      <section className="mt-5">
        <h2 className="flex items-center gap-2 font-heading text-base font-bold text-slate-900"><Banknote className="h-4 w-4 text-teal-600" /> Nursery fees</h2>
        {!finance?.family ? (
          <p className="mt-2 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-400">No fee account has been set up yet — the nursery will arrange this with you.</p>
        ) : (
          <>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Outstanding balance</p>
                <p className={`mt-1 text-2xl font-bold ${finance.family.balance_pence > 0 ? "text-slate-900" : "text-green-700"}`}>{formatPence(finance.family.balance_pence)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Next payment</p>
                {finance.next_payment ? (
                  <>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{formatPence(finance.next_payment.amount_pence - (finance.next_payment.paid_pence ?? 0))}</p>
                    <p className="text-xs text-slate-500">due {fmtDate(finance.next_payment.due_date)} · {finance.next_payment.description}</p>
                  </>
                ) : <p className="mt-1 text-sm text-slate-500">Nothing due — you are all settled.</p>}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Direct Debit</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{mandateStatusLabel[finance.family.mandate_status]}</p>
                {finance.family.mandate_status !== "active" && (
                  <button type="button" onClick={() => void startDirectDebit()} disabled={ddBusy}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50">
                    {ddBusy ? "Redirecting…" : "Set up Direct Debit"}
                  </button>
                )}
              </div>
            </div>
            {finance.payments.length > 0 && (
              <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                <table className="w-full min-w-[480px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wider text-slate-400">
                      <th className="px-4 py-3">Date</th><th className="px-4 py-3">Method</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finance.payments.slice(0, 10).map((p) => (
                      <tr key={p.id} className="border-b border-slate-50">
                        <td className="px-4 py-2.5 text-slate-500">{fmtDate(p.created_at?.slice(0, 10))}</td>
                        <td className="px-4 py-2.5 text-slate-600">{p.method === "bacs_debit" ? "Direct Debit" : p.method === "manual" ? "Bank / cash" : p.method}</td>
                        <td className="px-4 py-2.5 text-slate-600">{p.status}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-slate-800">{formatPence(p.amount_pence)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>

      {/* Store orders */}
      <section className="mt-7">
        <h2 className="flex items-center gap-2 font-heading text-base font-bold text-slate-900"><ShoppingBag className="h-4 w-4 text-teal-600" /> Shop orders</h2>
        {orders.length === 0 ? (
          <p className="mt-2 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-400">No shop orders yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3">Order</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 10).map((o) => (
                  <tr key={o.id} className="border-b border-slate-50">
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{displayRef(o.ref, o.id, "ORD")}</td>
                    <td className="px-4 py-2.5 text-slate-500">{fmtDate(o.created_at?.slice(0, 10))}</td>
                    <td className="px-4 py-2.5 text-slate-600">{o.status}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-slate-800">{formatPence(o.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
