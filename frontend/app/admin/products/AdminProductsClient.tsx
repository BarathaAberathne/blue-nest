"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import type { Category, Product } from "@/types";

const AGE_SIZES = ["2 years", "3-4 years", "5-6 years"];

type ProductForm = {
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  pricePounds: string;
  stockQty: string;
  reorderPoint: string;
  imageUrls: string[];
  isActive: boolean;
  sizes: string[];
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
    reorderPoint: String(product.reorder_point ?? 100),
    imageUrls: product.image_urls?.length
      ? product.image_urls
      : product.image_url
      ? [product.image_url]
      : [],
    isActive: product.is_active,
    sizes: product.sizes ?? [],
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
    reorderPoint: "100",
    imageUrls: [],
    isActive: true,
    sizes: [],
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
      reorderPoint: "100",
      imageUrls: [],
      isActive: true,
      sizes: [],
    });
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;

    const price = Math.round(Number.parseFloat(form.pricePounds || "0") * 100);
    const stock = Number.parseInt(form.stockQty || "0", 10);
    const reorderPoint = Number.parseInt(form.reorderPoint || "100", 10);
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
      image_url: form.imageUrls[0] ?? "",
      image_urls: form.imageUrls,
      stock_qty: Number.isFinite(stock) ? stock : 0,
      reorder_point: Number.isFinite(reorderPoint) ? reorderPoint : 100,
      is_active: form.isActive,
      sizes: form.sizes,
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

  const onImageFile = async (event: ChangeEvent<HTMLInputElement>, idx: number) => {
    const file = event.target.files?.[0];
    if (!file || !token) return;
    setUploading(true);
    setError(null);
    try {
      const result = await api.adminUploadImage(token, file) as { url: string };
      setForm((prev) => {
        const next = [...prev.imageUrls];
        next[idx] = result.url;
        return { ...prev, imageUrls: next };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploading(false);
      if (event.target) event.target.value = "";
    }
  };

  const removeImage = (idx: number) =>
    setForm((prev) => ({ ...prev, imageUrls: prev.imageUrls.filter((_, i) => i !== idx) }));

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
            value={form.reorderPoint}
            onChange={(e) => setForm((prev) => ({ ...prev, reorderPoint: e.target.value }))}
            placeholder="Reorder point (default 100)"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-2">Product images (up to 3)</p>
          <div className="flex gap-2 flex-wrap">
            {[0, 1, 2].map((idx) => {
              const url = form.imageUrls[idx];
              const isDisabled = idx > 0 && !form.imageUrls[idx - 1];
              return (
                <div
                  key={idx}
                  className="relative w-24 h-24 rounded-lg border border-dashed border-gray-300 overflow-hidden bg-gray-50 flex items-center justify-center"
                >
                  {url ? (
                    <>
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-0.5 right-0.5 bg-white rounded-full w-5 h-5 text-[0.65rem] flex items-center justify-center text-red-500 shadow border border-gray-100 leading-none"
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <label className={`cursor-pointer flex flex-col items-center gap-0.5 text-xs text-gray-400 ${isDisabled ? "pointer-events-none opacity-40" : ""}`}>
                      <span className="text-xl leading-none">+</span>
                      <span>Image {idx + 1}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploading || isDisabled}
                        onChange={(e) => void onImageFile(e, idx)}
                      />
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <textarea
          value={form.description}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Description"
          rows={3}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-1">Age sizes (clothing products)</p>
          <div className="flex gap-3 flex-wrap">
            {AGE_SIZES.map((size) => (
              <label key={size} className="inline-flex items-center gap-1.5 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.sizes.includes(size)}
                  onChange={(e) => setForm((prev) => ({
                    ...prev,
                    sizes: e.target.checked
                      ? [...prev.sizes, size]
                      : prev.sizes.filter((s) => s !== size),
                  }))}
                />
                {size}
              </label>
            ))}
          </div>
        </div>
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
              {["Name", "Category", "Price", "Stock", "Reorder pt", "Status", "Actions"].map((h) => (
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
              products.map((p) => {
                const rp = p.reorder_point ?? 100;
                const isLowStock = p.stock_qty < rp;
                return (
                  <tr
                    key={p.id}
                    className={isLowStock ? "bg-red-50 hover:bg-red-100" : "hover:bg-gray-50"}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {isLowStock && (
                        <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-red-500 align-middle" />
                      )}
                      {p.name}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {categories.find((c) => c.id === p.category_id)?.name ?? p.category ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{formatPrice(p.price)}</td>
                    <td className={`px-4 py-3 font-medium ${isLowStock ? "text-red-600" : "text-gray-700"}`}>
                      {p.stock_qty}
                      {isLowStock && <span className="ml-1 text-[0.65rem] font-bold text-red-400">LOW</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{rp}</td>
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
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
