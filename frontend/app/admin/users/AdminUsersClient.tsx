"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import type { User } from "@/types";

type AdminUserPayload = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: "admin" | "branch_manager";
};

export default function AdminUsersClient() {
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState<AdminUserPayload>({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    role: "admin",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = typeof window !== "undefined" ? getAccessToken() : "";

  const loadUsers = async () => {
    if (!token) {
      setError("Please sign in as admin first.");
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const data = await api.adminGetUsers(token) as User[];
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load admin users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;

    setSaving(true);
    setError(null);

    try {
      await api.adminCreateUser(token, form);
      await loadUsers();
      setForm({
        email: "",
        password: "",
        first_name: "",
        last_name: "",
        role: "admin",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create admin user");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-heading font-bold text-gray-900">Admin Users</h1>
      </div>

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

      <form className="card p-5 mb-6 grid grid-cols-1 md:grid-cols-3 gap-3" onSubmit={onSubmit}>
        <input
          required
          value={form.first_name}
          onChange={(e) => setForm((prev) => ({ ...prev, first_name: e.target.value }))}
          placeholder="First name"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <input
          required
          value={form.last_name}
          onChange={(e) => setForm((prev) => ({ ...prev, last_name: e.target.value }))}
          placeholder="Last name"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <input
          required
          type="email"
          value={form.email}
          onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          placeholder="Email"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <input
          required
          minLength={8}
          type="password"
          value={form.password}
          onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
          placeholder="Temporary password"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <select
          value={form.role}
          onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value as "admin" | "branch_manager" }))}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
        >
          <option value="admin">admin</option>
          <option value="branch_manager">branch_manager</option>
        </select>
        <button type="submit" className="btn-primary text-sm py-2" disabled={saving}>
          {saving ? "Creating..." : "Create Admin User"}
        </button>
      </form>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="px-4 py-3 text-left font-medium">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-gray-500" colSpan={3}>Loading users...</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-gray-500" colSpan={3}>No admin users found.</td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900 font-medium">{`${user.first_name} ${user.last_name}`}</td>
                  <td className="px-4 py-3 text-gray-700">{user.email}</td>
                  <td className="px-4 py-3 text-gray-600">{user.role}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
