"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import StageBadge from "@/components/admin/ui/StageBadge";
import SearchSelect from "@/components/ui/SearchSelect";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { ORDER_REQUEST_STATUS_META } from "@/lib/admin-status";
import type { Branch, CatalogueItem, OrderRequest, OrderRequestItem, OrderTemplate } from "@/types";

const SUPPLIERS = ["Gompels", "Amazon", "Other"];
const MANUAL = "__manual__";

// A purchasable variant of a base product (one Gompels code).
type Variant = { id: string; option: string; code: string; packSize: string; description: string };
type Product = { baseName: string; variants: Variant[] };

// Editable request line. In "catalogue" mode the staff member picked a known
// product/variant; in "manual" mode they typed a free-text item.
type DraftItem = {
  mode: "catalogue" | "manual";
  baseName: string;
  catalogueItemId: string;
  code: string;
  itemName: string;
  supplier: string;
  qty: number;
  notes: string;
};

const emptyItem = (): DraftItem => ({
  mode: "catalogue",
  baseName: "",
  catalogueItemId: "",
  code: "",
  itemName: "",
  supplier: "Gompels",
  qty: 1,
  notes: "",
});

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminMyRequestsClient() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [catalogue, setCatalogue] = useState<CatalogueItem[]>([]);
  const [requests, setRequests] = useState<OrderRequest[]>([]);
  const [templates, setTemplates] = useState<OrderTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const [branchSlug, setBranchSlug] = useState("");
  const [classroom, setClassroom] = useState("");
  const [priority, setPriority] = useState("normal");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<DraftItem[]>([emptyItem()]);

  const token = typeof window !== "undefined" ? getAccessToken() : "";

  const loadTemplates = (t: string) =>
    api.getOrderTemplates(t).then((d) => setTemplates(Array.isArray(d) ? (d as OrderTemplate[]) : [])).catch(() => {});

  useEffect(() => {
    if (!token) {
      setError("Please sign in first.");
      setLoading(false);
      return;
    }
    Promise.allSettled([api.getBranches(), api.getMyOrderRequests(token), api.getCatalogue(token), api.getOrderTemplates(token)])
      .then(([branchesRes, reqRes, catRes, tplRes]) => {
        if (branchesRes.status === "fulfilled") setBranches((branchesRes.value as Branch[]) ?? []);
        if (reqRes.status === "fulfilled") setRequests((reqRes.value as OrderRequest[]) ?? []);
        if (catRes.status === "fulfilled") setCatalogue((catRes.value as CatalogueItem[]) ?? []);
        if (tplRes.status === "fulfilled") setTemplates((tplRes.value as OrderTemplate[]) ?? []);
      })
      .finally(() => setLoading(false));
  }, [token]);

  // Group catalogue items into products → variants for the cascading picker.
  const products = useMemo<Product[]>(() => {
    const map = new Map<string, Variant[]>();
    for (const c of catalogue) {
      const base = (c.base_name || c.name).trim();
      const offer = c.offers?.[0];
      const variant: Variant = {
        id: c.id,
        option: c.option || "",
        code: offer?.code ?? "",
        packSize: offer?.pack_size ?? "",
        description: c.name,
      };
      const list = map.get(base) ?? [];
      list.push(variant);
      map.set(base, list);
    }
    return [...map.entries()]
      .map(([baseName, variants]) => ({
        baseName,
        variants: variants.sort((a, b) => a.option.localeCompare(b.option)),
      }))
      .sort((a, b) => a.baseName.localeCompare(b.baseName));
  }, [catalogue]);

  const productByName = useMemo(
    () => new Map(products.map((p) => [p.baseName, p])),
    [products],
  );

  // Include each product's variant codes as searchable keywords so staff who
  // remember an item by its Gompels code can find it by typing the code.
  const productOptions = useMemo(
    () =>
      products.map((p) => ({
        value: p.baseName,
        label: p.baseName,
        keywords: p.variants.map((v) => v.code).filter(Boolean).join(" "),
      })),
    [products],
  );

  const itemById = useMemo(() => new Map(catalogue.map((c) => [c.id, c])), [catalogue]);

  // Map a saved/past request item back into an editable draft row.
  const draftFromItem = (it: OrderRequestItem): DraftItem => {
    const cat = it.catalogue_item_id ? itemById.get(it.catalogue_item_id) : undefined;
    if (cat) {
      return {
        mode: "catalogue",
        baseName: cat.base_name || cat.name,
        catalogueItemId: cat.id,
        code: cat.offers?.[0]?.code || it.code || "",
        itemName: cat.name,
        supplier: "Gompels",
        qty: it.qty || 1,
        notes: it.notes || "",
      };
    }
    return {
      mode: "manual",
      baseName: "",
      catalogueItemId: "",
      code: it.code || "",
      itemName: it.item_name,
      supplier: it.supplier || "Other",
      qty: it.qty || 1,
      notes: it.notes || "",
    };
  };

  // Replace the draft rows with a set of items (from a template or past request).
  const loadItems = (src: OrderRequestItem[], branch?: string) => {
    if (!src || src.length === 0) return;
    setItems(src.map(draftFromItem));
    if (branch !== undefined) setBranchSlug(branch);
    setSuccess(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Current draft → OrderRequestItem[] (shared by submit + save-as-template).
  const currentItems = (): OrderRequestItem[] =>
    items
      .filter((it) => it.itemName.trim())
      .map((it) => ({
        item_name: it.itemName.trim(),
        supplier: it.supplier,
        qty: it.qty,
        notes: it.notes.trim() || undefined,
        code: it.code.trim() || undefined,
        catalogue_item_id: it.catalogueItemId || undefined,
      }));

  const onSaveTemplate = async () => {
    if (!token) return;
    const its = currentItems();
    if (its.length === 0) {
      setError("Add at least one item before saving a template.");
      return;
    }
    const name = window.prompt("Template name (e.g. ‘Preschool 1 weekly’):");
    if (!name?.trim()) return;
    try {
      await api.createOrderTemplate(token, { name: name.trim(), branch_slug: branchSlug, items: its });
      await loadTemplates(token);
      setSuccess(`Saved template “${name.trim()}”.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save template");
    }
  };

  const onDeleteTemplate = async (id: string) => {
    if (!token || !window.confirm("Delete this template?")) return;
    try {
      await api.deleteOrderTemplate(token, id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete template");
    }
  };

  const updateItem = (idx: number, patch: Partial<DraftItem>) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  // Apply a chosen variant (its code/description) onto a draft line.
  const selectVariant = (idx: number, v: Variant | null) =>
    updateItem(idx, v
      ? { catalogueItemId: v.id, code: v.code, itemName: v.description, supplier: "Gompels" }
      : { catalogueItemId: "", code: "", itemName: "" });

  const onProductChange = (idx: number, value: string) => {
    if (value === MANUAL) {
      updateItem(idx, { mode: "manual", baseName: "", catalogueItemId: "", code: "", itemName: "", supplier: "Gompels" });
      return;
    }
    const product = productByName.get(value);
    if (!product) {
      updateItem(idx, { mode: "catalogue", baseName: "", catalogueItemId: "", code: "", itemName: "" });
      return;
    }
    // Auto-select when there's a single variant; otherwise wait for a variant pick.
    updateItem(idx, { mode: "catalogue", baseName: value });
    selectVariant(idx, product.variants.length === 1 ? product.variants[0] : null);
  };

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (idx: number) =>
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) return;
    const cleanItems = items
      .filter((it) => it.itemName.trim())
      .map((it) => ({
        item_name: it.itemName.trim(),
        supplier: it.supplier,
        qty: it.qty,
        notes: it.notes.trim(),
        code: it.code.trim() || undefined,
        catalogue_item_id: it.catalogueItemId || undefined,
      }));
    if (cleanItems.length === 0) {
      setError("Add at least one item — pick a product or type one manually.");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await api.createOrderRequest(token, { branch_slug: branchSlug, classroom: classroom.trim(), priority, notes, items: cleanItems });
      setSuccess("Request submitted. Management will review it.");
      setItems([emptyItem()]);
      setNotes("");
      setClassroom("");
      setPriority("normal");
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

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold text-gray-900">My Supply Requests</h1>
        <p className="text-sm text-gray-500">
          Pick the items your room needs (by product code) or type your own. Management collects these
          into the weekly/monthly order.
        </p>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</p>
      )}
      {success && (
        <p className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">{success}</p>
      )}

      {/* ── Submit form ─────────────────────────────────────────────── */}
      <form className="card p-5 mb-8" onSubmit={onSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Classroom / room</label>
            <input
              value={classroom}
              onChange={(e) => setClassroom(e.target.value)}
              placeholder="e.g. Toddler Room (optional)"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        {/* Templates toolbar */}
        {templates.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
            <span className="text-xs font-medium text-gray-500">Standing orders:</span>
            {templates.map((t) => (
              <span key={t.id} className="inline-flex items-center gap-1 rounded-full bg-white border border-gray-200 pl-2.5 pr-1 py-0.5 text-xs">
                <button type="button" onClick={() => loadItems(t.items, t.branch_slug)} className="font-medium text-teal-700 hover:underline">
                  {t.name}
                </button>
                <button type="button" onClick={() => onDeleteTemplate(t.id)} aria-label={`Delete ${t.name}`} className="text-gray-300 hover:text-red-500">
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="mb-2 flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">Items</label>
          <button type="button" onClick={onSaveTemplate} className="text-xs font-medium text-gray-500 hover:text-teal-700 hover:underline">
            Save as template
          </button>
        </div>
        <div className="space-y-3">
          {items.map((it, idx) => {
            const product = it.baseName ? productByName.get(it.baseName) : undefined;
            const showVariantSelect = it.mode === "catalogue" && !!product && product.variants.length > 1;
            const selectedVariant =
              product && it.catalogueItemId
                ? product.variants.find((v) => v.id === it.catalogueItemId)
                : undefined;
            return (
              <div key={idx} className="rounded-lg border border-gray-200 p-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Searchable product picker (with manual fallback) */}
                  <SearchSelect
                    options={productOptions}
                    value={it.mode === "manual" ? MANUAL : it.baseName}
                    onChange={(v) => onProductChange(idx, v)}
                    placeholder="Search products…"
                    extraOption={{ value: MANUAL, label: "Other — type manually" }}
                  />

                  {/* Variant select (multi-variant products) */}
                  {showVariantSelect && (
                    <select
                      value={it.catalogueItemId}
                      onChange={(e) =>
                        selectVariant(idx, product?.variants.find((v) => v.id === e.target.value) ?? null)
                      }
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
                    >
                      <option value="">Select option…</option>
                      {product?.variants.map((v) => (
                        <option key={v.id} value={v.id}>{v.option || v.description}</option>
                      ))}
                    </select>
                  )}

                  {/* Manual item name + supplier */}
                  {it.mode === "manual" && (
                    <input
                      value={it.itemName}
                      onChange={(e) => updateItem(idx, { itemName: e.target.value })}
                      placeholder="Item name"
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  )}
                </div>

                {/* Selected product detail (code + pack) */}
                {it.mode === "catalogue" && selectedVariant && (
                  <p className="mt-2 text-xs text-gray-500">
                    <span className="font-medium text-gray-700">Code {selectedVariant.code || "—"}</span>
                    {selectedVariant.packSize ? ` · ${selectedVariant.packSize}` : ""}
                    {selectedVariant.option ? ` · ${selectedVariant.option}` : ""}
                    <span className="block text-gray-400">{selectedVariant.description}</span>
                  </p>
                )}

                <div className="mt-2 grid grid-cols-12 gap-2 items-center">
                  {it.mode === "manual" && (
                    <select
                      value={it.supplier}
                      onChange={(e) => updateItem(idx, { supplier: e.target.value })}
                      className="col-span-6 sm:col-span-3 rounded-lg border border-gray-200 px-2 py-2 text-sm bg-white"
                    >
                      {SUPPLIERS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  )}
                  {it.mode === "manual" && (
                    <input
                      value={it.code}
                      onChange={(e) => updateItem(idx, { code: e.target.value })}
                      placeholder="Product code"
                      aria-label="Product code"
                      className="col-span-6 sm:col-span-2 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  )}
                  <input
                    type="number"
                    min={1}
                    value={it.qty}
                    onChange={(e) => updateItem(idx, { qty: Number(e.target.value) })}
                    placeholder="Qty"
                    aria-label="Quantity"
                    className="col-span-4 sm:col-span-2 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                  <input
                    value={it.notes}
                    onChange={(e) => updateItem(idx, { notes: e.target.value })}
                    placeholder="Notes (optional)"
                    className={`${it.mode === "manual" ? "col-span-7 sm:col-span-4" : "col-span-7 sm:col-span-9"} rounded-lg border border-gray-200 px-3 py-2 text-sm`}
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
              </div>
            );
          })}
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
                  <StageBadge label={ORDER_REQUEST_STATUS_META[req.status]?.label ?? req.status} accent={ORDER_REQUEST_STATUS_META[req.status]?.accent ?? "slate"} />
                  <button
                    type="button"
                    onClick={() => loadItems(req.items, req.branch_slug)}
                    className="text-xs font-medium text-teal-600 hover:underline"
                  >
                    Reorder
                  </button>
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
              {/* Delivery feedback (status + dates; never prices). */}
              {req.status === "received" && req.delivered_at ? (
                <p className="mb-2 text-xs font-medium text-green-700">
                  ✓ Delivered {fmtDate(req.delivered_at)}
                </p>
              ) : req.status === "ordered" && req.expected_delivery_date ? (
                <p className="mb-2 text-xs font-medium text-blue-700">
                  ⏱ Expected delivery: {fmtDate(req.expected_delivery_date)}
                </p>
              ) : req.status === "ordered" ? (
                <p className="mb-2 text-xs text-gray-400">Ordered — delivery date to be confirmed.</p>
              ) : null}
              <ul className="text-sm text-gray-700 space-y-0.5">
                {req.items.map((it, i) => (
                  <li key={i}>
                    {it.qty}× {it.item_name}
                    {it.code ? <span className="text-gray-400"> · code {it.code}</span> : null}
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
  );
}
