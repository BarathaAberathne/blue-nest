"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import type { Category, Product } from "@/types";

type ProductForm = {
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  pricePounds: string;
  stockQty: string;
  imageUrl: string;
  isActive: boolean;
};

function formatPrice(pence: number) {
  return `£${(pence / 100).toFixed(2)}`;
}

function toForm(product: Product): ProductForm {
  return {
    name: product.name,
    slug: product.slug,
    description: product.description,
    categoryId: product.category_id ?? "",
    pricePounds: (product.price / 100).toFixed(2),
    stockQty: String(product.stock_qty),
    imageUrl: product.image_url ?? "",
    isActive: product.is_active,
  };
}

export default function AdminProductsClient() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>({
    name: "",
    slug: "",
    description: "",
    categoryId: "",
    pricePounds: "",
    stockQty: "0",
    imageUrl: "",
    isActive: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<string | null>(null);

  const token = typeof window !== "undefined" ? getAccessToken() : "";

  const loadProducts = async () => {
    if (!token) {
      setError("Please sign in as admin first.");
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const [productsData, categoriesData] = await Promise.all([
        api.adminGetProducts(token),
        api.adminGetCategories(token),
      ]);
      setProducts(Array.isArray(productsData) ? (productsData as Product[]) : []);
      setCategories(Array.isArray(categoriesData) ? (categoriesData as Category[]) : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setEditing(null);
    setForm({
      name: "",
      slug: "",
      description: "",
      categoryId: "",
      pricePounds: "",
      stockQty: "0",
      imageUrl: "",
      isActive: true,
    });
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;

    const price = Math.round(Number.parseFloat(form.pricePounds || "0") * 100);
    const stock = Number.parseInt(form.stockQty || "0", 10);
    if (!Number.isFinite(price) || price < 0) {
      setError("Price must be a valid number");
      return;
    }

    setSaving(true);
    setError(null);

    const selectedCategory = categories.find((c) => c.id === form.categoryId);
    const payload = {
      external_id: editing?.external_id ?? "",
      sku: editing?.sku ?? "",
      slug: form.slug,
      name: form.name,
      description: form.description,
      price,
      currency: "gbp",
      category: selectedCategory?.name ?? "",
      category_id: form.categoryId || undefined,
      image_url: form.imageUrl,
      stock_qty: Number.isFinite(stock) ? stock : 0,
      is_active: form.isActive,
      branch_slugs: [],
    };

    try {
      if (editing) {
        await api.adminUpdateProduct(token, editing.id, payload);
      } else {
        await api.adminCreateProduct(token, payload);
      }
      await loadProducts();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!token) return;
    try {
      await api.adminDeleteProduct(token, id);
      await loadProducts();
      if (editing?.id === id) {
        resetForm();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete product");
    }
  };

  const onSelectUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!token) {
      setError("Please sign in as admin first.");
      return;
    }

    setUploading(true);
    setUploadResult(null);
    setError(null);

    try {
      const summary = await api.adminImportProducts(token, file);
      setUploadResult(
        `Imported ${summary.imported}, skipped ${summary.skipped}, failed ${summary.failed}`,
      );
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setUploading(false);
      if (event.target) event.target.value = "";
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-heading font-bold text-gray-900">Products</h1>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx"
            className="hidden"
            onChange={onSelectUpload}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn-primary text-sm py-2"
            disabled={uploading}
          >
            {uploading ? "Uploading..." : "Upload CSV/Excel"}
          </button>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
      {uploadResult && <p className="mb-4 text-sm text-green-700">{uploadResult}</p>}

      <form className="card p-5 mb-6 space-y-3" onSubmit={onSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Product name"
            required
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            value={form.slug}
            onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
            placeholder="product-slug"
            required
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <select
            value={form.categoryId}
            onChange={(e) => setForm((prev) => ({ ...prev, categoryId: e.target.value }))}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
          >
            <option value="">— Select category —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input
            value={form.pricePounds}
            onChange={(e) => setForm((prev) => ({ ...prev, pricePounds: e.target.value }))}
            placeholder="Price in GBP (e.g. 12.99)"
            required
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            value={form.stockQty}
            onChange={(e) => setForm((prev) => ({ ...prev, stockQty: e.target.value }))}
            placeholder="Stock qty"
            required
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            value={form.imageUrl}
            onChange={(e) => setForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
            placeholder="Image URL"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
        <textarea
          value={form.description}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Description"
          rows={3}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
          />
          Active
        </label>
        <div className="flex gap-2">
          <button type="submit" className="btn-primary text-sm py-2" disabled={saving}>
            {saving ? "Saving..." : editing ? "Update Product" : "Create Product"}
          </button>
          {editing && (
            <button type="button" className="btn-outline text-sm py-2" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
            <tr>
              {["Name", "Category", "Price", "Stock", "Status", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-gray-500" colSpan={6}>Loading products...</td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-gray-500" colSpan={6}>No products found.</td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {categories.find((c) => c.id === p.category_id)?.name ?? p.category ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{formatPrice(p.price)}</td>
                  <td className="px-4 py-3 text-gray-700">{p.stock_qty}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.is_active ? "bg-brand-100 text-brand-700" : "bg-gray-100 text-gray-500"}`}>
                      {p.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex gap-3">
                    <button
                      type="button"
                      className="text-brand-600 hover:underline text-xs"
                      onClick={() => {
                        setEditing(p);
                        setForm(toForm(p));
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-red-600 hover:underline text-xs"
                      onClick={() => onDelete(p.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
