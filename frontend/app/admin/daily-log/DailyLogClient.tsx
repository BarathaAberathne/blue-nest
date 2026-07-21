"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, CheckCircle2, Download, HeartPulse, Plus, Search, ShieldAlert, TriangleAlert, Utensils, X } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken, scopedBranches } from "@/lib/auth";
import { branchShortName } from "@/lib/branch";
import { fmtDate } from "@/lib/child";
import { dailyStatusAccent, dailyStatusLabel, dailyTypeAccent, dailyTypeLabel, severityAccent, EYFS_AREAS } from "@/lib/daily";
import StatCard from "@/components/admin/ui/StatCard";
import StageBadge from "@/components/admin/ui/StageBadge";
import type { Branch, Child, DailyRecord, DailyRecordInput, DailyRecordType, DailyStats } from "@/types";

const TYPES: DailyRecordType[] = ["observation", "incident", "safeguarding", "medication", "meal"];

const emptyForm: DailyRecordInput = {
  type: "observation", child_id: "", branch_slug: "", title: "", detail: "", date: "",
  severity: "medium", eyfs_areas: [], next_steps: "", medication: "", dose: "", meal_type: "lunch", eaten: "most",
};

export default function DailyLogClient() {
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [typeFilter, setTypeFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [q, setQ] = useState("");

  const [form, setForm] = useState<DailyRecordInput>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const token = getAccessToken();
    if (!token) { setError("Not authenticated — please sign in as admin."); setLoading(false); return; }
    const [r, s, b, c] = await Promise.allSettled([
      api.adminGetDailyRecords(token, { type: typeFilter, branch: branchFilter, q, limit: 500 }),
      api.adminGetDailyStats(token),
      api.getBranches(),
      api.adminGetChildren(token),
    ]);
    if (r.status === "fulfilled") setRecords((r.value as DailyRecord[]) ?? []);
    if (s.status === "fulfilled") setStats(s.value as DailyStats);
    if (b.status === "fulfilled") setBranches(scopedBranches((b.value as Branch[]) ?? []));
    if (c.status === "fulfilled") setChildren((c.value as Child[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, [typeFilter, branchFilter, q]);

  const branchName = useMemo(() => {
    const m = new Map(branches.map((b) => [b.slug, branchShortName(b)]));
    return (slug: string) => m.get(slug) ?? slug;
  }, [branches]);

  const childrenForBranch = useMemo(
    () => children.filter((c) => !form.branch_slug || c.branch_slug === form.branch_slug),
    [children, form.branch_slug],
  );

  const openCreate = () => {
    setForm({ ...emptyForm, branch_slug: branchFilter || branches[0]?.slug || "", eyfs_areas: [] });
    setShowForm(true);
  };

  const save = async () => {
    const token = getAccessToken();
    if (!token || !form.title.trim() || !form.branch_slug) { setError("Title and branch are required."); return; }
    setSaving(true); setError(null);
    try {
      await api.adminCreateDailyRecord(token, form);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save record");
    } finally { setSaving(false); }
  };

  const setStatus = async (rec: DailyRecord, status: string) => {
    const token = getAccessToken();
    if (!token) return;
    setBusy(rec.id); setError(null);
    try { await api.adminSetDailyRecordStatus(token, rec.id, status); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Action failed"); }
    finally { setBusy(null); }
  };

  const exportCsv = () => {
    const header = ["Ref", "Type", "Child", "Branch", "Title", "Date", "Status", "Severity"];
    const lines = records.map((r) => [
      r.ref ?? "", r.type, r.child_name ?? "", branchName(r.branch_slug), r.title, r.date, r.status, r.severity ?? "",
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `daily-log-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const setField = (patch: Partial<DailyRecordInput>) => setForm((f) => ({ ...f, ...patch }));
  const toggleArea = (area: string) => setForm((f) => {
    const cur = f.eyfs_areas ?? [];
    return { ...f, eyfs_areas: cur.includes(area) ? cur.filter((a) => a !== area) : [...cur, area] };
  });

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">Daily log</h1>
          <p className="text-sm text-slate-500">Observations, incidents, safeguarding, medication &amp; meals — the practitioner record that feeds the Command Centre &amp; Ofsted view.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><Download className="h-4 w-4" /> CSV</button>
          <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700"><Plus className="h-4 w-4" /> Add record</button>
        </div>
      </div>

      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">{error}</p>}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Safeguarding open" value={stats?.safeguarding_open ?? "—"} icon={ShieldAlert} accent="red" />
        <StatCard label="Incidents today" value={stats?.incidents_today ?? "—"} icon={TriangleAlert} accent="orange" />
        <StatCard label="Medication due" value={stats?.medication_due ?? "—"} icon={HeartPulse} accent="violet" />
        <StatCard label="Meals served" value={stats?.meals_served ?? "—"} icon={Utensils} accent="green" />
        <StatCard label="Observations" value={stats?.observations_week ?? "—"} sub="last 7 days" icon={BookOpen} accent="sky" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => setTypeFilter("")} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${typeFilter === "" ? "bg-teal-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>All</button>
          {TYPES.map((t) => (
            <button key={t} type="button" onClick={() => setTypeFilter(t)} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${typeFilter === t ? "bg-teal-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{dailyTypeLabel[t]}</button>
          ))}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, child, ref…" className="rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-sm" />
        </div>
        <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="">All branches</option>
          {branches.map((b) => <option key={b.slug} value={b.slug}>{branchShortName(b)}</option>)}
        </select>
        <span className="ml-auto text-sm text-slate-400">{records.length} shown</span>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr>{["Ref", "Type", "Child", "Branch", "Title", "Date", "Status", ""].map((h) => <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-6 text-slate-400">Loading…</td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-400">No records match.</td></tr>
            ) : records.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.ref ?? "—"}</td>
                <td className="px-4 py-3"><StageBadge label={dailyTypeLabel[r.type]} accent={dailyTypeAccent[r.type]} withDot={false} /></td>
                <td className="px-4 py-3 text-slate-700">{r.child_name || "—"}</td>
                <td className="px-4 py-3 text-slate-500">{branchName(r.branch_slug)}</td>
                <td className="px-4 py-3 text-slate-800">
                  {r.title}
                  {r.severity && <span className="ml-2 align-middle"><StageBadge label={r.severity} accent={severityAccent[r.severity] ?? "slate"} withDot={false} /></span>}
                </td>
                <td className="px-4 py-3 text-slate-500">{fmtDate(r.date)}</td>
                <td className="px-4 py-3"><StageBadge label={dailyStatusLabel[r.status]} accent={dailyStatusAccent[r.status]} withDot={r.status === "open"} /></td>
                <td className="px-4 py-3 text-right">
                  {r.status === "open" && (r.type === "safeguarding" || r.type === "incident") && (
                    <button type="button" disabled={busy === r.id} onClick={() => setStatus(r, "resolved")} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"><CheckCircle2 className="h-3.5 w-3.5" /> Resolve</button>
                  )}
                  {r.status === "open" && r.type === "medication" && (
                    <button type="button" disabled={busy === r.id} onClick={() => setStatus(r, "administered")} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"><CheckCircle2 className="h-3.5 w-3.5" /> Administer</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-auto rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-lg font-heading font-bold text-slate-900">Add daily record</h2>
              <button type="button" onClick={() => setShowForm(false)} aria-label="Close" className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
              <Field label="Type *">
                <select value={form.type} onChange={(e) => setField({ type: e.target.value as DailyRecordType })} className="inp bg-white">
                  {TYPES.map((t) => <option key={t} value={t}>{dailyTypeLabel[t]}</option>)}
                </select>
              </Field>
              <Field label="Branch *">
                <select value={form.branch_slug} onChange={(e) => setField({ branch_slug: e.target.value, child_id: "" })} className="inp bg-white">
                  <option value="">Select branch…</option>
                  {branches.map((b) => <option key={b.slug} value={b.slug}>{branchShortName(b)}</option>)}
                </select>
              </Field>
              <Field label="Child (optional)">
                <select value={form.child_id} onChange={(e) => setField({ child_id: e.target.value })} className="inp bg-white" disabled={!form.branch_slug}>
                  <option value="">Branch-wide / none</option>
                  {childrenForBranch.map((c) => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                </select>
              </Field>
              <Field label="Date"><input type="date" value={form.date} onChange={(e) => setField({ date: e.target.value })} className="inp" /></Field>
              <div className="sm:col-span-2"><Field label="Title *"><input value={form.title} onChange={(e) => setField({ title: e.target.value })} placeholder={form.type === "observation" ? "e.g. Counting to 20" : form.type === "medication" ? "e.g. Calpol" : "Short summary"} className="inp" /></Field></div>

              {(form.type === "incident" || form.type === "safeguarding") && (
                <Field label="Severity">
                  <select value={form.severity} onChange={(e) => setField({ severity: e.target.value })} className="inp bg-white">
                    <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                  </select>
                </Field>
              )}
              {form.type === "medication" && (
                <>
                  <Field label="Medication"><input value={form.medication} onChange={(e) => setField({ medication: e.target.value })} className="inp" /></Field>
                  <Field label="Dose"><input value={form.dose} onChange={(e) => setField({ dose: e.target.value })} placeholder="e.g. 5ml" className="inp" /></Field>
                </>
              )}
              {form.type === "meal" && (
                <>
                  <Field label="Meal">
                    <select value={form.meal_type} onChange={(e) => setField({ meal_type: e.target.value })} className="inp bg-white">
                      <option value="breakfast">Breakfast</option><option value="lunch">Lunch</option><option value="snack">Snack</option><option value="tea">Tea</option>
                    </select>
                  </Field>
                  <Field label="Amount eaten">
                    <select value={form.eaten} onChange={(e) => setField({ eaten: e.target.value })} className="inp bg-white">
                      <option value="all">All</option><option value="most">Most</option><option value="some">Some</option><option value="none">None</option>
                    </select>
                  </Field>
                </>
              )}
              {form.type === "observation" && (
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs uppercase tracking-wider text-slate-400">EYFS areas</label>
                  <div className="flex flex-wrap gap-2">
                    {EYFS_AREAS.map((a) => {
                      const on = (form.eyfs_areas ?? []).includes(a);
                      return <button key={a} type="button" onClick={() => toggleArea(a)} className={`rounded-full px-3 py-1 text-xs font-medium ${on ? "bg-sky-100 text-sky-700" : "border border-slate-200 text-slate-500 hover:bg-slate-50"}`}>{a}</button>;
                    })}
                  </div>
                </div>
              )}

              <div className="sm:col-span-2"><Field label="Detail"><textarea value={form.detail} onChange={(e) => setField({ detail: e.target.value })} rows={2} className="inp" /></Field></div>
              {form.type === "observation" && (
                <div className="sm:col-span-2"><Field label="Next steps"><textarea value={form.next_steps} onChange={(e) => setField({ next_steps: e.target.value })} rows={2} className="inp" /></Field></div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={save} disabled={saving} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">{saving ? "Saving…" : "Add record"}</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        :global(.inp) { width: 100%; border-radius: 0.5rem; border: 1px solid rgb(226 232 240); padding: 0.5rem 0.75rem; font-size: 0.875rem; }
      `}</style>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs uppercase tracking-wider text-slate-400">{label}</label>
      {children}
    </div>
  );
}
