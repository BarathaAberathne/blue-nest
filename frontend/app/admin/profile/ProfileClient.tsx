"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, Bell, CalendarClock, CalendarDays, ChevronLeft, ChevronRight, Pencil, Plane, Plus, Save, Trash2, UserCircle, X } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { fmtBranch } from "@/lib/enquiry";
import MyLeaveSection from "@/components/admin/MyLeaveSection";
import type { EmergencyContact, MeAttendance, MeProfileInput, NotificationPreferences, Shift, Staff } from "@/types";

type Tab = "profile" | "leave" | "attendance" | "rota" | "notifications";
const TABS: { key: Tab; label: string; icon: typeof UserCircle }[] = [
  { key: "profile", label: "Profile", icon: UserCircle },
  { key: "leave", label: "Leave", icon: Plane },
  { key: "attendance", label: "Attendance", icon: CalendarDays },
  { key: "rota", label: "My Rota", icon: CalendarClock },
  { key: "notifications", label: "Notifications", icon: Bell },
];

const ATT_LABEL: Record<string, string> = {
  present: "Present", absent: "Absent", leave: "Annual leave", sick: "Sick",
  dependant_sick: "Dependant sick", unpaid_leave: "Unpaid leave", maternity: "Maternity",
  training: "Training", meeting: "Meeting", remote: "Remote", holiday: "Holiday",
};

function fmtDate(d: string) {
  const dt = new Date(d + "T00:00:00");
  return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}
function hrs(mins?: number) { return mins ? `${Math.round((mins / 60) * 10) / 10}h` : "-"; }
function daysUntil(d?: string) {
  if (!d) return null;
  const t = new Date(d + "T00:00:00").getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86_400_000);
}

const isTab = (v: string | null): v is Tab => TABS.some((t) => t.key === v);

export default function ProfileClient() {
  const token = typeof window !== "undefined" ? getAccessToken() : "";
  const searchParams = useSearchParams();
  // ?tab=leave deep-links a tab (used by leave notifications).
  const initialTab = isTab(searchParams.get("tab")) ? (searchParams.get("tab") as Tab) : "profile";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [me, setMe] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(() => {
    if (!token) return;
    setLoading(true);
    api.getMyProfile(token)
      .then((s) => setMe(s))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load profile"))
      .finally(() => setLoading(false));
  }, [token]);
  useEffect(() => { loadProfile(); }, [loadProfile]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 font-heading text-2xl font-bold text-slate-900">
          <UserCircle className="h-6 w-6 text-teal-600" /> My Profile
        </h1>
        <p className="text-sm text-slate-500">
          {me ? `${me.first_name} ${me.last_name} · ${me.job_title || "Staff"} · ${fmtBranch(me.branch_slug)}${me.room_name ? " · " + me.room_name : ""}` : "Your details, leave, attendance and rota."}
        </p>
      </div>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>}

      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${tab === t.key ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {loading && !me ? (
        <p className="py-10 text-center text-sm text-slate-400">Loading…</p>
      ) : tab === "profile" ? (
        me ? <ProfileTab me={me} onSaved={loadProfile} /> : <p className="py-10 text-center text-sm text-slate-400">No staff profile is linked to your account.</p>
      ) : tab === "leave" ? (
        <MyLeaveSection />
      ) : tab === "attendance" ? (
        <AttendanceTab />
      ) : tab === "rota" ? (
        <RotaTab />
      ) : (
        <NotificationsTab />
      )}
    </div>
  );
}

// ── Profile tab (view + limited self-edit) ────────────────────────────────────

function ProfileTab({ me, onSaved }: { me: Staff; onSaved: () => void }) {
  const token = typeof window !== "undefined" ? getAccessToken() : "";
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState<MeProfileInput>({});

  const startEdit = () => {
    setForm({
      phone: me.phone ?? "", email: me.email ?? "",
      qualifications: me.qualifications ?? [], emergency_contacts: me.emergency_contacts ?? [],
      dbs_number: me.dbs_number ?? "", dbs_expiry: me.dbs_expiry ?? "", first_aid_expiry: me.first_aid_expiry ?? "",
    });
    setErr(null);
    setEditing(true);
  };

  const save = async () => {
    if (!token) return;
    setSaving(true); setErr(null);
    try { await api.updateMyProfile(token, form); setEditing(false); onSaved(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Failed to save"); }
    finally { setSaving(false); }
  };

  const dbsDays = daysUntil(me.dbs_expiry);
  const aidDays = daysUntil(me.first_aid_expiry);

  return (
    <div className="space-y-5">
      {err && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{err}</div>}

      {/* Certification expiry warnings */}
      {(dbsDays !== null && dbsDays <= 60) || (aidDays !== null && aidDays <= 60) ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            {dbsDays !== null && dbsDays <= 60 && <p>DBS check {dbsDays < 0 ? "expired" : `expires in ${dbsDays} day${dbsDays === 1 ? "" : "s"}`}.</p>}
            {aidDays !== null && aidDays <= 60 && <p>First-aid certificate {aidDays < 0 ? "expired" : `expires in ${aidDays} day${aidDays === 1 ? "" : "s"}`}.</p>}
          </div>
        </div>
      ) : null}

      {/* Employment (read-only) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-600">Employment</h2>
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Read label="Name" value={`${me.first_name} ${me.last_name}`} />
          <Read label="Job title" value={me.job_title} />
          <Read label="Branch" value={fmtBranch(me.branch_slug)} />
          <Read label="Room" value={me.room_name} />
          <Read label="Start date" value={me.start_date} />
          <Read label="Contract hours" value={me.contract_hours ? `${me.contract_hours}h/week` : undefined} />
          <Read label="Annual leave allowance" value={`${me.annual_leave_days || 28} days`} />
        </dl>
        <p className="mt-3 text-xs text-slate-400">Employment details are managed by your manager. Contact HR if anything is wrong.</p>
      </div>

      {/* Editable: contact + certifications */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">My details</h2>
          {!editing ? (
            <button type="button" onClick={startEdit} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"><Pencil className="h-3.5 w-3.5" /> Edit</button>
          ) : (
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditing(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-50"><Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save"}</button>
            </div>
          )}
        </div>

        {!editing ? (
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <Read label="Phone" value={me.phone} />
            <Read label="Email" value={me.email} />
            <Read label="DBS number" value={me.dbs_number} />
            <Read label="DBS expiry" value={me.dbs_expiry} />
            <Read label="First-aid expiry" value={me.first_aid_expiry} />
            <Read label="Qualifications" value={me.qualifications?.length ? me.qualifications.join(", ") : undefined} />
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-slate-500">Emergency contacts</dt>
              <dd className="mt-0.5 text-slate-800">
                {me.emergency_contacts?.length
                  ? me.emergency_contacts.map((c, i) => <span key={i} className="mr-3 inline-block">{c.name}{c.relation ? ` (${c.relation})` : ""}{c.phone ? ` · ${c.phone}` : ""}</span>)
                  : <span className="text-slate-400">None</span>}
              </dd>
            </div>
          </dl>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Phone"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="inp" /></Field>
              <Field label="Email"><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="inp" /></Field>
              <Field label="DBS number"><input value={form.dbs_number} onChange={(e) => setForm({ ...form, dbs_number: e.target.value })} className="inp" /></Field>
              <Field label="DBS expiry"><input type="date" value={form.dbs_expiry} onChange={(e) => setForm({ ...form, dbs_expiry: e.target.value })} className="inp" /></Field>
              <Field label="First-aid expiry"><input type="date" value={form.first_aid_expiry} onChange={(e) => setForm({ ...form, first_aid_expiry: e.target.value })} className="inp" /></Field>
            </div>
            <TagEditor label="Qualifications" tags={form.qualifications ?? []} onChange={(q) => setForm({ ...form, qualifications: q })} />
            <ContactsEditor contacts={form.emergency_contacts ?? []} onChange={(c) => setForm({ ...form, emergency_contacts: c })} />
          </div>
        )}
      </div>

      <style jsx>{`.inp{width:100%;border:1px solid rgb(226 232 240);border-radius:0.5rem;padding:0.5rem 0.75rem;font-size:0.875rem}`}</style>
    </div>
  );
}

function Read({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="text-slate-800">{value || <span className="text-slate-400">-</span>}</dd>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm"><span className="mb-1 block font-medium text-slate-600">{label}</span>{children}</label>;
}

function TagEditor({ label, tags, onChange }: { label: string; tags: string[]; onChange: (t: string[]) => void }) {
  const [v, setV] = useState("");
  return (
    <div>
      <p className="mb-1 text-sm font-medium text-slate-600">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t, i) => (
          <span key={i} className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">
            {t}<button type="button" onClick={() => onChange(tags.filter((_, j) => j !== i))} className="text-teal-500 hover:text-rose-600"><X className="h-3 w-3" /></button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (v.trim()) { onChange([...tags, v.trim()]); setV(""); } } }} placeholder="Add and press Enter" className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm" />
        <button type="button" onClick={() => { if (v.trim()) { onChange([...tags, v.trim()]); setV(""); } }} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"><Plus className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

function ContactsEditor({ contacts, onChange }: { contacts: EmergencyContact[]; onChange: (c: EmergencyContact[]) => void }) {
  const upd = (i: number, patch: Partial<EmergencyContact>) => onChange(contacts.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  return (
    <div>
      <p className="mb-1 text-sm font-medium text-slate-600">Emergency contacts</p>
      <div className="space-y-2">
        {contacts.map((c, i) => (
          <div key={i} className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 p-2 sm:grid-cols-4">
            <input value={c.name} onChange={(e) => upd(i, { name: e.target.value })} placeholder="Name" className="rounded border border-slate-200 px-2 py-1 text-sm" />
            <input value={c.relation ?? ""} onChange={(e) => upd(i, { relation: e.target.value })} placeholder="Relation" className="rounded border border-slate-200 px-2 py-1 text-sm" />
            <input value={c.phone ?? ""} onChange={(e) => upd(i, { phone: e.target.value })} placeholder="Phone" className="rounded border border-slate-200 px-2 py-1 text-sm" />
            <div className="flex gap-1">
              <input value={c.email ?? ""} onChange={(e) => upd(i, { email: e.target.value })} placeholder="Email" className="flex-1 rounded border border-slate-200 px-2 py-1 text-sm" />
              <button type="button" onClick={() => onChange(contacts.filter((_, j) => j !== i))} className="rounded p-1 text-slate-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => onChange([...contacts, { name: "" }])} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"><Plus className="h-4 w-4" /> Add contact</button>
    </div>
  );
}

// ── Attendance tab ────────────────────────────────────────────────────────────

function AttendanceTab() {
  const token = typeof window !== "undefined" ? getAccessToken() : "";
  const [data, setData] = useState<MeAttendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api.getMyAttendance(token)
      .then((d) => setData(d))
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load attendance"))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <p className="py-10 text-center text-sm text-slate-400">Loading…</p>;
  if (err) return <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{err}</div>;
  if (!data) return null;
  const s = data.summary;
  const recent = [...data.records].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-5">
      {s && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Worked days", value: s.worked_days },
            { label: "Worked hours", value: `${Math.round(s.worked_hours)}h` },
            { label: "Late days", value: s.late_days },
            { label: "Attendance", value: `${s.attendance_rate}%` },
          ].map((c) => (
            <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
              <p className="font-heading text-2xl leading-none text-slate-900">{c.value}</p>
              <p className="mt-1 text-xs text-slate-500">{c.label}</p>
            </div>
          ))}
        </div>
      )}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-3"><h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">Recent attendance</h2></div>
        {recent.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-400">No attendance records in this range.</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-100 text-left text-xs text-slate-500">
              <th className="px-5 py-2 font-medium">Date</th><th className="px-3 py-2 font-medium">Status</th><th className="px-3 py-2 font-medium">In</th><th className="px-3 py-2 font-medium">Out</th><th className="px-5 py-2 font-medium">Worked</th>
            </tr></thead>
            <tbody>
              {recent.slice(0, 40).map((r) => (
                <tr key={r.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-5 py-2 text-slate-700">{fmtDate(r.date)}</td>
                  <td className="px-3 py-2">{ATT_LABEL[r.status] ?? r.status}{r.late_arrival ? <span className="ml-1 text-xs text-amber-600">(late)</span> : ""}</td>
                  <td className="px-3 py-2 tabular-nums text-slate-600">{r.clock_in ? new Date(r.clock_in).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "-"}</td>
                  <td className="px-3 py-2 tabular-nums text-slate-600">{r.clock_out ? new Date(r.clock_out).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "-"}</td>
                  <td className="px-5 py-2 tabular-nums text-slate-600">{hrs(r.worked_minutes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Notifications tab (per-type email opt-outs) ───────────────────────────────

function NotificationsTab() {
  const token = typeof window !== "undefined" ? getAccessToken() : "";
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api.getMyNotificationPrefs(token)
      .then((p) => setPrefs(p))
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load preferences"))
      .finally(() => setLoading(false));
  }, [token]);

  const toggle = async (type: string) => {
    if (!token || !prefs || busy) return;
    const muted = prefs.muted_types ?? [];
    const next = muted.includes(type) ? muted.filter((t) => t !== type) : [...muted, type];
    setBusy(type); setErr(null);
    try { setPrefs(await api.updateMyNotificationPrefs(token, next)); }
    catch (e) { setErr(e instanceof Error ? e.message : "Failed to save"); }
    finally { setBusy(null); }
  };

  if (loading) return <p className="py-10 text-center text-sm text-slate-400">Loading…</p>;
  if (err && !prefs) return <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{err}</div>;
  if (!prefs) return null;
  const muted = prefs.muted_types ?? [];

  return (
    <div className="space-y-4">
      {err && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{err}</div>}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">Email notifications</h2>
        <p className="mt-1 text-sm text-slate-500">
          Choose which notifications are also sent to your email. In-app notifications always appear in the bell menu.
        </p>
        <ul className="mt-4 divide-y divide-slate-100">
          {prefs.catalogue.map((t) => {
            const on = !muted.includes(t.type);
            return (
              <li key={t.type} className="flex items-center justify-between gap-4 py-3">
                <span className="text-sm text-slate-700">{t.label}</span>
                <button type="button" role="switch" aria-checked={on} aria-label={t.label}
                  onClick={() => toggle(t.type)} disabled={busy !== null}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60 ${on ? "bg-teal-600" : "bg-slate-300"}`}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[1.375rem]" : "left-0.5"}`} />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

// ── Rota tab (personal shifts as a month calendar) ────────────────────────────

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Every date (inclusive) covered by an APPROVED leave request - the shared
// "on leave" set used to paint those days red in the calendar.
function expandApprovedLeave(reqs: { status: string; start_date: string; end_date: string }[]): Set<string> {
  const set = new Set<string>();
  for (const r of reqs) {
    if (r.status !== "approved") continue;
    const start = new Date(r.start_date + "T00:00:00");
    const end = new Date(r.end_date + "T00:00:00");
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;
    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) set.add(ymd(d));
  }
  return set;
}

function RotaTab() {
  const token = typeof window !== "undefined" ? getAccessToken() : "";
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() }); // m: 0–11
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [leaveDates, setLeaveDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const monthStart = `${cursor.y}-${String(cursor.m + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const monthEnd = `${cursor.y}-${String(cursor.m + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    api.getMyRota(token, monthStart, monthEnd)
      .then((s) => setShifts(s ?? []))
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load rota"))
      .finally(() => setLoading(false));
    // Overlay the caller's own approved leave (shown in red).
    api.getMyLeaveRequests(token)
      .then((reqs) => setLeaveDates(expandApprovedLeave(reqs ?? [])))
      .catch(() => { /* non-blocking */ });
  }, [token, monthStart, monthEnd]);

  // 6-week grid starting on the Monday on/before the 1st.
  const first = new Date(cursor.y, cursor.m, 1);
  const firstWeekday = (first.getDay() + 6) % 7; // Mon=0
  const gridStart = new Date(cursor.y, cursor.m, 1 - firstWeekday);
  const cells = Array.from({ length: 42 }, (_, i) => { const d = new Date(gridStart); d.setDate(gridStart.getDate() + i); return d; });
  const todayStr = ymd(new Date());
  const monthLabel = first.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const step = (delta: number) => setCursor((c) => { const d = new Date(c.y, c.m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() }; });

  const byDay = (ds: string) => shifts.filter((s) => s.date === ds).sort((a, b) => a.start_time.localeCompare(b.start_time));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-slate-600"><CalendarClock className="h-4 w-4 text-teal-600" /> My Rota</h2>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => step(-1)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" onClick={() => setCursor({ y: now.getFullYear(), m: now.getMonth() })} className="px-2 text-sm font-semibold text-slate-700">{monthLabel}</button>
          <button type="button" onClick={() => step(1)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Next month"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      {err && <div className="mb-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</div>}

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg bg-slate-200 text-center">
        {WEEKDAYS.map((w) => <div key={w} className="bg-slate-50 py-1.5 text-[0.65rem] font-bold uppercase tracking-wide text-slate-500">{w}</div>)}
        {cells.map((d, i) => {
          const ds = ymd(d);
          const inMonth = d.getMonth() === cursor.m;
          const isToday = ds === todayStr;
          const onLeave = leaveDates.has(ds);
          const dayShifts = byDay(ds);
          return (
            <div key={i} className={`min-h-[76px] p-1 text-left align-top ${onLeave ? "bg-rose-50" : inMonth ? "bg-white" : "bg-slate-50/60"}`}>
              <div className={`mb-1 text-right text-xs ${isToday ? "font-bold text-teal-700" : inMonth ? "text-slate-500" : "text-slate-300"}`}>
                {isToday ? <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-teal-600 text-white">{d.getDate()}</span> : d.getDate()}
              </div>
              <div className="space-y-0.5">
                {onLeave && <div className="truncate rounded bg-rose-100 px-1 py-0.5 text-[0.65rem] font-semibold text-rose-700">On leave</div>}
                {dayShifts.map((s) => (
                  <div key={s.id} title={`${s.start_time}–${s.end_time}${s.room_name ? " · " + s.room_name : ""}${s.notes ? " · " + s.notes : ""}`}
                    className="truncate rounded bg-teal-50 px-1 py-0.5 text-[0.65rem] font-semibold text-teal-800">
                    {s.start_time}–{s.end_time}{s.room_name ? ` · ${s.room_name}` : ""}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {loading && <p className="mt-2 text-center text-xs text-slate-400">Loading…</p>}
      <p className="mt-2 text-xs text-slate-400">Your rostered shifts for the month. Days you&rsquo;re on approved leave won&rsquo;t be rostered.</p>
    </div>
  );
}
