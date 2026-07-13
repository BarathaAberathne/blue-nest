"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Eye, EyeOff, LayoutDashboard, Maximize2, Minimize2, Plus, Save, Trash2, X } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { DASHBOARD_WIDGETS, DASHBOARD_WIDGET_KEYS, DASHBOARD_WIDGET_TITLES } from "@/lib/dashboard-widgets";
import type { DashboardProfile, DashboardWidget, UserRole } from "@/types";

// A complete, ordered widget set for editing (fills in any widgets the saved
// profile is missing so every widget is togglable).
function normaliseWidgets(saved: DashboardWidget[]): DashboardWidget[] {
  const bySaved = new Map(saved.map((w) => [w.key, w]));
  const ordered = saved.filter((w) => DASHBOARD_WIDGET_KEYS.includes(w.key));
  const missing = DASHBOARD_WIDGET_KEYS.filter((k) => !bySaved.has(k)).map((k) => ({ key: k, hidden: false, size: "normal" as const }));
  return [...ordered, ...missing];
}

export default function DashboardProfilesPanel() {
  const [profiles, setProfiles] = useState<DashboardProfile[]>([]);
  const [roles, setRoles] = useState<{ role: UserRole; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [savingSlug, setSavingSlug] = useState<string | null>(null);

  // Draft state for the open editor.
  const [draftName, setDraftName] = useState("");
  const [draftDesc, setDraftDesc] = useState("");
  const [draftWidgets, setDraftWidgets] = useState<DashboardWidget[]>([]);
  const [draftRoles, setDraftRoles] = useState<Set<string>>(new Set());

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");

  const load = async () => {
    const token = getAccessToken();
    if (!token) { setError("Not authenticated."); setLoading(false); return; }
    try {
      const r = await api.adminGetDashboardProfiles(token);
      setProfiles(r.profiles ?? []); setRoles(r.roles ?? []);
    } catch { setError("Failed to load dashboard profiles (super admin only)."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  // role → the profile slug it currently defaults to (for showing conflicts).
  const roleAssignment = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of profiles) for (const role of p.default_for_roles ?? []) m.set(String(role), p.slug);
    return m;
  }, [profiles]);

  const openEditor = (p: DashboardProfile) => {
    if (openSlug === p.slug) { setOpenSlug(null); return; }
    setOpenSlug(p.slug);
    setDraftName(p.name);
    setDraftDesc(p.description ?? "");
    setDraftWidgets(normaliseWidgets(p.widgets ?? []));
    setDraftRoles(new Set((p.default_for_roles ?? []).map(String)));
  };

  const toggleHidden = (key: string) => setDraftWidgets((ws) => ws.map((w) => (w.key === key ? { ...w, hidden: !w.hidden } : w)));
  const toggleSize = (key: string) => setDraftWidgets((ws) => ws.map((w) => (w.key === key ? { ...w, size: w.size === "wide" ? "normal" : "wide" } : w)));
  const move = (key: string, dir: -1 | 1) => setDraftWidgets((ws) => {
    const i = ws.findIndex((w) => w.key === key);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ws.length) return ws;
    const next = [...ws];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });
  const toggleRole = (role: string) => setDraftRoles((d) => { const n = new Set(d); n.has(role) ? n.delete(role) : n.add(role); return n; });

  const save = async (slug?: string) => {
    const token = getAccessToken();
    if (!token || !draftName.trim()) return;
    setSavingSlug(slug ?? "__new"); setError(null);
    try {
      await api.adminSaveDashboardProfile(token, {
        name: draftName.trim(),
        slug,
        description: draftDesc.trim(),
        widgets: draftWidgets,
        default_for_roles: [...draftRoles],
      });
      await load();
      setOpenSlug(null);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to save profile"); }
    finally { setSavingSlug(null); }
  };

  const createProfile = async () => {
    const token = getAccessToken();
    if (!token || !newName.trim()) return;
    setSavingSlug("__new"); setError(null);
    try {
      await api.adminSaveDashboardProfile(token, {
        name: newName.trim(),
        description: "",
        widgets: DASHBOARD_WIDGETS.map((w) => ({ key: w.key, hidden: false, size: "normal" as const })),
        default_for_roles: [],
      });
      setNewName(""); setShowCreate(false);
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to create profile"); }
    finally { setSavingSlug(null); }
  };

  const remove = async (p: DashboardProfile) => {
    const token = getAccessToken();
    if (!token || !window.confirm(`Delete dashboard profile “${p.name}”? Roles on it revert to the built-in default.`)) return;
    try { await api.adminDeleteDashboardProfile(token, p.slug); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to delete"); }
  };

  if (loading) return null; // hidden for non-super-admins / while loading
  if (error && profiles.length === 0 && roles.length === 0) return null;

  return (
    <div className="mt-10">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-5 w-5 text-teal-600" />
          <h2 className="font-heading text-xl font-bold text-slate-900">Dashboard Profiles</h2>
        </div>
        <button type="button" onClick={() => setShowCreate((s) => !s)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><Plus className="h-4 w-4" /> New profile</button>
      </div>
      <p className="mb-4 text-sm text-slate-500">Org-wide dashboard templates. Assign a profile as the default for one or more roles — anyone on that role who hasn&apos;t customised their own dashboard gets this arrangement. A role defaults to at most one profile.</p>

      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">{error}</p>}

      {showCreate && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Profile name, e.g. Executive" className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <button type="button" onClick={createProfile} disabled={savingSlug === "__new"} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">Create</button>
          <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg px-2 py-2 text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>
        </div>
      )}

      {profiles.length === 0 && !showCreate && (
        <p className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">No dashboard profiles yet. Create one to set a default layout per role.</p>
      )}

      <div className="space-y-2">
        {profiles.map((p) => {
          const isOpen = openSlug === p.slug;
          const assignedLabels = (p.default_for_roles ?? []).map((r) => roles.find((x) => x.role === r)?.label ?? String(r));
          return (
            <div key={p.slug} className="card overflow-hidden">
              <button type="button" onClick={() => openEditor(p)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50">
                <span className="font-medium text-slate-900">{p.name}</span>
                {assignedLabels.length > 0 && (
                  <span className="flex flex-wrap gap-1">
                    {assignedLabels.map((l) => <span key={l} className="rounded-full bg-teal-50 px-2 py-0.5 text-[0.65rem] font-semibold text-teal-700">{l}</span>)}
                  </span>
                )}
                <span className="ml-auto text-xs text-slate-400">{(p.widgets ?? []).filter((w) => !w.hidden).length} widget{(p.widgets ?? []).filter((w) => !w.hidden).length === 1 ? "" : "s"} shown</span>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition ${isOpen ? "rotate-180" : ""}`} />
              </button>

              {isOpen && (
                <div className="border-t border-slate-100 p-4">
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Details + roles */}
                    <div className="space-y-4">
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">Name</label>
                        <input value={draftName} onChange={(e) => setDraftName(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">Description</label>
                        <input value={draftDesc} onChange={(e) => setDraftDesc(e.target.value)} placeholder="Optional" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">Default for roles</p>
                        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                          {roles.map((r) => {
                            const other = roleAssignment.get(String(r.role));
                            const takenElsewhere = other && other !== p.slug && !draftRoles.has(String(r.role));
                            return (
                              <label key={r.role} className="flex cursor-pointer items-start gap-2 text-sm text-slate-600">
                                <input type="checkbox" checked={draftRoles.has(String(r.role))} onChange={() => toggleRole(String(r.role))} className="mt-0.5 h-4 w-4 rounded" />
                                <span>{r.label}{takenElsewhere && <span className="ml-1 text-[0.65rem] text-amber-600">(moves from another profile)</span>}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Widget arrangement */}
                    <div>
                      <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">Widgets</p>
                      <div className="space-y-1.5">
                        {draftWidgets.map((w, i) => (
                          <div key={w.key} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${w.hidden ? "border-slate-100 bg-slate-50 text-slate-400" : "border-slate-200 text-slate-700"}`}>
                            <div className="flex flex-col">
                              <button type="button" onClick={() => move(w.key, -1)} disabled={i === 0} className="text-slate-300 hover:text-slate-600 disabled:opacity-30"><ArrowUp className="h-3 w-3" /></button>
                              <button type="button" onClick={() => move(w.key, 1)} disabled={i === draftWidgets.length - 1} className="text-slate-300 hover:text-slate-600 disabled:opacity-30"><ArrowDown className="h-3 w-3" /></button>
                            </div>
                            <span className="flex-1">{DASHBOARD_WIDGET_TITLES[w.key] ?? w.key}</span>
                            <button type="button" onClick={() => toggleSize(w.key)} title="Toggle width" className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                              {w.size === "wide" ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                            </button>
                            <button type="button" onClick={() => toggleHidden(w.key)} title={w.hidden ? "Show" : "Hide"} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                              {w.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <button type="button" onClick={() => remove(p)} className="inline-flex items-center gap-1.5 text-xs font-medium text-red-500 hover:text-red-700"><Trash2 className="h-3.5 w-3.5" /> Delete profile</button>
                    <button type="button" onClick={() => save(p.slug)} disabled={savingSlug === p.slug} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"><Save className="h-4 w-4" /> {savingSlug === p.slug ? "Saving…" : "Save profile"}</button>
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
