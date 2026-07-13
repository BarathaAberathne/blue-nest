"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Lock, Plus, Save, ShieldCheck, Trash2, X } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import type { PermissionInfo, RoleDefinition } from "@/types";

export default function RolesPanel() {
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [catalogue, setCatalogue] = useState<PermissionInfo[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openRole, setOpenRole] = useState<string | null>(null);
  const [draft, setDraft] = useState<Set<string>>(new Set());
  const [savingRole, setSavingRole] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  const load = async () => {
    const token = getAccessToken();
    if (!token) { setError("Not authenticated."); setLoading(false); return; }
    try {
      const r = await api.adminGetRoles(token);
      setRoles(r.roles ?? []); setCatalogue(r.catalogue ?? []); setCategories(r.categories ?? []);
    } catch { setError("Failed to load roles (super admin only)."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const byCategory = useMemo(() => {
    const m = new Map<string, PermissionInfo[]>();
    for (const c of categories) m.set(c, []);
    for (const p of catalogue) { if (!m.has(p.category)) m.set(p.category, []); m.get(p.category)!.push(p); }
    return m;
  }, [catalogue, categories]);

  const openEditor = (r: RoleDefinition) => {
    if (openRole === r.name) { setOpenRole(null); return; }
    setOpenRole(r.name);
    setDraft(new Set(r.permissions ?? []));
  };
  const toggle = (key: string) => setDraft((d) => { const n = new Set(d); n.has(key) ? n.delete(key) : n.add(key); return n; });

  const save = async (name: string) => {
    const token = getAccessToken();
    if (!token) return;
    setSavingRole(name); setError(null);
    try {
      await api.adminUpdateRolePermissions(token, name, [...draft]);
      await load();
      setOpenRole(null);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to save"); }
    finally { setSavingRole(null); }
  };

  const createRole = async () => {
    const token = getAccessToken();
    if (!token || !newLabel.trim()) return;
    setSavingRole("__new"); setError(null);
    try {
      await api.adminCreateRole(token, { name: newLabel, label: newLabel, permissions: ["dashboard.view"] });
      setNewLabel(""); setShowCreate(false);
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to create role"); }
    finally { setSavingRole(null); }
  };

  const remove = async (r: RoleDefinition) => {
    const token = getAccessToken();
    if (!token || !window.confirm(`Delete custom role “${r.label}”? Users on it lose their permissions.`)) return;
    try { await api.adminDeleteRole(token, r.name); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to delete"); }
  };

  if (loading) return null; // hidden for non-super-admins / while loading
  if (error && roles.length === 0) return null;

  return (
    <div className="mt-10">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-teal-600" />
          <h2 className="font-heading text-xl font-bold text-slate-900">Roles &amp; Permissions</h2>
        </div>
        <button type="button" onClick={() => setShowCreate((s) => !s)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><Plus className="h-4 w-4" /> Custom role</button>
      </div>
      <p className="mb-4 text-sm text-slate-500">Each role grants a set of permissions, grouped by area. Edits apply immediately to everyone on that role. Super Admin always has everything.</p>

      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">{error}</p>}

      {showCreate && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Custom role name, e.g. Weekend Cover" className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <button type="button" onClick={createRole} disabled={savingRole === "__new"} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">Create</button>
          <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg px-2 py-2 text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="space-y-2">
        {roles.map((r) => {
          const isSuper = r.name === "super_admin";
          const isOpen = openRole === r.name;
          return (
            <div key={r.name} className="card overflow-hidden">
              <button type="button" onClick={() => !isSuper && openEditor(r)} className={`flex w-full items-center gap-3 px-4 py-3 text-left ${isSuper ? "cursor-default" : "hover:bg-slate-50"}`}>
                <span className="font-medium text-slate-900">{r.label}</span>
                <span className="font-mono text-[0.7rem] text-slate-400">{r.name}</span>
                {r.is_custom && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[0.65rem] font-semibold text-violet-700">custom</span>}
                <span className="ml-auto text-xs text-slate-400">{isSuper ? "all permissions" : `${(r.permissions ?? []).length} permission${(r.permissions ?? []).length === 1 ? "" : "s"}`}</span>
                {isSuper ? <Lock className="h-4 w-4 text-slate-300" /> : <ChevronDown className={`h-4 w-4 text-slate-400 transition ${isOpen ? "rotate-180" : ""}`} />}
              </button>

              {isOpen && !isSuper && (
                <div className="border-t border-slate-100 p-4">
                  <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[...byCategory.entries()].filter(([, perms]) => perms.length > 0).map(([cat, perms]) => (
                      <div key={cat}>
                        <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">{cat}</p>
                        <div className="space-y-1.5">
                          {perms.map((p) => (
                            <label key={p.key} className="flex cursor-pointer items-start gap-2 text-sm text-slate-600">
                              <input type="checkbox" checked={draft.has(p.key)} onChange={() => toggle(p.key)} className="mt-0.5 h-4 w-4 rounded" />
                              {p.label}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    {r.is_custom ? (
                      <button type="button" onClick={() => remove(r)} className="inline-flex items-center gap-1.5 text-xs font-medium text-red-500 hover:text-red-700"><Trash2 className="h-3.5 w-3.5" /> Delete role</button>
                    ) : <span />}
                    <button type="button" onClick={() => save(r.name)} disabled={savingRole === r.name} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"><Save className="h-4 w-4" /> {savingRole === r.name ? "Saving…" : "Save permissions"}</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
