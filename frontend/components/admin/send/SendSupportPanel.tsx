"use client";

// SEND / Additional Support card on the child profile — visible ONLY to
// send.manage holders (the caller gates rendering). Sensitive detail lives
// here and never in the child header; the header shows at most the restrained
// "Additional support" badge.

import { useCallback, useEffect, useState } from "react";
import { HeartHandshake, Pencil, X } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import StageBadge from "@/components/admin/ui/StageBadge";
import { sendPlanLabel, sendStatusAccent, sendStatusLabel } from "@/lib/send";
import type { ChildSendSupport, SendPlanStatus, SendStatus, Staff, TaxonomyTerm } from "@/types";

const STATUS_OPTIONS: { value: SendStatus; label: string }[] = [
  { value: "monitoring", label: "Monitoring — early concerns" },
  { value: "sen_support", label: "SEN support in place" },
  { value: "ehcp", label: "EHCP in place" },
  { value: "ended", label: "Support ended" },
];

const PLAN_OPTIONS: { value: SendPlanStatus; label: string }[] = [
  { value: "", label: "No support plan" },
  { value: "draft", label: "Plan drafted" },
  { value: "active", label: "Plan active" },
  { value: "ended", label: "Plan ended" },
];

export default function SendSupportPanel({ childId, branchSlug, onStatusChange }: {
  childId: string;
  branchSlug: string;
  onStatusChange?: (status: SendStatus) => void;
}) {
  const [profile, setProfile] = useState<ChildSendSupport | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [categories, setCategories] = useState<TaxonomyTerm[]>([]);
  const [draft, setDraft] = useState({
    status: "monitoring" as SendStatus,
    summary: "",
    categories: [] as string[],
    send_lead_staff_id: "",
    plan_status: "" as SendPlanStatus,
    review_date: "",
    start_date: "",
    end_date: "",
  });

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    try {
      const p = await api.adminGetSendSupport(token, childId);
      setProfile(p ?? null);
    } catch {
      setProfile(null); // 403/404 → render nothing sensitive
    } finally {
      setLoaded(true);
    }
  }, [childId]);

  useEffect(() => { void load(); }, [load]);

  const startEdit = async () => {
    const token = getAccessToken();
    if (!token) return;
    setDraft({
      status: profile?.status ? profile.status : "monitoring",
      summary: profile?.summary ?? "",
      categories: profile?.categories ?? [],
      send_lead_staff_id: profile?.send_lead_staff_id ?? "",
      plan_status: profile?.plan_status ?? "",
      review_date: profile?.review_date ?? "",
      start_date: profile?.start_date ?? "",
      end_date: profile?.end_date ?? "",
    });
    setEditing(true);
    setError(null);
    // Pickers: branch staff for the SEND lead + the org-configurable categories.
    api.adminGetStaff(token, { branch: branchSlug }).then((s) => setStaff(s ?? [])).catch(() => setStaff([]));
    api.adminGetTaxonomy(token, "send_category").then((t) => setCategories(t ?? [])).catch(() => setCategories([]));
  };

  const save = async () => {
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const p = await api.adminUpsertSendSupport(token, childId, draft);
      setProfile(p);
      setEditing(false);
      onStatusChange?.(p.status);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  };

  if (!loaded) return null;

  const input = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm";
  const label = "mb-1 block text-xs font-semibold text-slate-500";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-heading text-sm font-semibold text-slate-900">
          <HeartHandshake className="h-4 w-4 text-violet-600" /> Additional Support / SEND
        </h3>
        {!editing && (
          <button type="button" onClick={() => void startEdit()} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
            <Pencil className="h-3.5 w-3.5" /> {profile ? "Edit" : "Record support"}
          </button>
        )}
      </div>

      {error && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

      {!editing ? (
        !profile ? (
          <p className="text-sm text-slate-400">No additional-support information recorded.</p>
        ) : (
          <dl className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <StageBadge label={sendStatusLabel[profile.status]} accent={sendStatusAccent[profile.status]} withDot />
              <StageBadge label={sendPlanLabel[profile.plan_status ?? ""]} accent={profile.plan_status === "active" ? "green" : "slate"} withDot={false} />
            </div>
            {profile.summary && <div><dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Support required</dt><dd className="text-slate-700">{profile.summary}</dd></div>}
            {(profile.categories?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {profile.categories!.map((c) => <span key={c} className="rounded-full bg-violet-50 px-2 py-0.5 text-[0.65rem] font-semibold text-violet-700">{c.replace(/_/g, " ")}</span>)}
              </div>
            )}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500">
              {profile.send_lead_name && <span>SEND lead: <span className="font-medium text-slate-700">{profile.send_lead_name}</span></span>}
              {profile.review_date && <span>Next review: <span className="font-medium text-slate-700">{profile.review_date}</span></span>}
              {profile.start_date && <span>Support since: {profile.start_date}</span>}
              {profile.end_date && <span>Ended: {profile.end_date}</span>}
            </div>
          </dl>
        )
      ) : (
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void save(); }}>
          <div>
            <span className={label}>Status</span>
            <select value={draft.status} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as SendStatus }))} className={input}>
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <span className={label}>Support required in our setting</span>
            <textarea value={draft.summary} onChange={(e) => setDraft((d) => ({ ...d, summary: e.target.value }))} rows={3} className={input} />
          </div>
          {categories.length > 0 && (
            <div>
              <span className={label}>Areas of need</span>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((c) => {
                  const on = draft.categories.includes(c.code);
                  return (
                    <button key={c.code} type="button"
                      onClick={() => setDraft((d) => ({ ...d, categories: on ? d.categories.filter((x) => x !== c.code) : [...d.categories, c.code] }))}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${on ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className={label}>SEND lead</span>
              <select value={draft.send_lead_staff_id} onChange={(e) => setDraft((d) => ({ ...d, send_lead_staff_id: e.target.value }))} className={input}>
                <option value="">Not assigned</option>
                {staff.map((s) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
              </select>
            </div>
            <div>
              <span className={label}>Support plan</span>
              <select value={draft.plan_status} onChange={(e) => setDraft((d) => ({ ...d, plan_status: e.target.value as SendPlanStatus }))} className={input}>
                {PLAN_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><span className={label}>Support start</span><input type="date" value={draft.start_date} onChange={(e) => setDraft((d) => ({ ...d, start_date: e.target.value }))} className={input} /></div>
            <div><span className={label}>Next review</span><input type="date" value={draft.review_date} onChange={(e) => setDraft((d) => ({ ...d, review_date: e.target.value }))} className={input} /></div>
            <div><span className={label}>Support end</span><input type="date" value={draft.end_date} onChange={(e) => setDraft((d) => ({ ...d, end_date: e.target.value }))} className={input} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setEditing(false)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"><X className="h-3.5 w-3.5" /> Cancel</button>
            <button type="submit" disabled={busy} className="rounded-lg bg-teal-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50">{busy ? "Saving…" : "Save"}</button>
          </div>
        </form>
      )}
    </div>
  );
}
