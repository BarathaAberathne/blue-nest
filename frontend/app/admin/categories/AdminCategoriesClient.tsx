"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import type { Category } from "@/types";

export default function AdminCategoriesClient() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [editing, setEditing] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = typeof window !== "undefined" ? getAccessToken() : "";

  const loadCategories = async () => {
    if (!token) {
      setError("Please sign in as admin first.");
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const data = await api.adminGetCategories(token) as Category[];
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setEditing(null);
    setName("");
    setSlug("");
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;

    setSaving(true);
    setError(null);

    try {
      const payload = { name, slug };
      if (editing) {
        await api.adminUpdateCategory(token, editing.id, payload);
      } else {
        await api.adminCreateCategory(token, payload);
      }
      await loadCategories();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save category");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!token) return;
    try {
      await api.adminDeleteCategory(token, id);
      await loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete category");
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-heading font-bold text-gray-900">Categories</h1>
      </div>

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

      <form className="card p-5 mb-6 grid grid-cols-1 md:grid-cols-3 gap-3" onSubmit={onSubmit}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Category name"
          required
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="category-slug"
          required
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <div className="flex gap-2">
          <button type="submit" className="btn-primary text-sm py-2" disabled={saving}>
            {saving ? "Saving..." : editing ? "Update Category" : "Create Category"}
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
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Slug</th>
              <th className="px-4 py-3 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-gray-500" colSpan={3}>Loading categories...</td>
              </tr>
            ) : categories.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-gray-500" colSpan={3}>No categories found.</td>
              </tr>
            ) : (
              categories.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-gray-600">{c.slug}</td>
                  <td className="px-4 py-3 flex gap-3">
                    <button
                      type="button"
                      className="text-brand-600 hover:underline text-xs"
                      onClick={() => {
                        setEditing(c);
                        setName(c.name);
                        setSlug(c.slug);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-red-600 hover:underline text-xs"
                      onClick={() => onDelete(c.id)}
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
