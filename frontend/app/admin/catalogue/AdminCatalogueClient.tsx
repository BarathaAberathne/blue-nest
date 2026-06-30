"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import type { CatalogueItem, CatalogueOffer } from "@/types";

const SUPPLIERS = ["Gompels", "Amazon", "Other"];

// Offer row in the form — price held as a £ string for editing.
type OfferDraft = {
  supplier: string;
  code: string;
  pack_size: string;
  price: string; // pounds
};

type FormState = {
  id: string | null;
  name: string;
  category: string;
  is_active: boolean;
  offers: OfferDraft[];
};

const emptyOffer = (): OfferDraft => ({ supplier: "Gompels", code: "", pack_size: "", price: "" });
const emptyForm = (): FormState => ({ id: null, name: "", category: "", is_active: true, offers: [emptyOffer()] });

const poundsToPence = (s: string) => Math.round(parseFloat(s || "0") * 100) || 0;
const penceToPounds = (p: number) => (p / 100).toFixed(2);

function cheapest(item: CatalogueItem): CatalogueOffer | null {
  if (!item.offers?.length) return null;
  return [...item.offers].sort((a, b) => (a.price_per_unit || a.price) - (b.price_per_unit || b.price))[0];
}

export default function AdminCatalogueClient() {
  const [items, setItems] = useState<CatalogueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<FormState>(emptyForm());

  const token = typeof window !== "undefined" ? getAccessToken() : "";

  const load = async () => {
    if (!token) {
      setError("Please sign in as admin first.");
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const data = (await api.adminGetCatalogue(token)) as CatalogueItem[];
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load catalogue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? items.filter((i) => i.name.toLowerCase().includes(q)) : items;
  }, [items, search]);

  const setOffer = (idx: number, patch: Partial<OfferDraft>) =>
    setForm((f) => ({ ...f, offers: f.offers.map((o, i) => (i === idx ? { ...o, ...patch } : o)) }));
  const addOffer = () => setForm((f) => ({ ...f, offers: [...f.offers, emptyOffer()] }));
  const removeOffer = (idx: number) =>
    setForm((f) => ({ ...f, offers: f.offers.length === 1 ? f.offers : f.offers.filter((_, i) => i !== idx) }));

  const editItem = (item: CatalogueItem) =>
    setForm({
      id: item.id,
      name: item.name,
      category: item.category ?? "",
      is_active: item.is_active,
      offers: item.offers.length
        ? item.offers.map((o) => ({ supplier: o.supplier, code: o.code, pack_size: o.pack_size ?? "", price: penceToPounds(o.price) }))
        : [emptyOffer()],
    });

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name,
      category: form.category,
      is_active: form.is_active,
      offers: form.offers
        .filter((o) => o.code.trim())
        .map((o) => ({ supplier: o.supplier, code: o.code.trim(), pack_size: o.pack_size.trim(), price: poundsToPence(o.price) })),
    };
    try {
      if (form.id) await api.adminUpdateCatalogueItem(token, form.id, payload);
      else await api.adminCreateCatalogueItem(token, payload);
      setForm(emptyForm());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save item");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!token || !window.confirm("Delete this catalogue item?")) return;
    try {
      await api.adminDeleteCatalogueItem(token, id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete item");
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">Catalogue</h1>
          <p className="text-sm text-gray-500">Known products + supplier codes/prices used to source carts.</p>
        </div>
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</p>}

      {/* ── Create / edit form ───────────────────────────────────────── */}
      <form className="card p-5 mb-6" onSubmit={onSubmit}>
        <p className="text-sm font-semibold text-gray-800 mb-3">{form.id ? "Edit item" : "Add item"}</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <input
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Item name"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            placeholder="Category (optional)"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            />
            Active
          </label>
        </div>

        <p className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-2">Supplier offers</p>
        <div className="space-y-2">
          {form.offers.map((o, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-center">
              <select
                value={o.supplier}
                onChange={(e) => setOffer(idx, { supplier: e.target.value })}
                className="col-span-3 rounded-lg border border-gray-200 px-2 py-2 text-sm bg-white"
              >
                {SUPPLIERS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <input
                value={o.code}
                onChange={(e) => setOffer(idx, { code: e.target.value })}
                placeholder="Code / ASIN"
                className="col-span-3 rounded-lg border border-gray-200 px-2 py-2 text-sm"
              />
              <input
                value={o.pack_size}
                onChange={(e) => setOffer(idx, { pack_size: e.target.value })}
                placeholder="Pack size"
                className="col-span-3 rounded-lg border border-gray-200 px-2 py-2 text-sm"
              />
              <input
                type="number"
                step="0.01"
                min="0"
                value={o.price}
                onChange={(e) => setOffer(idx, { price: e.target.value })}
                placeholder="£ price"
                className="col-span-2 rounded-lg border border-gray-200 px-2 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => removeOffer(idx)}
                disabled={form.offers.length === 1}
                className="col-span-1 flex items-center justify-center h-9 text-gray-400 hover:text-red-500 disabled:opacity-30"
                aria-label="Remove offer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addOffer} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700">
          <Plus className="h-4 w-4" /> Add offer
        </button>

        <div className="mt-4 flex gap-2">
          <button type="submit" className="btn-primary text-sm py-2 px-6" disabled={saving}>
            {saving ? "Saving…" : form.id ? "Update item" : "Add item"}
          </button>
          {form.id && (
            <button type="button" onClick={() => setForm(emptyForm())} className="text-sm text-gray-400 hover:underline">
              Cancel edit
            </button>
          )}
        </div>
      </form>

      {/* ── List ─────────────────────────────────────────────────────── */}
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search catalogue…"
        className="mb-3 w-full max-w-sm rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
      />
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
            <tr>
              {["Name", "Category", "Offers", "Cheapest", "Active", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-6 text-gray-500">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-6 text-gray-400">No catalogue items yet.</td></tr>
            ) : (
              filtered.map((item) => {
                const best = cheapest(item);
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900 font-medium">{item.name}</td>
                    <td className="px-4 py-3 text-gray-500">{item.category || "—"}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {item.offers.length
                        ? item.offers.map((o) => `${o.supplier} ${o.code}`).join(", ")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {best ? `£${penceToPounds(best.price)} (${best.supplier})` : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{item.is_active ? "Yes" : "No"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => editItem(item)} className="text-xs font-medium text-gray-500 hover:text-gray-900 hover:underline">Edit</button>
                        <button type="button" onClick={() => onDelete(item.id)} className="text-xs font-medium text-red-500 hover:underline">Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
