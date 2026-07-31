"use client";

import { useEffect, useMemo, useState } from "react";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { branchShortName } from "@/lib/branch";
import { DAILY_TYPES, EYFS_AREAS, MEAL_TYPES, EATEN_OPTIONS, SEVERITIES, REPORTED_TO_OPTIONS, typeFields } from "@/lib/dailyLog";
import type { Branch, DailyRecordInput, DailyRecordType, Staff } from "@/types";

// A modal for submitting a daily log. When `child` is given the child/branch are
// fixed (child-profile "Add daily log"); otherwise a branch + free-text child
// name context is shown (the standalone daily-log page passes branches). Every
// submission enters the four-eyes approval queue (pending) — the UI says so.
export default function DailyLogForm({
  child,
  branches = [],
  defaultBranch = "",
  onClose,
  onSaved,
}: {
  child?: { id: string; name: string; branch_slug: string };
  branches?: Branch[];
  defaultBranch?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState<DailyRecordType>("observation");
  const [form, setForm] = useState<DailyRecordInput>({
    type: "observation",
    child_id: child?.id,
    branch_slug: child?.branch_slug || defaultBranch,
    title: "", detail: "", severity: "low", eyfs_areas: [], next_steps: "",
    action_taken: "", first_aid: "", witnesses: [], other_staff: [], parents_notified: "",
    other_notes: "", reported_to: [], medication: "", dose: "", admin_time: "",
    administered_by: "", parent_consent: false, meal_type: "lunch", eaten: "all", menu: "",
    attachments: [],
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);

  // Staff for the Witnesses / Other-staff-present pickers (branch-scoped).
  useEffect(() => {
    const token = getAccessToken();
    if (!token || !form.branch_slug) { setStaff([]); return; }
    let alive = true;
    api.adminGetStaff(token, { branch: form.branch_slug }).then((s) => { if (alive) setStaff(s ?? []); }).catch(() => { if (alive) setStaff([]); });
    return () => { alive = false; };
  }, [form.branch_slug]);
  const staffNames = useMemo(() => staff.map((s) => `${s.first_name} ${s.last_name}`), [staff]);

  const f = useMemo(() => typeFields(type), [type]);
  const set = (patch: Partial<DailyRecordInput>) => setForm((p) => ({ ...p, ...patch }));
  const pickType = (t: DailyRecordType) => { setType(t); set({ type: t }); };
  const toggleEyfs = (area: string) => set({ eyfs_areas: (form.eyfs_areas ?? []).includes(area) ? (form.eyfs_areas ?? []).filter((a) => a !== area) : [...(form.eyfs_areas ?? []), area] });
  const toggleArr = (field: "witnesses" | "other_staff" | "reported_to", v: string) =>
    set({ [field]: (form[field] ?? []).includes(v) ? (form[field] ?? []).filter((x) => x !== v) : [...(form[field] ?? []), v] } as Partial<DailyRecordInput>);

  const uploadImages = async (files: FileList | null) => {
    if (!files?.length) return;
    const token = getAccessToken();
    if (!token) return;
    setUploading(true); setError(null);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const res = await api.adminUploadImage(token, file);
        if (res?.url) urls.push(res.url);
      }
      set({ attachments: [...(form.attachments ?? []), ...urls] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Image upload failed");
    } finally { setUploading(false); }
  };

  const save = async () => {
    const token = getAccessToken();
    if (!token || !form.title.trim() || !form.branch_slug) { setError("Title and branch are required."); return; }
    const labels: Record<string, string> = { first_aid: "First aid administered", parents_notified: "When and how parents were notified" };
    for (const req of f.required ?? []) {
      if (!String(form[req] ?? "").trim()) { setError(`${labels[req]} is required.`); return; }
    }
    setSaving(true); setError(null);
    try {
      await api.adminCreateDailyRecord(token, { ...form, type });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="max-h-[88vh] w-full max-w-2xl overflow-auto rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-heading text-lg font-bold text-slate-900">Add daily log{child ? ` — ${child.name}` : ""}</h2>
            <p className="text-xs text-amber-600">Submitted logs go to a manager/EYFS lead for approval before they appear on the profile.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-4 p-5">
          {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">{error}</p>}

          {/* Type picker */}
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-500">Log type</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {DAILY_TYPES.map((t) => (
                <button type="button" key={t.value} onClick={() => pickType(t.value)}
                  className={`rounded-lg border px-2 py-2 text-center text-xs font-medium ${type === t.value ? "border-teal-500 bg-teal-50 text-teal-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                  title={t.blurb}>{t.label}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {!child && (
              <label className="block"><span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Branch *</span>
                <select value={form.branch_slug} onChange={(e) => set({ branch_slug: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                  <option value="">Select branch…</option>
                  {branches.map((b) => <option key={b.slug} value={b.slug}>{branchShortName(b)}</option>)}
                </select></label>
            )}
            <label className="block"><span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Title *</span>
              <input value={form.title} onChange={(e) => set({ title: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Short summary" /></label>
            <label className="block"><span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Date</span>
              <input type="date" value={form.date ?? ""} onChange={(e) => set({ date: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>
          </div>

          {/* Per-type fields */}
          {f.severity && (
            <label className="block"><span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Severity</span>
              <select value={form.severity} onChange={(e) => set({ severity: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select></label>
          )}
          {f.medication && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block"><span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Medication</span>
                <input value={form.medication} onChange={(e) => set({ medication: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="e.g. Paracetamol" /></label>
              <label className="block"><span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Dose</span>
                <input value={form.dose} onChange={(e) => set({ dose: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="e.g. 5ml" /></label>
              <label className="block"><span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Time given</span>
                <input type="time" value={form.admin_time} onChange={(e) => set({ admin_time: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>
              <label className="block"><span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Administered by</span>
                <input value={form.administered_by} onChange={(e) => set({ administered_by: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>
              <label className="col-span-full flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={form.parent_consent ?? false} onChange={(e) => set({ parent_consent: e.target.checked })} /> Parent consent obtained</label>
            </div>
          )}
          {f.meal && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <label className="block"><span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Meal</span>
                <select value={form.meal_type} onChange={(e) => set({ meal_type: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">{MEAL_TYPES.map((m) => <option key={m} value={m}>{m}</option>)}</select></label>
              <label className="block"><span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Amount eaten</span>
                <select value={form.eaten} onChange={(e) => set({ eaten: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">{EATEN_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}</select></label>
              <label className="block"><span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Menu</span>
                <input value={form.menu} onChange={(e) => set({ menu: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="What was served" /></label>
            </div>
          )}

          <label className="block"><span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">{f.detailLabel}{type === "incident" ? " *" : ""}</span>
            <textarea value={form.detail} onChange={(e) => set({ detail: e.target.value })} rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>

          {f.firstAid && (
            <label className="block"><span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">First aid administered *</span>
              <input value={form.first_aid} onChange={(e) => set({ first_aid: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>
          )}
          {(f.witnesses || f.otherStaff) && staffNames.length === 0 && (
            <p className="text-xs text-slate-400">Select a branch to choose witnesses / staff present.</p>
          )}
          {f.witnesses && staffNames.length > 0 && (
            <div><span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Witnesses</span>
              <div className="flex flex-wrap gap-1.5">{staffNames.map((n) => { const on = (form.witnesses ?? []).includes(n); return <button type="button" key={n} onClick={() => toggleArr("witnesses", n)} className={`rounded-full px-2.5 py-1 text-xs font-medium ${on ? "bg-sky-100 text-sky-700" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{n}</button>; })}</div>
            </div>
          )}
          {f.otherStaff && staffNames.length > 0 && (
            <div><span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Other staff present</span>
              <div className="flex flex-wrap gap-1.5">{staffNames.map((n) => { const on = (form.other_staff ?? []).includes(n); return <button type="button" key={n} onClick={() => toggleArr("other_staff", n)} className={`rounded-full px-2.5 py-1 text-xs font-medium ${on ? "bg-teal-100 text-teal-700" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{n}</button>; })}</div>
            </div>
          )}
          {f.parentsNotified && (
            <label className="block"><span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">When and how were parents notified *</span>
              <textarea value={form.parents_notified} onChange={(e) => set({ parents_notified: e.target.value })} rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>
          )}

          {f.eyfs && (
            <div><span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">EYFS areas</span>
              <div className="flex flex-wrap gap-1.5">
                {EYFS_AREAS.map((a) => {
                  const on = (form.eyfs_areas ?? []).includes(a);
                  return <button type="button" key={a} onClick={() => toggleEyfs(a)} className={`rounded-full px-2.5 py-1 text-xs font-medium ${on ? "bg-violet-100 text-violet-700" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{a}</button>;
                })}
              </div>
            </div>
          )}
          {f.nextSteps && (
            <label className="block"><span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Next steps</span>
              <textarea value={form.next_steps} onChange={(e) => set({ next_steps: e.target.value })} rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>
          )}
          {f.actionTaken && (
            <label className="block"><span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Action taken</span>
              <textarea value={form.action_taken} onChange={(e) => set({ action_taken: e.target.value })} rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>
          )}
          {f.reportedTo && (
            <div><span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Reported to <span className="normal-case text-slate-400">(not visible to parents)</span></span>
              <div className="flex flex-wrap gap-3">
                {REPORTED_TO_OPTIONS.map((o) => (
                  <label key={o} className="flex items-center gap-1.5 text-sm text-slate-700">
                    <input type="checkbox" checked={(form.reported_to ?? []).includes(o)} onChange={() => toggleArr("reported_to", o)} /> {o}
                  </label>
                ))}
              </div>
            </div>
          )}
          {f.otherNotes && (
            <label className="block"><span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Other notes</span>
              <textarea value={form.other_notes} onChange={(e) => set({ other_notes: e.target.value })} rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>
          )}

          {/* Attachments */}
          <div>
            <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Photos</span>
            <div className="flex flex-wrap items-center gap-2">
              {(form.attachments ?? []).map((url) => (
                <div key={url} className="relative h-16 w-16 overflow-hidden rounded-lg border border-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="attachment" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => set({ attachments: (form.attachments ?? []).filter((u) => u !== url) })} className="absolute right-0 top-0 rounded-bl bg-black/50 px-1 text-white" aria-label="Remove">×</button>
                </div>
              ))}
              <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border border-dashed border-slate-300 text-slate-400 hover:bg-slate-50">
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => uploadImages(e.target.files)} />
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
          <button type="button" onClick={save} disabled={saving || uploading} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">{saving ? "Submitting…" : "Submit for approval"}</button>
        </div>
      </div>
    </div>
  );
}
