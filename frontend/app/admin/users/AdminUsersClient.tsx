"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import type { User, UserRole } from "@/types";

type Role = UserRole;

const ROLE_BADGE: Record<Role, string> = {
  super_admin: "bg-rose-100 text-rose-700",
  admin: "bg-purple-100 text-purple-700",
  branch_manager: "bg-blue-100 text-blue-700",
  staff: "bg-emerald-100 text-emerald-700",
  customer: "bg-gray-100 text-gray-600",
};

type CreatePayload = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: Role;
};

type EditState = {
  id: string;
  first_name: string;
  last_name: string;
  role: Role;
};

const ROLES: Role[] = ["staff", "branch_manager", "admin", "super_admin", "customer"];

export default function AdminUsersClient() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);

  const [form, setForm] = useState<CreatePayload>({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    role: "customer",
  });

  const token = typeof window !== "undefined" ? getAccessToken() : "";

  const loadUsers = async () => {
    if (!token) {
      setError("Please sign in as admin first.");
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const data = (await api.adminGetUsers(token)) as User[];
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      await api.adminCreateUser(token, form);
      await loadUsers();
      setForm({ email: "", password: "", first_name: "", last_name: "", role: "customer" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  const onSaveEdit = async () => {
    if (!token || !editState) return;
    setSaving(true);
    setError(null);
    try {
      await api.adminUpdateUser(token, editState.id, {
        first_name: editState.first_name,
        last_name: editState.last_name,
        role: editState.role,
      });
      setEditState(null);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  const onResetPassword = async (id: string) => {
    if (!token) return;
    const pw = window.prompt("Enter a new password for this user (min 8 characters):");
    if (!pw) return;
    if (pw.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setError(null);
    try {
      await api.adminResetPassword(token, id, pw);
      window.alert("Password updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    }
  };

  const onDelete = async (id: string) => {
    if (!token) return;
    if (!window.confirm("Delete this user? This cannot be undone.")) return;
    setDeletingId(id);
    setError(null);
    try {
      await api.adminDeleteUser(token, id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-heading font-bold text-gray-900">Users</h1>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
      )}

      {/* ── Create user form ───────────────────────────────────────── */}
      <form
        className="card p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
        onSubmit={onCreate}
      >
        <input
          required
          value={form.first_name}
          onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))}
          placeholder="First name"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <input
          required
          value={form.last_name}
          onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))}
          placeholder="Last name"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <input
          required
          type="email"
          value={form.email}
          onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
          placeholder="Email"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <input
          required
          minLength={8}
          type="password"
          value={form.password}
          onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
          placeholder="Password (min 8 chars)"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <select
          value={form.role}
          onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as Role }))}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-primary text-sm py-2" disabled={saving}>
          {saving ? "Creating..." : "Create User"}
        </button>
      </form>

      {/* ── Users table ───────────────────────────────────────────── */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="px-4 py-3 text-left font-medium">Role</th>
              <th className="px-4 py-3 text-left font-medium">Joined</th>
              <th className="px-4 py-3 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-gray-500" colSpan={5}>
                  Loading users...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-gray-500" colSpan={5}>
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const isEditing = editState?.id === user.id;
                return (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900 font-medium">
                      {isEditing ? (
                        <div className="flex gap-1">
                          <input
                            value={editState.first_name}
                            onChange={(e) =>
                              setEditState((s) => s && { ...s, first_name: e.target.value })
                            }
                            className="w-24 rounded border border-gray-200 px-2 py-1 text-xs"
                          />
                          <input
                            value={editState.last_name}
                            onChange={(e) =>
                              setEditState((s) => s && { ...s, last_name: e.target.value })
                            }
                            className="w-24 rounded border border-gray-200 px-2 py-1 text-xs"
                          />
                        </div>
                      ) : (
                        `${user.first_name} ${user.last_name}`
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{user.email}</td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <select
                          value={editState.role}
                          onChange={(e) =>
                            setEditState((s) => s && { ...s, role: e.target.value as Role })
                          }
                          className="rounded border border-gray-200 px-2 py-1 text-xs bg-white"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            ROLE_BADGE[user.role as Role] ?? "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {user.role.replace("_", " ")}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString("en-GB")
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={onSaveEdit}
                              disabled={saving}
                              className="text-xs font-medium text-teal-600 hover:underline disabled:opacity-50"
                            >
                              {saving ? "Saving..." : "Save"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditState(null)}
                              className="text-xs font-medium text-gray-400 hover:underline"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                setEditState({
                                  id: user.id,
                                  first_name: user.first_name,
                                  last_name: user.last_name,
                                  role: user.role as Role,
                                })
                              }
                              className="text-xs font-medium text-gray-500 hover:text-gray-900 hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void onResetPassword(user.id)}
                              className="text-xs font-medium text-gray-500 hover:text-gray-900 hover:underline"
                            >
                              Reset password
                            </button>
                            <button
                              type="button"
                              onClick={() => onDelete(user.id)}
                              disabled={deletingId === user.id}
                              className="text-xs font-medium text-red-500 hover:underline disabled:opacity-50"
                            >
                              {deletingId === user.id ? "Deleting..." : "Delete"}
                            </button>
                          </>
                        )}
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
