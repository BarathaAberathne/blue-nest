"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, PoundSterling, ShoppingBag, Trash2, Truck, X } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import ProcurementTabs from "@/components/admin/procurement/ProcurementTabs";
import StatCard from "@/components/admin/ui/StatCard";
import StageBadge from "@/components/admin/ui/StageBadge";
import type { OrderRequest, PurchaseCart, Supplier, SupplierInput } from "@/types";

const money = (pence: number) => `£${(pence / 100).toFixed(2)}`;
const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");
const isOpen = (s: string) => s === "draft" || s === "placed" || s === "sent" || s === "ordered" || s === "tracking" || s === "dispatched" || s === "partially_received";
const isPlaced = (s: string) => s !== "draft" && s !== "cancelled" && s !== "failed";

// Derived per-supplier activity, keyed by lower-cased name so it joins to the
// managed directory entries.
type Derived = { orders: number; openPOs: number; spend: number; requestItems: number; lastOrder?: string };

const emptyForm: SupplierInput = {
  name: "", category: "", contact_name: "", contact_email: "", contact_phone: "",
  website: "", order_email: "", account_ref: "", lead_time_days: 0, notes: "", is_active: true,
};

export default function SuppliersClient() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [carts, setCarts] = useState<PurchaseCart[]>([]);
  const [requests, setRequests] = useState<OrderRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create / edit modal.
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState<SupplierInput>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const token = getAccessToken();
    if (!token) { setError("Not authenticated — please sign in as admin."); setLoading(false); return; }
    const [s, c, r] = await Promise.allSettled([
      api.adminGetSuppliers(token), api.adminGetPurchaseCarts(token), api.adminGetOrderRequests(token),
    ]);
    if (s.status === "fulfilled") setSuppliers((s.value as Supplier[]) ?? []);
    if (c.status === "fulfilled") setCarts((c.value as PurchaseCart[]) ?? []);
    if (r.status === "fulfilled") setRequests((r.value as OrderRequest[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  // Roll up orders + requests by supplier name (lower-cased).
  const derived = useMemo(() => {
    const map = new Map<string, Derived>();
    const get = (s: string) => {
      const k = (s || "Other").toLowerCase();
      if (!map.has(k)) map.set(k, { orders: 0, openPOs: 0, spend: 0, requestItems: 0 });
      return map.get(k)!;
    };
    carts.forEach((c) => {
      const row = get(c.supplier);
      row.orders++;
      if (isOpen(c.status)) row.openPOs++;
      if (isPlaced(c.status)) row.spend += c.subtotal ?? 0;
      if (!row.lastOrder || new Date(c.created_at) > new Date(row.lastOrder)) row.lastOrder = c.created_at;
    });
    requests.forEach((r) => r.items.forEach((it) => { get(it.supplier).requestItems += 1; }));
    return map;
  }, [carts, requests]);

  // Combine the managed directory with any supplier names that only appear in
  // derived activity (so nothing is hidden), directory entries first.
  const rows = useMemo(() => {
    const named = new Set(suppliers.map((s) => s.name.toLowerCase()));
    const extras = [...derived.keys()]
      .filter((k) => !named.has(k))
      .map((k) => ({ supplier: null as Supplier | null, name: k.replace(/\b\w/g, (ch) => ch.toUpperCase()), d: derived.get(k)! }));
    const managed = suppliers.map((s) => ({ supplier: s, name: s.name, d: derived.get(s.name.toLowerCase()) }));
    return [...managed, ...extras].sort((a, b) => (b.d?.spend ?? 0) - (a.d?.spend ?? 0));
  }, [suppliers, derived]);

  const totals = useMemo(() => {
    let spend = 0, openPOs = 0;
    derived.forEach((d) => { spend += d.spend; openPOs += d.openPOs; });
    return { suppliers: suppliers.length, spend, openPOs };
  }, [derived, suppliers]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({
      name: s.name, category: s.category ?? "", contact_name: s.contact_name ?? "",
      contact_email: s.contact_email ?? "", contact_phone: s.contact_phone ?? "", website: s.website ?? "",
      order_email: s.order_email ?? "", account_ref: s.account_ref ?? "", lead_time_days: s.lead_time_days ?? 0,
      notes: s.notes ?? "", is_active: s.is_active,
    });
    setShowForm(true);
  };

  const save = async () => {
    const token = getAccessToken();
    if (!token || !form.name.trim()) { setError("Supplier name is required."); return; }
    setSaving(true); setError(null);
    try {
      if (editing) await api.adminUpdateSupplier(token, editing.id, form);
      else await api.adminCreateSupplier(token, form);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save supplier");
    } finally { setSaving(false); }
  };

  const remove = async (s: Supplier) => {
    if (!window.confirm(`Delete supplier “${s.name}”? Orders & requests are unaffected.`)) return;
    const token = getAccessToken();
    if (!token) return;
    try { await api.adminDeleteSupplier(token, s.id); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to delete supplier"); }
  };

  const setField = (patch: Partial<SupplierInput>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <>
      <ProcurementTabs />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">Suppliers</h1>
          <p className="text-sm text-slate-500">Your managed vendor directory — contacts, terms &amp; lead-times — with live spend rolled up from orders &amp; requests.</p>
        </div>
        <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700">
          <Plus className="h-4 w-4" /> New supplier
        </button>
      </div>

      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">{error}</p>}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Suppliers" value={totals.suppliers} icon={Truck} accent="blue" />
        <StatCard label="Total spend" value={money(totals.spend)} sub="placed orders" icon={PoundSterling} accent="teal" />
        <StatCard label="Open purchase orders" value={totals.openPOs} icon={ShoppingBag} accent="amber" />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr>{["Supplier", "Category", "Contact", "Orders", "Open POs", "Spend", "Last order", ""].map((h) => <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-6 text-slate-400">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-400">No suppliers yet — add your first.</td></tr>
            ) : rows.map((row) => (
              <tr key={row.supplier?.id ?? row.name} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">
                  {row.name}
                  {!row.supplier && <span className="ml-2 align-middle"><StageBadge label="unmanaged" accent="slate" withDot={false} /></span>}
                  {row.supplier && !row.supplier.is_active && <span className="ml-2 align-middle"><StageBadge label="inactive" accent="amber" withDot={false} /></span>}
                </td>
                <td className="px-4 py-3 text-slate-500">{row.supplier?.category || "—"}</td>
                <td className="px-4 py-3 text-slate-500">
                  {row.supplier?.contact_email || row.supplier?.contact_phone || "—"}
                </td>
                <td className="px-4 py-3 text-slate-700">{row.d?.orders ?? 0}</td>
                <td className="px-4 py-3 text-slate-700">{row.d?.openPOs ?? 0}</td>
                <td className="px-4 py-3 font-semibold text-slate-800">{money(row.d?.spend ?? 0)}</td>
                <td className="px-4 py-3 text-slate-500">{fmtDate(row.d?.lastOrder)}</td>
                <td className="px-4 py-3 text-right">
                  {row.supplier && (
                    <div className="flex items-center justify-end gap-2">
                      <button type="button" onClick={() => openEdit(row.supplier!)} aria-label="Edit" className="text-slate-400 hover:text-teal-600"><Pencil className="h-4 w-4" /></button>
                      <button type="button" onClick={() => remove(row.supplier!)} aria-label="Delete" className="text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Create / edit modal ─────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-auto rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-lg font-heading font-bold text-slate-900">{editing ? "Edit supplier" : "New supplier"}</h2>
              <button type="button" onClick={() => setShowForm(false)} aria-label="Close" className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
              <Field label="Name *"><input value={form.name} onChange={(e) => setField({ name: e.target.value })} className="inp" /></Field>
              <Field label="Category"><input value={form.category} onChange={(e) => setField({ category: e.target.value })} placeholder="e.g. Stationery" className="inp" /></Field>
              <Field label="Contact name"><input value={form.contact_name} onChange={(e) => setField({ contact_name: e.target.value })} className="inp" /></Field>
              <Field label="Contact email"><input type="email" value={form.contact_email} onChange={(e) => setField({ contact_email: e.target.value })} className="inp" /></Field>
              <Field label="Contact phone"><input value={form.contact_phone} onChange={(e) => setField({ contact_phone: e.target.value })} className="inp" /></Field>
              <Field label="Order email"><input type="email" value={form.order_email} onChange={(e) => setField({ order_email: e.target.value })} placeholder="where POs are emailed" className="inp" /></Field>
              <Field label="Website"><input value={form.website} onChange={(e) => setField({ website: e.target.value })} className="inp" /></Field>
              <Field label="Account ref"><input value={form.account_ref} onChange={(e) => setField({ account_ref: e.target.value })} placeholder="our account #" className="inp" /></Field>
              <Field label="Lead time (days)"><input type="number" min={0} value={form.lead_time_days} onChange={(e) => setField({ lead_time_days: Number(e.target.value) })} className="inp" /></Field>
              <Field label="Active">
                <select value={form.is_active ? "yes" : "no"} onChange={(e) => setField({ is_active: e.target.value === "yes" })} className="inp bg-white">
                  <option value="yes">Active</option>
                  <option value="no">Inactive</option>
                </select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Notes"><textarea value={form.notes} onChange={(e) => setField({ notes: e.target.value })} rows={2} className="inp" /></Field>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={save} disabled={saving} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">{saving ? "Saving…" : editing ? "Save changes" : "Create supplier"}</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        :global(.inp) {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid rgb(226 232 240);
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
        }
      `}</style>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs uppercase tracking-wider text-slate-400">{label}</label>
      {children}
    </div>
  );
}
