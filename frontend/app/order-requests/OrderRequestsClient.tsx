"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import PageWrapper from "@/components/ui/PageWrapper";
import Badge from "@/components/ui/Badge";
import { api } from "@/lib/api";
import { useAuthGuard } from "@/lib/useAuthGuard";
import type { Branch, CatalogueItem, OrderRequest, OrderRequestItem, OrderRequestStatus } from "@/types";

const SUPPLIERS = ["Gompels", "Amazon", "Other"];

const STATUS_VARIANT: Record<OrderRequestStatus, "blue" | "amber" | "green" | "gray"> = {
  pending: "amber",
  ordered: "blue",
  received: "green",
  cancelled: "gray",
};

const ALLOWED = ["staff", "branch_manager", "admin", "super_admin"] as const;

type DraftItem = OrderRequestItem;

const emptyItem = (): DraftItem => ({ item_name: "", supplier: "Gompels", qty: 1, notes: "" });

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function OrderRequestsClient() {
  const { ready, token, user, ensureAuthenticated, hasAnyRole } = useAuthGuard("/login");

  const [branches, setBranches] = useState<Branch[]>([]);
  const [catalogue, setCatalogue] = useState<CatalogueItem[]>([]);
  const [requests, setRequests] = useState<OrderRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const [branchSlug, setBranchSlug] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<DraftItem[]>([emptyItem()]);

  const allowed = useMemo(() => hasAnyRole([...ALLOWED]), [hasAnyRole]);

  useEffect(() => {
    if (!ready) return;
    if (!ensureAuthenticated("/order-requests")) return;
  }, [ready, ensureAuthenticated]);

  useEffect(() => {
    if (!ready || !token) return;
    Promise.allSettled([api.getBranches(), api.getMyOrderRequests(token), api.getCatalogue(token)])
      .then(([branchesRes, reqRes, catRes]) => {
        if (branchesRes.status === "fulfilled") setBranches((branchesRes.value as Branch[]) ?? []);
        if (reqRes.status === "fulfilled") setRequests((reqRes.value as OrderRequest[]) ?? []);
        if (catRes.status === "fulfilled") setCatalogue((catRes.value as CatalogueItem[]) ?? []);
      })
      .finally(() => setLoading(false));
  }, [ready, token]);

  // When a typed item name matches a catalogue item, link it + default the
  // supplier to that item's cheapest offer. Otherwise leave it as free text.
  const applyCatalogueMatch = (idx: number, name: string) => {
    const match = catalogue.find((c) => c.name.toLowerCase() === name.trim().toLowerCase());
    if (!match) {
      updateItem(idx, { item_name: name, catalogue_item_id: undefined });
      return;
    }
    const best = [...(match.offers ?? [])].sort(
      (a, b) => (a.price_per_unit || a.price) - (b.price_per_unit || b.price),
    )[0];
    updateItem(idx, {
      item_name: name,
      catalogue_item_id: match.id,
      ...(best ? { supplier: best.supplier } : {}),
    });
  };

  const updateItem = (idx: number, patch: Partial<DraftItem>) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (idx: number) =>
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) return;
    const cleanItems = items.filter((it) => it.item_name.trim());
    if (cleanItems.length === 0) {
      setError("Add at least one item.");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await api.createOrderRequest(token, { branch_slug: branchSlug, notes, items: cleanItems });
      setSuccess("Request submitted. Management will review it.");
      setItems([emptyItem()]);
      setNotes("");
      const refreshed = (await api.getMyOrderRequests(token)) as OrderRequest[];
      setRequests(Array.isArray(refreshed) ? refreshed : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit request");
    } finally {
      setSaving(false);
    }
  };

  const onCancel = async (id: string) => {
    if (!token || !window.confirm("Cancel this request?")) return;
    try {
      await api.cancelOrderRequest(token, id);
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: "cancelled" } : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel request");
    }
  };

  if (!ready) return null;

  if (ready && user && !allowed) {
    return (
      <PageWrapper className="flex justify-center">
        <div className="card p-8 max-w-md text-center">
          <h1 className="text-xl font-heading font-bold text-gray-900 mb-2">No access</h1>
          <p className="text-sm text-gray-500">
            Supply requests are for nursery staff and management only.
          </p>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-heading font-bold text-gray-900 mb-1">Supply Requests</h1>
        <p className="text-sm text-gray-500 mb-6">
          Request the items your room needs. Management collects these into the weekly/monthly order.
        </p>

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</p>
        )}
        {success && (
          <p className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">{success}</p>
        )}

        {/* ── Submit form ─────────────────────────────────────────────── */}
        <form className="card p-5 mb-8" onSubmit={onSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
              <select
                value={branchSlug}
                onChange={(e) => setBranchSlug(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
              >
                <option value="">Select a branch (optional)</option>
                {branches.map((b) => (
                  <option key={b.slug} value={b.slug}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <label className="block text-sm font-medium text-gray-700 mb-2">Items</label>
          <datalist id="catalogue-options">
            {catalogue.map((c) => <option key={c.id} value={c.name} />)}
          </datalist>
          <div className="space-y-2">
            {items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-start">
                <input
                  list="catalogue-options"
                  value={it.item_name}
                  onChange={(e) => applyCatalogueMatch(idx, e.target.value)}
                  placeholder="Item name"
                  className="col-span-12 sm:col-span-4 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
                <select
                  value={it.supplier}
                  onChange={(e) => updateItem(idx, { supplier: e.target.value })}
                  className="col-span-5 sm:col-span-3 rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
                >
                  {SUPPLIERS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <input
                  type="number"
                  min={1}
                  value={it.qty}
                  onChange={(e) => updateItem(idx, { qty: Number(e.target.value) })}
                  placeholder="Qty"
                  className="col-span-3 sm:col-span-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
                <input
                  value={it.notes ?? ""}
                  onChange={(e) => updateItem(idx, { notes: e.target.value })}
                  placeholder="Notes (optional)"
                  className="col-span-11 sm:col-span-3 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  disabled={items.length === 1}
                  className="col-span-1 flex items-center justify-center h-9 text-gray-400 hover:text-red-500 disabled:opacity-30"
                  aria-label="Remove item"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addItem}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700"
          >
            <Plus className="h-4 w-4" /> Add item
          </button>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes for management (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              placeholder="Anything the office should know…"
            />
          </div>

          <button type="submit" className="btn-primary mt-4 text-sm py-2 px-6" disabled={saving}>
            {saving ? "Submitting…" : "Submit request"}
          </button>
        </form>

        {/* ── My requests ─────────────────────────────────────────────── */}
        <h2 className="text-lg font-heading font-bold text-gray-900 mb-3">My requests</h2>
        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : requests.length === 0 ? (
          <p className="text-sm text-gray-400">You haven&apos;t submitted any requests yet.</p>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div key={req.id} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-gray-500">
                    {fmtDate(req.created_at)}
                    {req.branch_slug ? ` · ${req.branch_slug}` : ""}
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge label={req.status} variant={STATUS_VARIANT[req.status] ?? "gray"} />
                    {req.status === "pending" && (
                      <button
                        type="button"
                        onClick={() => onCancel(req.id)}
                        className="text-xs font-medium text-red-500 hover:underline"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
                <ul className="text-sm text-gray-700 space-y-0.5">
                  {req.items.map((it, i) => (
                    <li key={i}>
                      {it.qty}× {it.item_name}
                      <span className="text-gray-400"> — {it.supplier}{it.notes ? ` (${it.notes})` : ""}</span>
                    </li>
                  ))}
                </ul>
                {req.notes && <p className="text-xs text-gray-400 mt-2">Note: {req.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
