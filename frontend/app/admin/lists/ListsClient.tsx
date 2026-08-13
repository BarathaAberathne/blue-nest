"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Pencil, X, Check } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { branchShortName } from "@/lib/branch";
import { groupByBranch } from "@/lib/group";
import type { Branch, TaxonomyTerm, TaxonomyInput } from "@/types";

// The configurable lists an authorised user can curate. Add a category here (and
// a backend TaxonomyCategory constant) to expose a new tag list.
const CATEGORIES: { key: string; label: string; hasTimes: boolean; hasAges: boolean; help: string }[] = [
  { key: "session_type", label: "Weekly session slots", hasTimes: true, hasAges: false, help: "The AM/PM/full-day slots children can be booked into." },
  { key: "age_group", label: "Age groups", hasTimes: false, hasAges: true, help: "The age bands used for occupancy breakdowns and room age ranges. Bounds are in months; leave Max at 0 for an unbounded top band (e.g. 3+ years)." },
  { key: "allergy_type", label: "Allergy types", hasTimes: false, hasAges: false, help: "Allergy tags selectable on a child's profile." },
  { key: "dietary_label", label: "Dietary labels", hasTimes: false, hasAges: false, help: "Dietary tags selectable on a child's profile." },
  { key: "send_category", label: "SEND areas of need", hasTimes: false, hasAges: false, help: "Broad areas of need selectable on a child's SEND/additional-support profile." },
];

const blankForm: TaxonomyInput = { category: "session_type", branch_slug: "", label: "", code: "", start_time: "", end_time: "", min_age_months: 0, max_age_months: 0, active: true };

export default function ListsClient() {
  const [cat, setCat] = useState(CATEGORIES[0]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [terms, setTerms] = useState<TaxonomyTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<TaxonomyInput>(blankForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    try {
      const [b, t] = await Promise.all([api.adminGetBranches(token), api.adminGetTaxonomy(token, cat.key)]);
      setBranches(b ?? []);
      setTerms(t ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load lists");
    } finally {
      setLoading(false);
    }
  }, [cat.key]);

  useEffect(() => { void load(); }, [load]);

  const branchLabel = useMemo(() => {
    const m = new Map(branches.map((b) => [b.slug, branchShortName(b)]));
    return (slug: string) => (slug ? m.get(slug) ?? slug : "Org-wide (all branches)");
  }, [branches]);

  const groups = useMemo(
    () => groupByBranch(terms, (t) => t.branch_slug || "", (t) => t.label, branchLabel),
    [terms, branchLabel],
  );

  const openAdd = () => { setEditId(null); setForm({ ...blankForm, category: cat.key }); setShowForm(true); };
  const openEdit = (t: TaxonomyTerm) => {
    setEditId(t.id);
    setForm({ category: t.category, branch_slug: t.branch_slug ?? "", label: t.label, code: t.code, start_time: t.start_time ?? "", end_time: t.end_time ?? "", min_age_months: t.min_age_months ?? 0, max_age_months: t.max_age_months ?? 0, active: t.active });
    setShowForm(true);
  };

  const save = async () => {
    const token = getAccessToken();
    if (!token || !form.label.trim()) { setError("Label is required."); return; }
    setSaving(true); setError(null);
    try {
      if (editId) await api.adminUpdateTaxonomy(token, editId, form);
      else await api.adminCreateTaxonomy(token, form);
      setShowForm(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally { setSaving(false); }
  };

  const remove = async (t: TaxonomyTerm) => {
    const token = getAccessToken();
    if (!token || !confirm(`Delete "${t.label}"? Existing records keep the code but it won't be selectable.`)) return;
    try { await api.adminDeleteTaxonomy(token, t.id); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to delete"); }
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-slate-900">Configurable lists</h1>
        <p className="text-sm text-slate-500">Curate the dropdown options used across the app — per branch or org-wide.</p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button key={c.key} onClick={() => setCat(c)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${cat.key === c.key ? "bg-teal-600 text-white" : "border border-slate-200 text-slate-700 hover:bg-slate-50"}`}>
            {c.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs text-slate-500">{cat.help}</p>
        <button onClick={openAdd} className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700"><Plus className="h-4 w-4" /> Add option</button>
      </div>

      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">{error}</p>}
      {loading ? <p className="text-sm text-slate-400">Loading…</p> : groups.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">No options yet. Add the first one.</p>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <div key={g.branch || "__org"}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{branchLabel(g.branch)}</h2>
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                    <tr><th className="px-4 py-2">Label</th><th className="px-4 py-2">Code</th>{cat.hasTimes && <th className="px-4 py-2">Times</th>}{cat.hasAges && <th className="px-4 py-2">Age band</th>}<th className="px-4 py-2">Status</th><th className="px-4 py-2 text-right">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {g.items.map((t) => (
                      <tr key={t.id} className={t.active ? "" : "opacity-50"}>
                        <td className="px-4 py-2.5 font-medium text-slate-900">{t.label}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{t.code}</td>
                        {cat.hasTimes && <td className="px-4 py-2.5 text-slate-500">{t.start_time && t.end_time ? `${t.start_time}–${t.end_time}` : "—"}</td>}
                        {cat.hasAges && <td className="px-4 py-2.5 text-slate-500">{`${t.min_age_months ?? 0}–${t.max_age_months ? t.max_age_months : "∞"} mo`}</td>}
                        <td className="px-4 py-2.5">{t.active ? <span className="inline-flex items-center gap-1 text-green-600"><Check className="h-3.5 w-3.5" /> Active</span> : <span className="text-slate-400">Inactive</span>}</td>
                        <td className="px-4 py-2.5 text-right">
                          <button onClick={() => openEdit(t)} className="mr-2 text-slate-400 hover:text-teal-600" aria-label="Edit"><Pencil className="h-4 w-4" /></button>
                          <button onClick={() => remove(t)} className="text-slate-400 hover:text-red-600" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-heading text-lg font-bold text-slate-900">{editId ? "Edit" : "Add"} {cat.label.toLowerCase()}</h2>
              <button onClick={() => setShowForm(false)} aria-label="Close" className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <label className="block"><span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Label *</span>
                <input value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="e.g. AM (8am–1pm)" /></label>
              <label className="block"><span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Branch</span>
                <select value={form.branch_slug} onChange={(e) => setForm((f) => ({ ...f, branch_slug: e.target.value }))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                  <option value="">Org-wide (all branches)</option>
                  {branches.map((b) => <option key={b.slug} value={b.slug}>{branchShortName(b)}</option>)}
                </select></label>
              {cat.hasTimes && (
                <div className="grid grid-cols-2 gap-3">
                  <label className="block"><span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Start</span>
                    <input type="time" value={form.start_time} onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>
                  <label className="block"><span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">End</span>
                    <input type="time" value={form.end_time} onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>
                </div>
              )}
              {cat.hasAges && (
                <div className="grid grid-cols-2 gap-3">
                  <label className="block"><span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Min age (months)</span>
                    <input type="number" min={0} value={form.min_age_months ?? 0} onChange={(e) => setForm((f) => ({ ...f, min_age_months: Number(e.target.value) }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>
                  <label className="block"><span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Max age (months)</span>
                    <input type="number" min={0} value={form.max_age_months ?? 0} onChange={(e) => setForm((f) => ({ ...f, max_age_months: Number(e.target.value) }))} placeholder="0 = no upper limit" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>
                </div>
              )}
              <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={form.active ?? true} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} /> Active (selectable)</label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={save} disabled={saving} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
