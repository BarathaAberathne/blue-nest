"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { branchShortName } from "@/lib/branch";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import StageBadge from "@/components/admin/ui/StageBadge";
import ChildRoomAllocations from "@/components/admin/rooms/ChildRoomAllocations";
import { usePermissions } from "@/lib/usePermissions";
import { ageLabel, childStatusAccent, fmtDate, fundingLabel } from "@/lib/child";
import { dailyTypeAccent, dailyTypeLabel } from "@/lib/daily";
import type { Branch, Child, ChildInput, ChildSession, DailyRecord, Guardian, Room } from "@/types";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const SESSION_TYPES: { value: string; label: string }[] = [
  { value: "", label: "Not attending" },
  { value: "am", label: "AM (8–1pm)" },
  { value: "pm", label: "PM (1–6pm)" },
  { value: "school", label: "School (9–4pm)" },
  { value: "full", label: "Full day (8am–6pm)" },
];

export default function ChildDetailClient({ id }: { id: string }) {
  const [child, setChild] = useState<Child | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ChildInput | null>(null);
  const [saving, setSaving] = useState(false);
  const { has } = usePermissions();

  const load = async () => {
    const token = getAccessToken();
    if (!token) { setError("Not authenticated — please sign in as admin."); setLoading(false); return; }
    const [c, b, r, d] = await Promise.allSettled([api.adminGetChild(token, id), api.getBranches(), api.adminGetRooms(token), api.adminGetDailyRecords(token, { child: id, limit: 12 })]);
    if (c.status === "fulfilled") setChild(c.value as Child);
    else setError("Child not found.");
    if (b.status === "fulfilled") setBranches((b.value as Branch[]) ?? []);
    if (r.status === "fulfilled") setRooms((r.value as Room[]) ?? []);
    if (d.status === "fulfilled") setRecords((d.value as DailyRecord[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, [id]);
  // Only touches the read-only display state (child/records) — safe to
  // background-refresh mid-edit since `form` is a separate, un-synced state.
  useAutoRefresh(load, 30_000);

  const branchName = useMemo(() => new Map(branches.map((b) => [b.slug, branchShortName(b)])), [branches]);
  const roomName = useMemo(() => new Map(rooms.map((r) => [r.id, r.name])), [rooms]);

  const startEdit = () => {
    if (!child) return;
    setForm({
      first_name: child.first_name, last_name: child.last_name, dob: child.dob ?? "", gender: child.gender ?? "",
      branch_slug: child.branch_slug, status: child.status, start_date: child.start_date ?? "",
      funding_type: child.funding_type, allergies: child.allergies ?? "", dietary_reqs: child.dietary_reqs ?? "",
      medical_notes: child.medical_notes ?? "", guardians: child.guardians ?? [],
      sessions: child.sessions ?? [],
    });
    setEditing(true);
  };

  const save = async () => {
    const token = getAccessToken();
    if (!token || !form) return;
    setSaving(true); setError(null);
    try {
      const updated = await api.adminUpdateChild(token, id, form);
      setChild(updated as Child);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally { setSaving(false); }
  };

  const setField = (patch: Partial<ChildInput>) => setForm((f) => (f ? { ...f, ...patch } : f));

  const setGuardian = (i: number, patch: Partial<Guardian>) =>
    setForm((f) => (f ? { ...f, guardians: (f.guardians ?? []).map((g, gi) => (gi === i ? { ...g, ...patch } : g)) } : f));
  const addGuardian = () =>
    setForm((f) => (f ? { ...f, guardians: [...(f.guardians ?? []), { name: "", relation: "", email: "", phone: "", primary: (f.guardians ?? []).length === 0 }] } : f));
  const removeGuardian = (i: number) =>
    setForm((f) => (f ? { ...f, guardians: (f.guardians ?? []).filter((_, gi) => gi !== i) } : f));
  const setPrimaryGuardian = (i: number) =>
    setForm((f) => (f ? { ...f, guardians: (f.guardians ?? []).map((g, gi) => ({ ...g, primary: gi === i })) } : f));

  const sessionFor = (day: string) => form?.sessions?.find((s) => s.day === day)?.type ?? "";
  const setSession = (day: string, type: string) =>
    setForm((f) => {
      if (!f) return f;
      const rest = (f.sessions ?? []).filter((s) => s.day !== day);
      const next: ChildSession[] = type ? [...rest, { day, type }] : rest;
      return { ...f, sessions: next.sort((a, b) => WEEKDAYS.indexOf(a.day) - WEEKDAYS.indexOf(b.day)) };
    });

  if (loading) return <p className="text-slate-400">Loading…</p>;
  if (!child) return <p className="text-red-500">{error ?? "Child not found."}</p>;

  return (
    <>
      <Link href="/admin/children" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-600">
        <ArrowLeft className="h-4 w-4" /> All children
      </Link>

      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">{error}</p>}

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-2xl font-bold text-slate-900">{child.first_name} {child.last_name}</h1>
            <StageBadge label={child.status} accent={childStatusAccent[child.status]} withDot />
          </div>
          <p className="mt-1 font-mono text-xs text-slate-400">{child.ref ?? child.id}</p>
        </div>
        {!editing ? (
          <button type="button" onClick={startEdit} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <Pencil className="h-4 w-4" /> Edit
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setEditing(false)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><X className="h-4 w-4" /> Cancel</button>
            <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"><Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}</button>
          </div>
        )}
      </div>

      {!editing ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="card p-5 lg:col-span-2">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-400">Profile</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
              <Item label="Age" value={ageLabel(child.dob)} />
              <Item label="Date of birth" value={fmtDate(child.dob)} />
              <Item label="Gender" value={child.gender || "—"} />
              <Item label="Branch" value={branchName.get(child.branch_slug) ?? child.branch_slug} />
              <Item label="Room" value={child.room_id ? roomName.get(child.room_id) ?? "—" : "—"} />
              <Item label="Funding" value={fundingLabel(child.funding_type)} />
              <Item label="Start date" value={fmtDate(child.start_date)} />
              <Item label="Key person" value={child.key_person_name || "—"} />
            </dl>

            <h2 className="mb-3 mt-6 text-sm font-bold uppercase tracking-widest text-slate-400">Care notes</h2>
            <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
              <Item label="Allergies" value={child.allergies || "None recorded"} />
              <Item label="Dietary" value={child.dietary_reqs || "None recorded"} />
              <Item label="Medical" value={child.medical_notes || "None recorded"} />
            </dl>

            {child.sessions && child.sessions.length > 0 && (
              <>
                <h2 className="mb-3 mt-6 text-sm font-bold uppercase tracking-widest text-slate-400">Weekly sessions</h2>
                <div className="flex flex-wrap gap-2">
                  {child.sessions.map((s, i) => <StageBadge key={i} label={`${s.day} · ${SESSION_TYPES.find((t) => t.value === s.type)?.label ?? s.type}`} accent="sky" withDot={false} />)}
                </div>
              </>
            )}
          </div>

          <div className="card p-5">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-400">Guardians</h2>
            {(!child.guardians || child.guardians.length === 0) ? (
              <p className="text-sm text-slate-400">No guardians recorded.</p>
            ) : (
              <ul className="space-y-4">
                {child.guardians.map((g, i) => (
                  <li key={i} className="text-sm">
                    <p className="font-medium text-slate-900">{g.name} {g.primary && <span className="ml-1 align-middle"><StageBadge label="primary" accent="teal" withDot={false} /></span>}</p>
                    <p className="text-slate-500">{g.relation}</p>
                    {g.email && <p className="text-slate-500">{g.email}</p>}
                    {g.phone && <p className="text-slate-500">{g.phone}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Room placement — current room, transfer with capacity/age
              warnings, and full history. Sole writer of the child's room. */}
          <div className="lg:col-span-3">
            <ChildRoomAllocations
              childId={child.id}
              branchSlug={child.branch_slug}
              canManage={has("children.manage")}
              onChange={() => { void load(); }}
            />
          </div>

          <div className="card p-5 lg:col-span-3">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Recent daily records</h2>
              <Link href="/admin/daily-log" className="text-xs text-teal-600 hover:underline">Open daily log →</Link>
            </div>
            {records.length === 0 ? (
              <p className="text-sm text-slate-400">No observations, incidents or other records logged for this child yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {records.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 py-2.5 text-sm">
                    <StageBadge label={dailyTypeLabel[r.type]} accent={dailyTypeAccent[r.type]} withDot={false} />
                    <span className="flex-1 text-slate-800">{r.title}{r.eyfs_areas && r.eyfs_areas.length > 0 && <span className="ml-2 text-xs text-slate-400">{r.eyfs_areas.join(", ")}</span>}</span>
                    <span className="text-xs text-slate-400">{fmtDate(r.date)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : form && (
        <div className="card grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
          <Field label="First name"><input value={form.first_name} onChange={(e) => setField({ first_name: e.target.value })} className="inp" /></Field>
          <Field label="Last name"><input value={form.last_name} onChange={(e) => setField({ last_name: e.target.value })} className="inp" /></Field>
          <Field label="Date of birth"><input type="date" value={form.dob} onChange={(e) => setField({ dob: e.target.value })} className="inp" /></Field>
          <Field label="Gender">
            <select value={form.gender} onChange={(e) => setField({ gender: e.target.value })} className="inp bg-white">
              <option value="">—</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option>
            </select>
          </Field>
          <Field label="Branch">
            <select value={form.branch_slug} onChange={(e) => setField({ branch_slug: e.target.value })} className="inp bg-white">
              {branches.map((b) => <option key={b.slug} value={b.slug}>{branchShortName(b)}</option>)}
            </select>
          </Field>
          {/* Room is managed by the Room Placement panel (transfer + history),
              not this edit form — a single authoritative writer per the design. */}
          <Field label="Status">
            <select value={form.status} onChange={(e) => setField({ status: e.target.value as ChildInput["status"] })} className="inp bg-white">
              <option value="active">Active</option><option value="waitlist">Waitlist</option><option value="left">Left</option>
            </select>
          </Field>
          <Field label="Funding">
            <select value={form.funding_type} onChange={(e) => setField({ funding_type: e.target.value })} className="inp bg-white">
              <option value="none">Private (none)</option><option value="15h">15 hours</option><option value="30h">30 hours</option>
            </select>
          </Field>
          <Field label="Start date"><input type="date" value={form.start_date} onChange={(e) => setField({ start_date: e.target.value })} className="inp" /></Field>
          <Field label="Allergies"><input value={form.allergies} onChange={(e) => setField({ allergies: e.target.value })} className="inp" /></Field>
          <Field label="Dietary requirements"><input value={form.dietary_reqs} onChange={(e) => setField({ dietary_reqs: e.target.value })} className="inp" /></Field>
          <div className="sm:col-span-2"><Field label="Medical notes"><textarea value={form.medical_notes} onChange={(e) => setField({ medical_notes: e.target.value })} rows={2} className="inp" /></Field></div>

          <div className="sm:col-span-2">
            <label className="mb-2 block text-xs uppercase tracking-wider text-slate-400">Weekly sessions</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
              {WEEKDAYS.map((day) => (
                <label key={day} className="text-sm">
                  <span className="mb-1 block text-xs font-medium text-slate-500">{day}</span>
                  <select value={sessionFor(day)} onChange={(e) => setSession(day, e.target.value)} className="inp bg-white">
                    {SESSION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </label>
              ))}
            </div>
          </div>

          <div className="sm:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-xs uppercase tracking-wider text-slate-400">Guardians</label>
              <button type="button" onClick={addGuardian} className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 hover:underline">
                <Plus className="h-3.5 w-3.5" /> Add guardian
              </button>
            </div>
            {(!form.guardians || form.guardians.length === 0) ? (
              <p className="text-sm text-slate-400">No guardians recorded.</p>
            ) : (
              <div className="space-y-3">
                {form.guardians.map((g, i) => (
                  <div key={i} className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-2">
                    <input value={g.name} onChange={(e) => setGuardian(i, { name: e.target.value })} placeholder="Name" className="inp" />
                    <input value={g.relation ?? ""} onChange={(e) => setGuardian(i, { relation: e.target.value })} placeholder="Relation (e.g. Mother, Father)" className="inp" />
                    <input value={g.email ?? ""} onChange={(e) => setGuardian(i, { email: e.target.value })} placeholder="Email" type="email" className="inp" />
                    <input value={g.phone ?? ""} onChange={(e) => setGuardian(i, { phone: e.target.value })} placeholder="Phone" className="inp" />
                    <div className="flex items-center justify-between sm:col-span-2">
                      <label className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                        <input type="radio" name="primary-guardian" checked={!!g.primary} onChange={() => setPrimaryGuardian(i)} /> Primary contact
                      </label>
                      <button type="button" onClick={() => removeGuardian(i)} className="inline-flex items-center gap-1 text-xs font-medium text-red-500 hover:underline">
                        <Trash2 className="h-3.5 w-3.5" /> Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        :global(.inp) { width: 100%; border-radius: 0.5rem; border: 1px solid rgb(226 232 240); padding: 0.5rem 0.75rem; font-size: 0.875rem; }
      `}</style>
    </>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-slate-800">{value}</dd>
    </div>
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
