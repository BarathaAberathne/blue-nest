"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Pencil, X } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { branchShortName } from "@/lib/branch";
import { groupByBranch } from "@/lib/group";
import type { Branch, Term, TermInput } from "@/types";

const blankForm: TermInput = { branch_slug: "", name: "", start_date: "", end_date: "" };

export default function TermsClient() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<TermInput>(blankForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    try {
      const [b, t] = await Promise.all([api.adminGetBranches(token), api.adminGetTerms(token)]);
      setBranches(b ?? []);
      setTerms(t ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load terms");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const branchLabel = useMemo(() => {
    const m = new Map(branches.map((b) => [b.slug, branchShortName(b)]));
    return (slug: string) => (slug ? m.get(slug) ?? slug : "Org-wide (all branches)");
  }, [branches]);

  const groups = useMemo(
    () => groupByBranch(terms, (t) => t.branch_slug || "", (t) => t.name, branchLabel),
    [terms, branchLabel],
  );

  const openAdd = () => { setEditId(null); setForm(blankForm); setShowForm(true); };
  const openEdit = (t: Term) => { setEditId(t.id); setForm({ branch_slug: t.branch_slug ?? "", name: t.name, start_date: t.start_date, end_date: t.end_date }); setShowForm(true); };

  const save = async () => {
    const token = getAccessToken();
    if (!token || !form.name.trim() || !form.start_date || !form.end_date) { setError("Name, start and end dates are required."); return; }
    setSaving(true); setError(null);
    try {
      if (editId) await api.adminUpdateTerm(token, editId, form);
      else await api.adminCreateTerm(token, form);
      setShowForm(false);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to save"); }
    finally { setSaving(false); }
  };

  const remove = async (t: Term) => {
    const token = getAccessToken();
    if (!token || !confirm(`Delete term "${t.name}"?`)) return;
    try { await api.adminDeleteTerm(token, t.id); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to delete"); }
  };

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">Term dates</h1>
          <p className="text-sm text-slate-500">Define term-time ranges per branch. Term-time-only staff are contracted for these dates.</p>
        </div>
        <button onClick={openAdd} className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700"><Plus className="h-4 w-4" /> Add term</button>
      </div>

      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">{error}</p>}
      {loading ? <p className="text-sm text-slate-400">Loading…</p> : groups.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">No terms yet. Add the first one.</p>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <div key={g.branch || "__org"}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{branchLabel(g.branch)}</h2>
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                    <tr><th className="px-4 py-2">Term</th><th className="px-4 py-2">Start</th><th className="px-4 py-2">End</th><th className="px-4 py-2 text-right">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {g.items.map((t) => (
                      <tr key={t.id}>
                        <td className="px-4 py-2.5 font-medium text-slate-900">{t.name}</td>
                        <td className="px-4 py-2.5 text-slate-500">{t.start_date}</td>
                        <td className="px-4 py-2.5 text-slate-500">{t.end_date}</td>
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
              <h2 className="font-heading text-lg font-bold text-slate-900">{editId ? "Edit" : "Add"} term</h2>
              <button onClick={() => setShowForm(false)} aria-label="Close" className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <label className="block"><span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Name *</span>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="e.g. Autumn Term 2026" /></label>
              <label className="block"><span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Branch</span>
                <select value={form.branch_slug} onChange={(e) => setForm((f) => ({ ...f, branch_slug: e.target.value }))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                  <option value="">Org-wide (all branches)</option>
                  {branches.map((b) => <option key={b.slug} value={b.slug}>{branchShortName(b)}</option>)}
                </select></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Start *</span>
                  <input type="date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>
                <label className="block"><span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">End *</span>
                  <input type="date" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>
              </div>
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
