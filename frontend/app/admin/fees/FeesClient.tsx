"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Save } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import type { Branch, FeeBranchConfig, FeeConfigInput, FeeMeta, FeeSessionRate } from "@/types";

// Session lengths shown as columns, in fee-schedule order.
const SESSIONS: { key: string; label: string }[] = [
  { key: "full_day", label: "Full day" },
  { key: "morning", label: "Morning" },
  { key: "afternoon", label: "Afternoon" },
  { key: "school", label: "School day" },
];
const FUNDED_BANDS: { key: string; label: string }[] = [
  { key: "below3", label: "Under 3" },
  { key: "above3", label: "3 and over" },
];

const branchLabel = (slug: string) =>
  slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

// Deep-ish clone of a branch config so edits don't mutate the fetched object.
function cloneBranch(b: FeeBranchConfig): FeeConfigInput {
  return {
    ageGroups: JSON.parse(JSON.stringify(b.ageGroups ?? {})),
    earlyBird: b.earlyBird ?? 0,
    stdFunded: JSON.parse(JSON.stringify(b.stdFunded ?? {})),
  };
}

export default function FeesClient() {
  const token = typeof window !== "undefined" ? getAccessToken() : "";
  const [branches, setBranches] = useState<Record<string, FeeBranchConfig>>({});
  const [meta, setMeta] = useState<FeeMeta>({ note: "" });
  const [selected, setSelected] = useState<string>("");
  const [draft, setDraft] = useState<FeeConfigInput | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const [orgBranchSlugs, setOrgBranchSlugs] = useState<string[]>([]);

  // A fresh, editable schedule for a branch that has no fee config yet: reuse
  // an already-configured branch's age-band keys so the org stays consistent,
  // else fall back to the canonical calculator bands.
  const emptyDraft = useCallback((configured: Record<string, FeeBranchConfig>): FeeConfigInput => {
    const firstConfigured = Object.keys(configured).sort()[0];
    const bands = firstConfigured ? Object.keys(configured[firstConfigured].ageGroups ?? {}) : ["0-2", "2-3", "3-5"];
    const ageGroups: FeeConfigInput["ageGroups"] = {};
    for (const b of bands.length ? bands : ["0-2", "2-3", "3-5"]) ageGroups[b] = {};
    return { ageGroups, earlyBird: 0, stdFunded: {} };
  }, []);

  const load = useCallback(async () => {
    if (!token) { setError("Not authenticated."); setLoading(false); return; }
    try {
      const [bundle, orgBranches] = await Promise.all([
        api.adminGetFeeConfig(token),
        api.adminGetBranches(token).catch(() => [] as Branch[]),
      ]);
      const b = bundle.branches ?? {};
      setBranches(b);
      setMeta(bundle.meta ?? { note: "" });
      const slugs = (orgBranches ?? []).map((br) => br.slug);
      setOrgBranchSlugs(slugs);
      const first = [...new Set([...Object.keys(b), ...slugs])].sort()[0] ?? "";
      setSelected(first);
      if (first) setDraft(b[first] ? cloneBranch(b[first]) : emptyDraft(b));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load fee config");
    } finally { setLoading(false); }
  }, [token, emptyDraft]);

  useEffect(() => { void load(); }, [load]);

  // Every real branch gets a tab, configured or not — a branch with no fee
  // config yet starts from an empty draft instead of being invisible.
  const branchKeys = useMemo(() => [...new Set([...Object.keys(branches), ...orgBranchSlugs])].sort(), [branches, orgBranchSlugs]);
  const ageGroupKeys = useMemo(() => Object.keys(draft?.ageGroups ?? {}).sort(), [draft]);

  const pickBranch = (slug: string) => {
    setSelected(slug);
    setDraft(branches[slug] ? cloneBranch(branches[slug]) : emptyDraft(branches));
    setSaved(null);
  };

  const setRate = (ag: string, session: string, field: keyof FeeSessionRate, value: number) => {
    setDraft((d) => {
      if (!d) return d;
      const ageGroups = { ...d.ageGroups };
      const row = { ...(ageGroups[ag] ?? {}) };
      row[session] = { ...(row[session] ?? { daily: 0, weekly: 0 }), [field]: value };
      ageGroups[ag] = row;
      return { ...d, ageGroups };
    });
  };
  const setFunded = (band: string, session: string, value: number) => {
    setDraft((d) => {
      if (!d) return d;
      const stdFunded = { ...d.stdFunded };
      stdFunded[band] = { ...(stdFunded[band] ?? {}), [session]: value };
      return { ...d, stdFunded };
    });
  };

  const saveBranch = async () => {
    if (!token || !selected || !draft) return;
    setSaving(true); setError(null); setSaved(null);
    try {
      const updated = await api.adminUpdateFeeBranch(token, selected, draft);
      setBranches((b) => ({ ...b, [selected]: updated }));
      setSaved(`Saved ${branchLabel(selected)} rates`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally { setSaving(false); }
  };

  const saveMeta = async () => {
    if (!token) return;
    setSaving(true); setError(null); setSaved(null);
    try {
      await api.adminUpdateFeeMeta(token, meta);
      setSaved("Saved ancillary pricing");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally { setSaving(false); }
  };

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>;

  return (
    <>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-slate-900">Fees &amp; funding</h1>
        <p className="text-sm text-slate-500">The per-branch rates that power the public fee calculator. Prices in £.</p>
      </div>

      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">{error}</p>}
      {saved && <p className="mb-4 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-700">{saved}</p>}

      {/* Branch selector */}
      <div className="mb-4 flex flex-wrap gap-2">
        {branchKeys.map((slug) => (
          <button key={slug} onClick={() => pickBranch(slug)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${selected === slug ? "bg-teal-600 text-white" : "border border-slate-200 text-slate-700 hover:bg-slate-50"}`}>
            {branchLabel(slug)}
          </button>
        ))}
      </div>

      {draft && (
        <div className="space-y-6">
          {/* Session rates per age group */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-2">Age group</th>
                  {SESSIONS.map((s) => <th key={s.key} className="px-4 py-2 text-right">{s.label} (daily / weekly)</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ageGroupKeys.map((ag) => (
                  <tr key={ag}>
                    <td className="px-4 py-2.5 font-medium text-slate-900">{ag}</td>
                    {SESSIONS.map((s) => {
                      const r = draft.ageGroups[ag]?.[s.key] ?? { daily: 0, weekly: 0 };
                      return (
                        <td key={s.key} className="px-4 py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            <input type="number" min={0} value={r.daily} onChange={(e) => setRate(ag, s.key, "daily", Number(e.target.value))} className="w-16 rounded border border-slate-200 px-2 py-1 text-right text-sm" />
                            <span className="text-slate-300">/</span>
                            <input type="number" min={0} value={r.weekly} onChange={(e) => setRate(ag, s.key, "weekly", Number(e.target.value))} className="w-16 rounded border border-slate-200 px-2 py-1 text-right text-sm" />
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Early bird + funded top-up rates */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-4">
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Early-bird surcharge (£/day)</span>
                <input type="number" min={0} value={draft.earlyBird} onChange={(e) => setDraft((d) => d && { ...d, earlyBird: Number(e.target.value) })} className="w-32 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              </label>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                  <tr><th className="px-4 py-2">Funded top-up (£/hr)</th>{SESSIONS.map((s) => <th key={s.key} className="px-4 py-2 text-right">{s.label}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {FUNDED_BANDS.map((band) => (
                    <tr key={band.key}>
                      <td className="px-4 py-2.5 font-medium text-slate-900">{band.label}</td>
                      {SESSIONS.map((s) => (
                        <td key={s.key} className="px-4 py-2.5 text-right">
                          <input type="number" min={0} value={draft.stdFunded[band.key]?.[s.key] ?? 0} onChange={(e) => setFunded(band.key, s.key, Number(e.target.value))} className="w-16 rounded border border-slate-200 px-2 py-1 text-right text-sm" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={saveBranch} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"><Save className="h-4 w-4" /> {saving ? "Saving…" : `Save ${branchLabel(selected)} rates`}</button>
          </div>
        </div>
      )}

      {/* Org-wide ancillary pricing + disclaimer */}
      <div className="mt-10 rounded-xl border border-slate-200 p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">Ancillary pricing (all branches)</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm"><span className="mb-1 block text-xs font-medium text-slate-500">Extra hour (£)</span>
            <input type="number" min={0} value={meta.extraHour ?? 0} onChange={(e) => setMeta((m) => ({ ...m, extraHour: Number(e.target.value) }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>
          <label className="block text-sm"><span className="mb-1 block text-xs font-medium text-slate-500">Session swap (£)</span>
            <input type="number" min={0} value={meta.swapSession ?? 0} onChange={(e) => setMeta((m) => ({ ...m, swapSession: Number(e.target.value) }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>
          <label className="block text-sm"><span className="mb-1 block text-xs font-medium text-slate-500">Late fee (£/min)</span>
            <input type="number" min={0} value={meta.lateFeePerMinute ?? 0} onChange={(e) => setMeta((m) => ({ ...m, lateFeePerMinute: Number(e.target.value) }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>
        </div>
        <label className="mt-4 block text-sm"><span className="mb-1 block text-xs font-medium text-slate-500">Calculator disclaimer</span>
          <textarea value={meta.note} onChange={(e) => setMeta((m) => ({ ...m, note: e.target.value }))} rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>
        <div className="mt-4 flex justify-end">
          <button onClick={saveMeta} disabled={saving} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><Save className="h-4 w-4" /> Save ancillary pricing</button>
        </div>
      </div>
    </>
  );
}
