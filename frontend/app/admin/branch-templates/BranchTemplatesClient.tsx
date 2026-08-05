"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, LayoutTemplate, Pencil, Plus, Trash2, Wand2, X } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { branchShortName } from "@/lib/branch";
import type { Branch, BranchTemplate, BranchTemplateInput, BranchTemplateRoom } from "@/types";

const emptyRoom: BranchTemplateRoom = { name: "", code: "", age_range: "", min_age_months: 0, max_age_months: 0, capacity: 0, staff_ratio: 0 };
const emptyForm: BranchTemplateInput = { name: "", description: "", rooms: [] };

export default function BranchTemplatesClient() {
  const token = typeof window !== "undefined" ? getAccessToken() : "";
  const [templates, setTemplates] = useState<BranchTemplate[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<BranchTemplateInput>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [applyFor, setApplyFor] = useState<BranchTemplate | null>(null);
  const [applyBranch, setApplyBranch] = useState("");
  const [captureBranch, setCaptureBranch] = useState("");
  const [captureName, setCaptureName] = useState("");

  const load = useCallback(async () => {
    if (!token) { setError("Not authenticated."); setLoading(false); return; }
    try {
      const [t, b] = await Promise.all([api.adminGetBranchTemplates(token), api.adminGetBranches(token)]);
      setTemplates(t ?? []);
      setBranches(b ?? []);
      setError(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load templates"); }
    finally { setLoading(false); }
  }, [token]);
  useEffect(() => { void load(); }, [load]);

  const openAdd = () => { setEditId(null); setForm({ ...emptyForm, rooms: [{ ...emptyRoom }] }); setShowForm(true); };
  const openEdit = (t: BranchTemplate) => {
    setEditId(t.id);
    setForm({ name: t.name, description: t.description ?? "", rooms: t.rooms.map((r) => ({ ...r })) });
    setShowForm(true);
  };
  const setRoom = (i: number, patch: Partial<BranchTemplateRoom>) =>
    setForm((f) => ({ ...f, rooms: f.rooms.map((r, j) => (j === i ? { ...r, ...patch } : r)) }));
  const addRoom = () => setForm((f) => ({ ...f, rooms: [...f.rooms, { ...emptyRoom }] }));
  const removeRoom = (i: number) => setForm((f) => ({ ...f, rooms: f.rooms.filter((_, j) => j !== i) }));

  const save = async () => {
    if (!token || !form.name.trim()) { setError("Name is required."); return; }
    setSaving(true); setError(null);
    try {
      const clean = { ...form, rooms: form.rooms.filter((r) => r.name.trim()) };
      if (editId) await api.adminUpdateBranchTemplate(token, editId, clean);
      else await api.adminCreateBranchTemplate(token, clean);
      setShowForm(false); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to save"); }
    finally { setSaving(false); }
  };

  const remove = async (t: BranchTemplate) => {
    if (!token || !confirm(`Delete template "${t.name}"?`)) return;
    try { await api.adminDeleteBranchTemplate(token, t.id); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to delete"); }
  };

  const doApply = async () => {
    if (!token || !applyFor || !applyBranch) return;
    setSaving(true); setError(null); setMsg(null);
    try {
      const res = await api.adminApplyBranchTemplate(token, applyFor.id, applyBranch);
      setMsg(`Applied "${applyFor.name}" to ${applyBranch}: ${res.rooms_created} room(s) created${res.skipped?.length ? `, ${res.skipped.length} skipped (already exist)` : ""}.`);
      setApplyFor(null); setApplyBranch("");
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to apply"); }
    finally { setSaving(false); }
  };

  const doCapture = async () => {
    if (!token || !captureBranch || !captureName.trim()) return;
    setSaving(true); setError(null); setMsg(null);
    try {
      await api.adminCreateBranchTemplateFromBranch(token, captureBranch, captureName.trim());
      setMsg(`Captured template "${captureName}" from ${captureBranch}.`);
      setCaptureBranch(""); setCaptureName(""); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to capture"); }
    finally { setSaving(false); }
  };

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>;

  return (
    <>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">Branch templates</h1>
          <p className="text-sm text-slate-500">Reusable room layouts to spin up a new branch in one step.</p>
        </div>
        <button onClick={openAdd} className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700"><Plus className="h-4 w-4" /> New template</button>
      </div>

      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">{error}</p>}
      {msg && <p className="mb-4 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-700">{msg}</p>}

      {templates.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">No templates yet. Create one, or capture one from an existing branch below.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <div key={t.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-start justify-between">
                <div className="flex items-center gap-2"><LayoutTemplate className="h-4 w-4 text-teal-600" /><span className="font-semibold text-slate-900">{t.name}</span></div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(t)} className="text-slate-400 hover:text-teal-600" aria-label="Edit"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => remove(t)} className="text-slate-400 hover:text-red-600" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              {t.description && <p className="mb-2 text-xs text-slate-500">{t.description}</p>}
              <p className="text-xs text-slate-500">{t.rooms.length} room{t.rooms.length === 1 ? "" : "s"}: {t.rooms.map((r) => r.name).join(", ") || "-"}</p>
              <button onClick={() => { setApplyFor(t); setApplyBranch(""); }} className="mt-3 inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"><Wand2 className="h-3.5 w-3.5" /> Apply to branch</button>
            </div>
          ))}
        </div>
      )}

      {/* Capture from an existing branch */}
      <div className="mt-8 rounded-xl border border-slate-200 p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500"><Copy className="h-4 w-4" /> Capture template from a branch</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm"><span className="mb-1 block text-xs text-slate-500">Branch</span>
            <select value={captureBranch} onChange={(e) => setCaptureBranch(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
              <option value="">Select…</option>{branches.map((b) => <option key={b.slug} value={b.slug}>{branchShortName(b)}</option>)}
            </select></label>
          <label className="text-sm"><span className="mb-1 block text-xs text-slate-500">New template name</span>
            <input value={captureName} onChange={(e) => setCaptureName(e.target.value)} placeholder="e.g. Standard 4-room" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>
          <button onClick={doCapture} disabled={saving || !captureBranch || !captureName.trim()} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50">Capture</button>
        </div>
      </div>

      {/* Apply modal */}
      {applyFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setApplyFor(null)}>
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-1 font-heading text-lg font-bold text-slate-900">Apply “{applyFor.name}”</h2>
            <p className="mb-4 text-sm text-slate-500">Creates {applyFor.rooms.length} room(s) on the chosen branch. Existing rooms with the same name are skipped.</p>
            <select value={applyBranch} onChange={(e) => setApplyBranch(e.target.value)} className="mb-4 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
              <option value="">Select branch…</option>{branches.map((b) => <option key={b.slug} value={b.slug}>{branchShortName(b)}</option>)}
            </select>
            <div className="flex justify-end gap-2">
              <button onClick={() => setApplyFor(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={doApply} disabled={saving || !applyBranch} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">Apply</button>
            </div>
          </div>
        </div>
      )}

      {/* Create/edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setShowForm(false)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-heading text-lg font-bold text-slate-900">{editId ? "Edit" : "New"} template</h2>
              <button onClick={() => setShowForm(false)} aria-label="Close" className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm"><span className="mb-1 block text-xs font-medium text-slate-500">Name *</span>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>
              <label className="text-sm"><span className="mb-1 block text-xs font-medium text-slate-500">Description</span>
                <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Rooms</span>
                <button onClick={addRoom} className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700"><Plus className="h-3.5 w-3.5" /> Add room</button>
              </div>
              <div className="space-y-2">
                {form.rooms.map((r, i) => (
                  <div key={i} className="grid grid-cols-12 items-center gap-2">
                    <input value={r.name} onChange={(e) => setRoom(i, { name: e.target.value })} placeholder="Room name" className="col-span-3 rounded border border-slate-200 px-2 py-1 text-sm" />
                    <input value={r.age_range ?? ""} onChange={(e) => setRoom(i, { age_range: e.target.value })} placeholder="Age label" className="col-span-3 rounded border border-slate-200 px-2 py-1 text-sm" />
                    <input type="number" min={0} value={r.capacity ?? 0} onChange={(e) => setRoom(i, { capacity: Number(e.target.value) })} placeholder="Cap" className="col-span-2 rounded border border-slate-200 px-2 py-1 text-sm" title="Capacity" />
                    <input type="number" min={0} value={r.staff_ratio ?? 0} onChange={(e) => setRoom(i, { staff_ratio: Number(e.target.value) })} placeholder="1:x" className="col-span-2 rounded border border-slate-200 px-2 py-1 text-sm" title="Staff ratio 1:x" />
                    <button onClick={() => removeRoom(i)} className="col-span-2 justify-self-end text-slate-400 hover:text-red-600" aria-label="Remove room"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
                {form.rooms.length === 0 && <p className="text-xs text-slate-400">No rooms. Add at least one.</p>}
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={save} disabled={saving} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">{saving ? "Saving…" : "Save template"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
