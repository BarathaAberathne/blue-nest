"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Award, Baby, BadgeCheck, CalendarClock, CalendarDays, CalendarX, Check, CheckCircle2,
  ChevronDown, ChevronLeft, ChevronRight, Clock, DoorOpen, GraduationCap, KeyRound, Mail, Palmtree,
  Pencil, Phone, Plus, Save, Search, ShieldCheck, Smile, Tags as TagsIcon, Thermometer, Trash2,
  User, Users, X,
} from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { branchShortName } from "@/lib/branch";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import StageBadge from "@/components/admin/ui/StageBadge";
import StaffRoomAllocations from "@/components/admin/rooms/StaffRoomAllocations";
import { usePermissions } from "@/lib/usePermissions";
import { fmtDate } from "@/lib/child";
import { dbsExpiry, staffStatusAccent, staffStatusLabel, staffTypeAccent, staffTypeLabel } from "@/lib/staff";
import type { Branch, Child, EmergencyContact, Shift, Staff, StaffAbsenceSummary, StaffInput } from "@/types";

// ── date helpers ─────────────────────────────────────────────────────────────
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
function mondayOf(d: Date) { const x = new Date(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); x.setHours(0, 0, 0, 0); return x; }
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
// minutes between two HH:MM times
const shiftMinutes = (s: string, e: string) => {
  const [sh, sm] = s.split(":").map(Number); const [eh, em] = e.split(":").map(Number);
  return Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
};
const fmtHM = (mins: number) => `${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60}m` : ""}`;
// childAge renders a friendly age from a YYYY-MM-DD DOB.
const childAge = (dob?: string) => {
  if (!dob) return null;
  const d = new Date(dob); if (isNaN(d.getTime())) return null;
  const now = new Date();
  let months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  if (now.getDate() < d.getDate()) months--;
  if (months < 0) return null;
  const y = Math.floor(months / 12), m = months % 12;
  return y >= 1 ? `${y}y${m ? ` ${m}m` : ""}` : `${m}m`;
};

type MainTab = "profile" | "contacts" | "calendar";
type SubTab = "basic" | "quals" | "keys" | "contract" | "tags";

// memberToInput maps a saved Staff record to the editable StaffInput the update
// endpoint expects (login fields default to "no change"). Single mapping reused
// by the edit form and the inline field-patch saves.
// room_id is deliberately OMITTED: room allocation now lives in its own
// authoritative model (StaffRoomAllocations panel + assignment endpoints), and
// the request DTO treats an omitted room_id as "no change", so a profile save
// can never touch — or silently wipe — the staff member's room. (Historic bug:
// docs/rooms/staff-room-field-investigation.md.)
const memberToInput = (m: Staff): StaffInput => ({
  first_name: m.first_name, last_name: m.last_name, email: m.email ?? "", phone: m.phone ?? "",
  branch_slug: m.branch_slug, job_title: m.job_title ?? "",
  staff_type: m.staff_type, status: m.status, start_date: m.start_date ?? "",
  contract_hours: m.contract_hours ?? 0, annual_leave_days: m.annual_leave_days ?? 0, sick_leave_days: m.sick_leave_days ?? 0, qualifications: m.qualifications ?? [],
  dbs_number: m.dbs_number ?? "", dbs_expiry: m.dbs_expiry ?? "", first_aid_expiry: m.first_aid_expiry ?? "",
  emergency_contacts: m.emergency_contacts ?? [],
  enable_login: false, login_role: "staff", login_password: "",
});

export default function StaffDetailClient({ id }: { id: string }) {
  const [member, setMember] = useState<Staff | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [absence, setAbsence] = useState<StaffAbsenceSummary | null>(null);
  const [absExpanded, setAbsExpanded] = useState(false);
  const [week, setWeek] = useState(() => mondayOf(new Date()));
  const [tab, setTab] = useState<MainTab>("profile");
  const [sub, setSub] = useState<SubTab>("basic");
  const { has } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Three independently-scoped edit modes — each opens only the fields shown
  // on its own subpanel, so "Edit" on Contract can never surface the Basic
  // info / branch-assignment form and vice versa.
  const [identityEditing, setIdentityEditing] = useState(false);
  const [identityForm, setIdentityForm] = useState<StaffInput | null>(null);
  const identityFormRef = useRef<HTMLDivElement>(null);
  const [basicEditing, setBasicEditing] = useState(false);
  const [basicForm, setBasicForm] = useState<Pick<StaffInput, "first_name" | "last_name" | "job_title" | "email" | "phone"> | null>(null);
  const [contractEditing, setContractEditing] = useState(false);
  const [contractForm, setContractForm] = useState<Pick<StaffInput, "staff_type" | "start_date" | "contract_hours" | "annual_leave_days" | "sick_leave_days"> | null>(null);
  const [saving, setSaving] = useState(false);
  const [pin, setPin] = useState("");
  const [pinBusy, setPinBusy] = useState(false);
  const [pinMsg, setPinMsg] = useState<string | null>(null);

  // ── data ───────────────────────────────────────────────────────────────────
  const load = async () => {
    const token = getAccessToken();
    if (!token) { setError("Not authenticated — please sign in as admin."); setLoading(false); return; }
    const [s, b] = await Promise.allSettled([api.adminGetStaffMember(token, id), api.getBranches()]);
    if (s.status === "fulfilled") setMember(s.value as Staff);
    else setError("Staff member not found.");
    if (b.status === "fulfilled") setBranches((b.value as Branch[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, [id]);
  // Only touches read-only display state — safe to background-refresh mid-edit
  // since each of the three edit-mode forms is a separate, un-synced state.
  useAutoRefresh(load, 30_000);

  // Rota shifts for this person, for the selected week — powers Scheduled hours + Calendar.
  useEffect(() => {
    const token = getAccessToken();
    const branch = member?.branch_slug;
    if (!token || !branch) return;
    let active = true;
    api.adminGetShifts(token, branch, ymd(week))
      .then((all) => { if (active) setShifts((all ?? []).filter((s) => s.staff_id === id)); })
      .catch(() => { if (active) setShifts([]); });
    return () => { active = false; };
  }, [member?.branch_slug, week, id]);

  // Attendance/absence summary for the current calendar year — powers the
  // Absence card + attendance donut on the profile dashboard.
  const absenceRange = useMemo(() => {
    const y = new Date().getFullYear();
    return { from: `${y}-01-01`, to: `${y}-12-31`, label: `1 Jan ${y} – 31 Dec ${y}` };
  }, []);
  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    let active = true;
    api.adminGetStaffAttendanceSummary(token, id, { from: absenceRange.from, to: absenceRange.to })
      .then((s) => { if (active) setAbsence(s); })
      .catch(() => { if (active) setAbsence(null); });
    return () => { active = false; };
  }, [id, absenceRange]);

  const branchName = useMemo(() => new Map(branches.map((b) => [b.slug, branchShortName(b)])), [branches]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => { const d = new Date(week); d.setDate(d.getDate() + i); return d; }), [week]);
  const shiftByDate = useMemo(() => {
    const m = new Map<string, Shift[]>();
    for (const s of shifts) {
      const list = m.get(s.date);
      if (list) list.push(s); else m.set(s.date, [s]);
    }
    return m;
  }, [shifts]);
  const weekMinutes = useMemo(() => shifts.reduce((t, s) => t + shiftMinutes(s.start_time, s.end_time), 0), [shifts]);

  // ── PIN ──────────────────────────────────────────────────────────────────
  const savePIN = async (clear = false) => {
    const token = getAccessToken();
    if (!token) return;
    const value = clear ? "" : pin.trim();
    if (!clear && !/^\d{4,8}$/.test(value)) { setPinMsg("PIN must be 4–8 digits"); return; }
    setPinBusy(true); setPinMsg(null);
    try {
      await api.adminSetStaffPIN(token, id, value);
      setPin("");
      setMember((m) => (m ? { ...m, has_pin: !clear } : m));
      setPinMsg(clear ? "PIN cleared" : "PIN set");
    } catch (e) { setPinMsg(e instanceof Error ? e.message : "Failed"); }
    finally { setPinBusy(false); }
  };

  // ── edit ─────────────────────────────────────────────────────────────────
  // Persist a field patch (used by every edit scope below, plus the
  // Qualifications add/remove panel). Sends the whole record — the update
  // endpoint takes a full StaffInput — with just the patch applied on top, so
  // each scoped form only has to carry the handful of fields it actually edits.
  const patchStaff = async (patch: Partial<StaffInput>) => {
    const token = getAccessToken();
    if (!token || !member) return;
    const updated = await api.adminUpdateStaff(token, id, { ...memberToInput(member), ...patch });
    setMember(updated as Staff);
  };

  const startIdentityEdit = () => { if (!member) return; setIdentityForm(memberToInput(member)); setIdentityEditing(true); };
  const startIdentityEditAndScroll = () => {
    startIdentityEdit();
    setTimeout(() => identityFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };
  const saveIdentity = async () => {
    if (!identityForm) return;
    setSaving(true); setError(null);
    try { await patchStaff(identityForm); setIdentityEditing(false); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to save"); }
    finally { setSaving(false); }
  };

  const startBasicEdit = () => {
    if (!member) return;
    setBasicForm({ first_name: member.first_name, last_name: member.last_name, job_title: member.job_title ?? "", email: member.email ?? "", phone: member.phone ?? "" });
    setBasicEditing(true);
  };
  const saveBasic = async () => {
    if (!basicForm) return;
    setSaving(true); setError(null);
    try { await patchStaff(basicForm); setBasicEditing(false); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to save"); }
    finally { setSaving(false); }
  };

  const startContractEdit = () => {
    if (!member) return;
    setContractForm({ staff_type: member.staff_type, start_date: member.start_date ?? "", contract_hours: member.contract_hours ?? 0, annual_leave_days: member.annual_leave_days ?? 0, sick_leave_days: member.sick_leave_days ?? 0 });
    setContractEditing(true);
  };
  const saveContract = async () => {
    if (!contractForm) return;
    setSaving(true); setError(null);
    try { await patchStaff(contractForm); setContractEditing(false); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to save"); }
    finally { setSaving(false); }
  };

  if (loading) return <p className="text-slate-400">Loading…</p>;
  if (!member) return <p className="text-red-500">{error ?? "Staff member not found."}</p>;

  const fullName = `${member.first_name} ${member.last_name}`.trim();
  const initials = `${member.first_name[0] ?? ""}${member.last_name[0] ?? ""}`.toUpperCase();
  const roomName = member.room_id ? (shifts.find((s) => s.room_id === member.room_id)?.room_name ?? "Assigned room") : null;
  const dbs = dbsExpiry(member.dbs_expiry);
  const quals = member.qualifications ?? [];

  return (
    <>
      <Link href="/admin/staff" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-600">
        <ArrowLeft className="h-4 w-4" /> All staff
      </Link>

      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">{error}</p>}

      {/* ── Identity block ─────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="grid h-20 w-20 flex-none place-items-center rounded-full bg-teal-100 text-2xl font-bold text-teal-700 ring-4 ring-white">
          {initials || <User className="h-8 w-8" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-heading text-2xl font-bold text-slate-900">{fullName}</h1>
            <StageBadge label={staffStatusLabel[member.status]} accent={staffStatusAccent[member.status]} withDot />
            <StageBadge label={staffTypeLabel[member.staff_type]} accent={staffTypeAccent[member.staff_type]} withDot={false} />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
            {roomName && <span className="inline-flex items-center gap-1.5"><DoorOpen className="h-4 w-4 text-slate-400" /> {roomName}</span>}
            {member.phone && <><span className="text-slate-300">·</span><a href={`tel:${member.phone}`} className="inline-flex items-center gap-1.5 hover:text-teal-600"><Phone className="h-4 w-4 text-slate-400" /> {member.phone}</a></>}
            <span className="text-slate-300">·</span>
            <span className="font-mono text-xs text-slate-400">{member.ref ?? member.id}</span>
          </div>
        </div>
        {!identityEditing ? (
          <button type="button" onClick={startIdentityEdit} title="Edit branch, status, compliance & login" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <Pencil className="h-4 w-4" /> Edit
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setIdentityEditing(false)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><X className="h-4 w-4" /> Cancel</button>
            <button type="button" onClick={saveIdentity} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"><Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}</button>
          </div>
        )}
      </div>

      {identityEditing && identityForm && (
        <div ref={identityFormRef}>
          <IdentityEditForm form={identityForm} member={member} branches={branches} setField={(p) => setIdentityForm((f) => (f ? { ...f, ...p } : f))} />
        </div>
      )}

      {/* ── Tabs ───────────────────────────────────────────────────── */}
      <div className="mb-6 flex gap-1 border-b border-slate-200" role="tablist" aria-label="Staff profile sections">
        {([["profile", "Profile"], ["contacts", `Contacts (${(member.emergency_contacts ?? []).length})`], ["calendar", "Calendar"]] as [MainTab, string][]).map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition ${tab === k ? "border-teal-600 text-teal-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ══════════════════ PROFILE ══════════════════ */}
      {tab === "profile" && (
        <div className="space-y-6">
          {/* Dashboard row */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* Scheduled hours */}
            <section className="card p-5" aria-labelledby="sched-h">
              <div className="mb-4 flex items-center justify-between">
                <h2 id="sched-h" className="text-sm font-bold uppercase tracking-widest text-slate-400">Scheduled hours</h2>
                <Link href="/admin/rota" className="text-xs font-semibold text-teal-600 hover:underline">Open rota</Link>
              </div>
              <div className="mb-3 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                <button onClick={() => setWeek((w) => { const d = new Date(w); d.setDate(d.getDate() - 7); return d; })} className="rounded p-1 text-slate-500 hover:bg-white" aria-label="Previous week"><ChevronLeft className="h-4 w-4" /></button>
                <span className="text-xs font-medium text-slate-600"><span className="text-slate-400">Week of:</span> {week.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                <button onClick={() => setWeek((w) => { const d = new Date(w); d.setDate(d.getDate() + 7); return d; })} className="rounded p-1 text-slate-500 hover:bg-white" aria-label="Next week"><ChevronRight className="h-4 w-4" /></button>
              </div>
              {shifts.length === 0 ? (
                <div className="py-6 text-center text-slate-400">
                  <CalendarDays className="mx-auto h-8 w-8 opacity-60" />
                  <p className="mt-2 text-sm">No hours scheduled</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {days.map((d) => { const list = shiftByDate.get(ymd(d)) ?? []; if (!list.length) return null; return (
                    <div key={ymd(d)} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                      <span className="font-medium text-slate-700">{d.toLocaleDateString("en-GB", { weekday: "short" })}</span>
                      <span className="tabular-nums text-slate-500">{list.map((s) => `${s.start_time}–${s.end_time}`).join(", ")}</span>
                    </div>
                  ); })}
                  <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-sm">
                    <span className="font-semibold text-slate-700">Weekly total</span>
                    <span className="font-bold text-teal-700">{fmtHM(weekMinutes)}</span>
                  </div>
                </div>
              )}
            </section>

            {/* Attendance & absence — real per-staff aggregation over the year */}
            <section className="card p-5" aria-labelledby="abs-h">
              <div className="mb-1 flex items-center justify-between">
                <h2 id="abs-h" className="text-sm font-bold uppercase tracking-widest text-slate-400">Attendance</h2>
                <span className="text-xs text-slate-400">{absenceRange.label}</span>
              </div>
              <p className="mb-3 text-xs text-slate-400">Captured working days over the year — kiosk &amp; corrections.</p>
              <div className="space-y-1">
                <KpiRow icon={CheckCircle2} tone="green" label="Worked"
                  value={absence ? `${absence.worked_days} days${absence.worked_hours ? ` (${absence.worked_hours}h)` : ""}` : "—"}
                  expandable rows={absence ? [["Late arrivals", `${absence.late_days} days`], ["Hours worked", `${absence.worked_hours}h`]] : []}
                  expanded={absExpanded} onToggle={() => setAbsExpanded((v) => !v)} />
                <KpiRow icon={Thermometer} tone="red" label="Sick" value={absence ? `${absence.sick_days} days` : "—"} />
                <KpiRow icon={Palmtree} tone="sky" label="Leave / holiday" value={absence ? `${absence.leave_days} days` : "—"} />
                <KpiRow icon={GraduationCap} tone="violet" label="Training" value={absence ? `${absence.training_days} days` : "—"} />
                <KpiRow icon={CalendarX} tone="slate" label="Absent" value={absence ? `${absence.absent_days} days` : "—"} />
              </div>
            </section>

            {/* Attendance donut — worked vs away, real values */}
            <section className="card flex flex-col items-center p-5" aria-labelledby="donut-h">
              <div className="mb-1 flex w-full items-center justify-between">
                <h2 id="donut-h" className="text-sm font-bold uppercase tracking-widest text-slate-400">Attendance rate</h2>
              </div>
              <p className="mb-2 w-full text-xs text-slate-400">{absenceRange.label}</p>
              <AttendanceDonut summary={absence} />
            </section>
          </div>

          {/* Compliance strip — DBS + first aid (kept, condensed) */}
          <section className="card p-5" aria-labelledby="comp-h">
            <div className="mb-4 flex items-center justify-between">
              <h2 id="comp-h" className="text-sm font-bold uppercase tracking-widest text-slate-400">Compliance</h2>
              {!identityEditing && (
                <button type="button" onClick={startIdentityEditAndScroll} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400"><ShieldCheck className="h-4 w-4" /> DBS check</div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-800">
                <span>{member.dbs_number || "Not recorded"}</span>
                {dbs && <StageBadge label={dbs.label} accent={dbs.accent} withDot={false} />}
              </div>
              <p className="text-xs text-slate-400">{member.dbs_expiry ? `Expires ${fmtDate(member.dbs_expiry)}` : "No expiry recorded"}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400"><Award className="h-4 w-4" /> Paediatric first aid</div>
              <div className="mt-1 text-sm text-slate-800">{member.first_aid_expiry ? `Expires ${fmtDate(member.first_aid_expiry)}` : "Not recorded"}</div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400"><KeyRound className="h-4 w-4" /> Kiosk PIN</div>
              <div className={`mt-1 text-sm font-medium ${member.has_pin ? "text-green-600" : "text-amber-600"}`}>{member.has_pin ? "Set" : "Not set"}</div>
            </div>
            </div>
          </section>

          {/* Room allocations — the authoritative staff↔room model, visible and
              (for staff.manage) editable in both view and edit workflows. */}
          <StaffRoomAllocations
            staffId={member.id}
            branchSlug={member.branch_slug}
            canManage={has("staff.manage")}
            onChange={() => { void load(); }}
          />

          {/* About panel */}
          <section className="card overflow-hidden" aria-labelledby="about-h">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 id="about-h" className="font-heading text-lg font-bold text-slate-900">About</h2>
              <p className="text-sm text-slate-500">Employment details, qualifications and access for this staff member.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr]">
              {/* sub nav */}
              <div className="flex gap-1 overflow-x-auto border-b border-slate-100 p-3 md:flex-col md:border-b-0 md:border-r" role="tablist" aria-orientation="vertical" aria-label="About sections">
                {([["basic", "Basic info", User], ["quals", "Qualifications", Award], ["keys", "Key children", Smile], ["contract", "Contract", CalendarDays], ["tags", "Tags", TagsIcon]] as [SubTab, string, typeof User][]).map(([k, label, Icon]) => (
                  <button key={k} role="tab" aria-current={sub === k} onClick={() => setSub(k)}
                    className={`flex items-center gap-2.5 whitespace-nowrap rounded-lg border-l-[3px] px-3 py-2.5 text-left text-sm font-semibold transition md:w-full ${sub === k ? "border-teal-600 bg-teal-50 text-teal-700" : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}>
                    <Icon className="h-4 w-4" /> {label}
                  </button>
                ))}
              </div>

              {/* sub content */}
              <div className="p-6">
                {sub === "basic" && (
                  <div>
                    <div className="mb-5 flex items-center justify-between">
                      <h3 className="font-heading text-base font-bold text-slate-900">Basic info</h3>
                      {!basicEditing ? (
                        <button onClick={startBasicEdit} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"><Pencil className="h-3.5 w-3.5" /> Edit</button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button onClick={() => setBasicEditing(false)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"><X className="h-3.5 w-3.5" /> Cancel</button>
                          <button onClick={saveBasic} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-50"><Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save"}</button>
                        </div>
                      )}
                    </div>

                    {/* Login + Kiosk PIN — always shown */}
                    <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 px-3 py-1.5 text-xs font-bold text-teal-700"><User className="h-3.5 w-3.5" /> {member.user_id ? "Login enabled" : "No login"}</span>
                        <div className="text-sm">
                          <div className="font-semibold text-slate-800">System login</div>
                          <div className="text-xs text-slate-500">{member.user_id ? "Can sign in to the portal (scoped to this branch)" : "HR-only record — no sign-in"}</div>
                        </div>
                      </div>
                      <div className="mt-4 border-t border-slate-200 pt-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-slate-200 text-slate-600"><KeyRound className="h-4 w-4" /></span>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-slate-800">Kiosk clock-in PIN</div>
                            <div className="text-xs text-slate-500">
                              {member.has_pin ? <span className="inline-flex items-center gap-1 font-medium text-green-600"><Check className="h-3.5 w-3.5" /> PIN set</span> : <span className="font-medium text-amber-600">No PIN set — can&apos;t clock in yet</span>}
                              {" "}· used at the entrance tablet
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <input value={pin} onChange={(e) => { setPin(e.target.value.replace(/\D/g, "").slice(0, 8)); setPinMsg(null); }}
                            inputMode="numeric" placeholder="e.g. 4821" aria-label="New kiosk PIN" className="w-32 rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono tracking-widest" />
                          <button type="button" onClick={() => savePIN(false)} disabled={pinBusy || !pin} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">{member.has_pin ? "Change PIN" : "Set PIN"}</button>
                          {member.has_pin && <button type="button" onClick={() => savePIN(true)} disabled={pinBusy} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Clear</button>}
                          {pinMsg && <span className="text-xs font-medium text-slate-500">{pinMsg}</span>}
                        </div>
                      </div>
                    </div>

                    {!basicEditing || !basicForm ? (
                      <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
                        <ReadField icon={User} label="Name" value={fullName} />
                        <ReadField icon={BadgeCheck} label="Job title" value={member.job_title} />
                        <ReadField icon={Mail} label="Email" value={member.email} />
                        <ReadField icon={Phone} label="Phone number" value={member.phone} isPhone />
                      </dl>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Field label="First name"><input value={basicForm.first_name} onChange={(e) => setBasicForm((f) => (f ? { ...f, first_name: e.target.value } : f))} className="inp" /></Field>
                        <Field label="Last name"><input value={basicForm.last_name} onChange={(e) => setBasicForm((f) => (f ? { ...f, last_name: e.target.value } : f))} className="inp" /></Field>
                        <Field label="Job title"><input value={basicForm.job_title} onChange={(e) => setBasicForm((f) => (f ? { ...f, job_title: e.target.value } : f))} className="inp" /></Field>
                        <div />
                        <Field label="Email"><input type="email" value={basicForm.email} onChange={(e) => setBasicForm((f) => (f ? { ...f, email: e.target.value } : f))} className="inp" /></Field>
                        <Field label="Phone"><input value={basicForm.phone} onChange={(e) => setBasicForm((f) => (f ? { ...f, phone: e.target.value } : f))} className="inp" /></Field>
                      </div>
                    )}
                  </div>
                )}

                {sub === "quals" && <QualificationsPanel quals={quals} onSave={(next) => patchStaff({ qualifications: next })} />}

                {sub === "keys" && <KeyChildrenPanel staffId={id} branch={member.branch_slug} />}

                {sub === "contract" && (
                  <div>
                    <div className="mb-5 flex items-center justify-between">
                      <h3 className="font-heading text-base font-bold text-slate-900">Contract</h3>
                      {!contractEditing ? (
                        <button onClick={startContractEdit} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"><Pencil className="h-3.5 w-3.5" /> Edit</button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button onClick={() => setContractEditing(false)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"><X className="h-3.5 w-3.5" /> Cancel</button>
                          <button onClick={saveContract} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-50"><Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save"}</button>
                        </div>
                      )}
                    </div>
                    {!contractEditing || !contractForm ? (
                      <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
                        <ReadField icon={BadgeCheck} label="Employee ID" value={member.ref} mono />
                        <ReadField icon={BadgeCheck} label="Employment type" value={staffTypeLabel[member.staff_type]} />
                        <ReadField icon={CalendarClock} label="Start date" value={member.start_date ? fmtDate(member.start_date) : undefined} />
                        <ReadField icon={Clock} label="Weekly contracted hours" value={member.contract_hours ? `${member.contract_hours}h` : undefined} />
                        <ReadField icon={Clock} label="Annual leave allowance" value={`${member.annual_leave_days || 28} days${member.annual_leave_days ? "" : " (default)"}`} />
                        <ReadField icon={Clock} label="Paid sick allowance" value={member.sick_leave_days ? `${member.sick_leave_days} days` : "Uncapped"} />
                      </dl>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Field label="Employment type">
                          <select value={contractForm.staff_type} onChange={(e) => setContractForm((f) => (f ? { ...f, staff_type: e.target.value as StaffInput["staff_type"] } : f))} className="inp bg-white">
                            <option value="permanent">Permanent</option><option value="agency">Agency</option><option value="bank">Bank</option>
                          </select>
                        </Field>
                        <Field label="Start date"><input type="date" value={contractForm.start_date} onChange={(e) => setContractForm((f) => (f ? { ...f, start_date: e.target.value } : f))} className="inp" /></Field>
                        <Field label="Weekly contracted hours"><input type="number" min={0} value={contractForm.contract_hours} onChange={(e) => setContractForm((f) => (f ? { ...f, contract_hours: Number(e.target.value) } : f))} className="inp" /></Field>
                        <Field label="Annual leave allowance (days, 0 = default 28)"><input type="number" min={0} value={contractForm.annual_leave_days} onChange={(e) => setContractForm((f) => (f ? { ...f, annual_leave_days: Number(e.target.value) } : f))} className="inp" /></Field>
                        <Field label="Paid sick allowance (days, 0 = uncapped)"><input type="number" min={0} value={contractForm.sick_leave_days} onChange={(e) => setContractForm((f) => (f ? { ...f, sick_leave_days: Number(e.target.value) } : f))} className="inp" /></Field>
                      </div>
                    )}
                    <div className="mt-6 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <CalendarClock className="h-5 w-5 flex-none text-teal-600" />
                      <div className="text-sm">
                        <div className="font-semibold text-slate-800">Weekly schedule lives on the rota</div>
                        <div className="text-slate-500">Room, day and shift times are planned on the <Link href="/admin/rota" className="font-medium text-teal-600 hover:underline">Staff rota</Link>. This week: <span className="font-semibold text-slate-700">{shifts.length ? fmtHM(weekMinutes) : "no shifts"}</span>.</div>
                      </div>
                    </div>
                  </div>
                )}

                {sub === "tags" && (
                  <EmptyState icon={TagsIcon} title="Tags are coming soon" body="Tag staff with attributes like First aider, Fire marshal or SENCO to filter and report on them. This is on the roadmap." />
                )}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ══════════════════ CONTACTS ══════════════════ */}
      {tab === "contacts" && (
        <div className="card p-6">
          <ContactsPanel contacts={member.emergency_contacts ?? []} onSave={(next) => patchStaff({ emergency_contacts: next })} />
        </div>
      )}

      {/* ══════════════════ CALENDAR ══════════════════ */}
      {tab === "calendar" && (
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <button onClick={() => setWeek((w) => { const d = new Date(w); d.setDate(d.getDate() - 7); return d; })} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"><ChevronLeft className="h-4 w-4" /> Previous week</button>
            <span className="text-sm font-semibold text-slate-700">{week.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – {days[6].toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
            <button onClick={() => setWeek((w) => { const d = new Date(w); d.setDate(d.getDate() + 7); return d; })} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Next week <ChevronRight className="h-4 w-4" /></button>
          </div>
          <div className="divide-y divide-slate-100">
            {days.map((d, i) => {
              const list = shiftByDate.get(ymd(d)) ?? [];
              const isToday = ymd(d) === ymd(new Date());
              return (
                <div key={ymd(d)} className="grid grid-cols-[110px_1fr] gap-4 py-3.5">
                  <div className={`text-sm font-semibold ${isToday ? "text-teal-700" : "text-slate-800"}`}>
                    {d.toLocaleDateString("en-GB", { weekday: "short" })} {d.getDate()}{isToday && <span className="ml-1 text-xs font-medium">(Today)</span>}
                    <span className="block text-xs font-normal text-slate-400">{DAY_NAMES[i]}</span>
                  </div>
                  <div className="space-y-2">
                    {list.length ? list.map((s) => (
                      <div key={s.id} className="rounded-lg border-l-[3px] border-teal-500 bg-teal-50 px-3 py-2">
                        <div className="text-sm font-semibold text-teal-800">{s.start_time}–{s.end_time}{s.room_name ? ` · ${s.room_name}` : ""}</div>
                        <div className="text-xs text-teal-700/80">{s.external ? "Cover" : "Rostered shift"}{s.notes ? ` — ${s.notes}` : ""}</div>
                      </div>
                    )) : <p className="py-1 text-sm text-slate-400">No shifts</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style jsx>{`
        :global(.inp) { width: 100%; border-radius: 0.5rem; border: 1px solid rgb(226 232 240); padding: 0.5rem 0.75rem; font-size: 0.875rem; }
      `}</style>
    </>
  );
}

// ── small components ─────────────────────────────────────────────────────────
// ── KpiRow — a colour-separated stat row: icon chip · label · bold value,
// optionally expandable into sub-rows (matches the reference design). ─────────
const KPI_TONE: Record<string, string> = {
  green: "bg-green-50 text-green-600",
  red: "bg-red-50 text-red-500",
  sky: "bg-sky-50 text-sky-600",
  violet: "bg-violet-50 text-violet-600",
  slate: "bg-slate-100 text-slate-500",
};
function KpiRow({ icon: Icon, tone, label, value, expandable, rows, expanded, onToggle }: {
  icon: typeof User; tone: keyof typeof KPI_TONE | string; label: string; value: string;
  expandable?: boolean; rows?: [string, string][]; expanded?: boolean; onToggle?: () => void;
}) {
  const chip = KPI_TONE[tone] ?? KPI_TONE.slate;
  const body = (
    <div className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${expanded ? "bg-slate-50" : "hover:bg-slate-50"}`}>
      <span className={`grid h-9 w-9 flex-none place-items-center rounded-lg ${chip}`}><Icon className="h-4 w-4" /></span>
      <span className="flex-1 text-sm font-medium text-slate-700">{label}</span>
      <span className="text-sm font-bold tabular-nums text-slate-900">{value}</span>
      {expandable && <ChevronDown className={`h-4 w-4 text-slate-400 transition ${expanded ? "rotate-180" : ""}`} />}
    </div>
  );
  return (
    <div>
      {expandable ? (
        <button type="button" onClick={onToggle} aria-expanded={expanded} className="w-full text-left">{body}</button>
      ) : body}
      {expandable && expanded && (rows?.length ?? 0) > 0 && (
        <ul className="mb-1 space-y-1.5 py-1 pl-[3.75rem] pr-3">
          {rows!.map(([k, v]) => (
            <li key={k} className="flex items-center justify-between text-xs text-slate-500"><span>{k}</span><span className="font-semibold text-slate-700">{v}</span></li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── AttendanceDonut — a real ring chart: worked days vs away, with the
// attendance rate at the centre. ─────────────────────────────────────────────
function AttendanceDonut({ summary }: { summary: StaffAbsenceSummary | null }) {
  const worked = summary?.worked_days ?? 0;
  const away = summary ? summary.sick_days + summary.leave_days + summary.training_days + summary.absent_days : 0;
  const total = worked + away;
  const rate = summary?.attendance_rate ?? 0;
  const workedLen = total > 0 ? Math.round((worked / total) * 314) : 0; // pathLength=314
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-[172px] w-[172px]">
        <svg viewBox="0 0 120 120" width="172" height="172" style={{ transform: "rotate(-90deg)" }}
          role="img" aria-label={`Attendance ${rate}% — ${worked} worked days of ${total} recorded`}>
          <circle cx="60" cy="60" r="50" fill="none" stroke="#e7ecf3" strokeWidth="16" pathLength={314} />
          {total > 0 && <circle cx="60" cy="60" r="50" fill="none" stroke="#0f9d8c" strokeWidth="16" strokeLinecap="round" strokeDasharray={`${workedLen} 314`} pathLength={314} />}
        </svg>
        <div className="absolute inset-0 grid place-content-center text-center" aria-hidden="true">
          <span className="text-2xl font-extrabold tracking-tight text-slate-900">{total > 0 ? `${rate}%` : "—"}</span>
          <span className="mt-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400">Attendance</span>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm" style={{ background: "#0f9d8c" }} /> Worked · {worked}</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-slate-200" /> Away · {away}</span>
      </div>
      <div className="mt-4 flex w-full items-center justify-center gap-2 border-t border-dashed border-slate-200 pt-3 text-sm text-slate-500">
        Hours worked: <b className="text-slate-800">{summary?.worked_hours ?? 0}h</b>
      </div>
    </div>
  );
}

function ReadField({ icon: Icon, label, value, multiline, isPhone, mono }: { icon: typeof User; label: string; value?: string; multiline?: boolean; isPhone?: boolean; mono?: boolean }) {
  const has = value != null && value !== "";
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400"><Icon className="h-3.5 w-3.5" /> {label}</dt>
      <dd className={`mt-1 text-sm ${has ? "text-slate-800" : "text-slate-400"} ${multiline ? "leading-relaxed" : ""} ${mono ? "font-mono" : ""}`}>
        {has ? (isPhone ? <a href={`tel:${value}`} className="text-teal-700 hover:underline">{value}</a> : value) : "-"}
      </dd>
    </div>
  );
}

function EmptyState({ icon: Icon, title, body }: { icon: typeof User; title: string; body: string }) {
  return (
    <div className="mx-auto max-w-md py-8 text-center">
      <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-teal-50 text-teal-600"><Icon className="h-7 w-7" /></div>
      <h4 className="font-heading text-lg font-bold text-slate-900">{title}</h4>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">{body}</p>
    </div>
  );
}

// ── Contacts — emergency / next-of-kin contacts for this staff member ─────────
const emptyContact: EmergencyContact = { name: "", relation: "", phone: "", email: "" };
function ContactsPanel({ contacts, onSave }: { contacts: EmergencyContact[]; onSave: (next: EmergencyContact[]) => Promise<void> }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<EmergencyContact>(emptyContact);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<EmergencyContact>(emptyContact);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const commit = async (next: EmergencyContact[]) => {
    setBusy(true); setErr(null);
    try { await onSave(next); }
    catch (e) { setErr(e instanceof Error ? e.message : "Failed to save"); }
    finally { setBusy(false); }
  };
  const add = async () => {
    if (!draft.name.trim()) { setErr("A name is required."); return; }
    await commit([...contacts, { ...draft, name: draft.name.trim() }]);
    setDraft(emptyContact); setAdding(false);
  };
  const startEditContact = (i: number) => { setEditingIndex(i); setEditDraft(contacts[i]); setErr(null); };
  const saveEditContact = async () => {
    if (!editDraft.name.trim()) { setErr("A name is required."); return; }
    const next = contacts.map((c, i) => (i === editingIndex ? { ...editDraft, name: editDraft.name.trim() } : c));
    await commit(next);
    setEditingIndex(null);
  };
  const remove = (i: number) => commit(contacts.filter((_, x) => x !== i));

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h3 className="font-heading text-base font-bold text-slate-900">Emergency contacts {contacts.length > 0 && <span className="text-slate-400">({contacts.length})</span>}</h3>
        {!adding && <button onClick={() => { setAdding(true); setDraft(emptyContact); setErr(null); }} className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-teal-700"><Plus className="h-3.5 w-3.5" /> Add contact</button>}
      </div>

      {err && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-500">{err}</p>}

      {adding && (
        <div className="mb-5 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
          <Field label="Name"><input autoFocus value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="inp" /></Field>
          <Field label="Relationship"><input value={draft.relation} onChange={(e) => setDraft({ ...draft, relation: e.target.value })} placeholder="e.g. Partner, Parent" className="inp" /></Field>
          <Field label="Phone"><input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} className="inp" /></Field>
          <Field label="Email"><input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} className="inp" /></Field>
          <div className="flex items-center gap-2 sm:col-span-2">
            <button onClick={add} disabled={busy || !draft.name.trim()} className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">{busy ? "Saving…" : "Add"}</button>
            <button onClick={() => { setAdding(false); setErr(null); }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-white">Cancel</button>
          </div>
        </div>
      )}

      {contacts.length === 0 && !adding ? (
        <EmptyState icon={Users} title="No emergency contacts yet" body="It's always a good idea to have contact info for the people close to this staff member — for emergencies, next-of-kin and day-to-day updates." />
      ) : (
        <div className="space-y-3">
          {contacts.map((c, i) => (
            <div key={i} className="rounded-xl border border-slate-200 p-4">
              {editingIndex === i ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Name"><input autoFocus value={editDraft.name} onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })} className="inp" /></Field>
                  <Field label="Relationship"><input value={editDraft.relation} onChange={(e) => setEditDraft({ ...editDraft, relation: e.target.value })} className="inp" /></Field>
                  <Field label="Phone"><input value={editDraft.phone} onChange={(e) => setEditDraft({ ...editDraft, phone: e.target.value })} className="inp" /></Field>
                  <Field label="Email"><input type="email" value={editDraft.email} onChange={(e) => setEditDraft({ ...editDraft, email: e.target.value })} className="inp" /></Field>
                  <div className="flex items-center gap-2 sm:col-span-2">
                    <button onClick={saveEditContact} disabled={busy} className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">{busy ? "Saving…" : "Save"}</button>
                    <button onClick={() => setEditingIndex(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-teal-50 text-teal-600"><User className="h-5 w-5" /></span>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{c.name}{c.relation ? <span className="ml-2 font-normal text-slate-400">{c.relation}</span> : null}</p>
                      <p className="text-xs text-slate-500">
                        {c.phone ? <a href={`tel:${c.phone}`} className="hover:text-teal-700">{c.phone}</a> : null}
                        {c.phone && c.email ? " · " : null}
                        {c.email ? <a href={`mailto:${c.email}`} className="hover:text-teal-700">{c.email}</a> : null}
                        {!c.phone && !c.email ? "No phone or email on file" : null}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => startEditContact(i)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label={`Edit ${c.name}`}><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => remove(i)} disabled={busy} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50" aria-label={`Remove ${c.name}`}><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Qualifications — add/remove a staff member's qualifications inline ────────
function QualificationsPanel({ quals, onSave }: { quals: string[]; onSave: (next: string[]) => Promise<void> }) {
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const commit = async (next: string[]) => {
    setBusy(true); setErr(null);
    try { await onSave(next); }
    catch (e) { setErr(e instanceof Error ? e.message : "Failed to save"); }
    finally { setBusy(false); }
  };
  const add = async () => {
    const v = value.trim();
    if (!v) return;
    if (quals.some((q) => q.toLowerCase() === v.toLowerCase())) { setErr("That qualification is already listed."); return; }
    await commit([...quals, v]);
    setValue(""); setAdding(false);
  };
  const remove = (q: string) => commit(quals.filter((x) => x !== q));

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h3 className="font-heading text-base font-bold text-slate-900">Qualifications &amp; certificates {quals.length > 0 && <span className="text-slate-400">({quals.length})</span>}</h3>
        {!adding && <button onClick={() => { setAdding(true); setErr(null); }} className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-teal-700"><Plus className="h-3.5 w-3.5" /> Add qualification</button>}
      </div>

      {err && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-500">{err}</p>}

      {adding && (
        <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <input
            autoFocus
            value={value}
            onChange={(e) => { setValue(e.target.value); setErr(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void add(); } if (e.key === "Escape") { setAdding(false); setValue(""); } }}
            placeholder="e.g. Level 3 Diploma in Early Years, Paediatric First Aid"
            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          <button onClick={add} disabled={busy || !value.trim()} className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">{busy ? "Saving…" : "Add"}</button>
          <button onClick={() => { setAdding(false); setValue(""); setErr(null); }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-white">Cancel</button>
        </div>
      )}

      {quals.length === 0 && !adding ? (
        <EmptyState icon={Award} title="Keep qualifications up to date" body="Record certificates and training so you always know who's qualified. Compliance dates (DBS, first aid) show on the Profile dashboard." />
      ) : (
        <div className="flex flex-wrap gap-2">
          {quals.map((q) => (
            <span key={q} className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-700">
              <Award className="h-3.5 w-3.5" /> {q}
              <button onClick={() => remove(q)} disabled={busy} className="ml-0.5 grid h-4 w-4 place-items-center rounded-full text-teal-500 hover:bg-teal-100 hover:text-teal-800 disabled:opacity-50" aria-label={`Remove ${q}`}><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── identity edit form — branch/status/compliance/login only (name, contact,
// job title live in Basic info's own scoped form; employment type/start date/
// contract hours live in Contract's). Reuses the existing staff update + login
// provisioning endpoint. ────────────────────────────────────────────────────
function IdentityEditForm({ form, member, branches, setField }: { form: StaffInput; member: Staff; branches: Branch[]; setField: (p: Partial<StaffInput>) => void }) {
  return (
    <div className="card mb-6 grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
      <Field label="Branch">
        <select value={form.branch_slug} onChange={(e) => setField({ branch_slug: e.target.value })} className="inp bg-white">
          {branches.map((b) => <option key={b.slug} value={b.slug}>{branchShortName(b)}</option>)}
        </select>
      </Field>
      <Field label="Status">
        <select value={form.status} onChange={(e) => setField({ status: e.target.value as StaffInput["status"] })} className="inp bg-white">
          <option value="active">Active</option><option value="on_leave">On leave</option><option value="inactive">Inactive</option>
        </select>
      </Field>
      <Field label="DBS number"><input value={form.dbs_number} onChange={(e) => setField({ dbs_number: e.target.value })} className="inp" /></Field>
      <Field label="DBS expiry"><input type="date" value={form.dbs_expiry} onChange={(e) => setField({ dbs_expiry: e.target.value })} className="inp" /></Field>
      <Field label="Paediatric first aid expiry"><input type="date" value={form.first_aid_expiry} onChange={(e) => setField({ first_aid_expiry: e.target.value })} className="inp" /></Field>

      <div className="sm:col-span-2 rounded-lg border border-slate-100 bg-slate-50 p-3">
        {member.user_id ? (
          <p className="text-sm text-slate-600">This person has a system login. Re-tick below to change their login role — it stays scoped to this branch.</p>
        ) : (
          <p className="text-sm text-slate-600">This person is an HR-only record with no login.</p>
        )}
        <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" checked={!!form.enable_login} onChange={(e) => setField({ enable_login: e.target.checked })} className="h-4 w-4 rounded" />
          {member.user_id ? "Update login role" : "Enable system login"}
        </label>
        {form.enable_login && (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Login role">
              <select value={form.login_role} onChange={(e) => setField({ login_role: e.target.value as StaffInput["login_role"] })} className="inp bg-white">
                {["staff", "branch_manager", "deputy_manager", "regional_manager", "finance", "admissions", "procurement"].map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
              </select>
            </Field>
            {!member.user_id && <Field label="Password (min 8 chars)"><input type="password" value={form.login_password ?? ""} onChange={(e) => setField({ login_password: e.target.value })} placeholder="Leave blank to link existing account" className="inp" /></Field>}
          </div>
        )}
      </div>
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

// ── Key children — assign/unassign the children this staff member is key person for ──
function KeyChildrenPanel({ staffId, branch }: { staffId: string; branch: string }) {
  const [list, setList] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [roster, setRoster] = useState<Child[] | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    try { setList((await api.adminGetStaffKeyChildren(token, staffId)) ?? []); }
    catch { setErr("Failed to load key children."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [staffId]);

  const openAdd = async () => {
    setAdding(true); setErr(null);
    if (roster === null) {
      const token = getAccessToken();
      if (!token) return;
      try { setRoster((await api.adminGetChildren(token, { branch, status: "active" })) ?? []); }
      catch { setRoster([]); }
    }
  };
  const assign = async (child: Child) => {
    const token = getAccessToken();
    if (!token) return;
    setBusy(child.id); setErr(null);
    try { await api.adminSetChildKeyPerson(token, child.id, staffId); await load(); setAdding(false); setQ(""); }
    catch (e) { setErr(e instanceof Error ? e.message : "Failed to assign"); }
    finally { setBusy(null); }
  };
  const remove = async (child: Child) => {
    const token = getAccessToken();
    if (!token) return;
    setBusy(child.id); setErr(null);
    try { await api.adminSetChildKeyPerson(token, child.id, ""); await load(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Failed to remove"); }
    finally { setBusy(null); }
  };

  const assignedIds = new Set(list.map((c) => c.id));
  const options = (roster ?? []).filter((c) => !assignedIds.has(c.id) &&
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h3 className="font-heading text-base font-bold text-slate-900">Key children {list.length > 0 && <span className="text-slate-400">({list.length})</span>}</h3>
        {!adding && <button onClick={openAdd} className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-teal-700"><Plus className="h-3.5 w-3.5" /> Add key child</button>}
      </div>

      {err && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-500">{err}</p>}

      {adding && (
        <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Assign a child at this branch</span>
            <button onClick={() => { setAdding(false); setQ(""); }} className="rounded p-1 text-slate-400 hover:bg-white" aria-label="Close"><X className="h-4 w-4" /></button>
          </div>
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search children…" className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm" />
          </div>
          <div className="max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200 bg-white">
            {roster === null ? <p className="p-3 text-sm text-slate-400">Loading…</p>
              : options.length === 0 ? <p className="p-3 text-sm text-slate-400">No unassigned children match.</p>
              : options.map((c) => {
                const age = childAge(c.dob);
                return (
                  <button key={c.id} onClick={() => assign(c)} disabled={busy === c.id} className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-slate-50 disabled:opacity-50">
                    <span className="text-sm font-medium text-slate-800">{c.first_name} {c.last_name}</span>
                    <span className="flex items-center gap-2 text-xs text-slate-400">{age && <span>{age}</span>}<span className="font-mono">{c.ref ?? ""}</span><Plus className="h-4 w-4 text-teal-600" /></span>
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : list.length === 0 && !adding ? (
        <EmptyState icon={Smile} title="No key children yet" body="Key persons build secure attachments. Assign the children this staff member is responsible for to track their development." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {list.map((c) => {
            const age = childAge(c.dob);
            return (
              <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-teal-50 text-teal-600"><Baby className="h-5 w-5" /></span>
                  <div className="min-w-0">
                    <Link href={`/admin/children/${c.id}`} className="block truncate text-sm font-semibold text-slate-800 hover:text-teal-700">{c.first_name} {c.last_name}</Link>
                    <div className="text-xs text-slate-400">{age ? `${age} · ` : ""}<span className="font-mono">{c.ref ?? c.id.slice(-6)}</span></div>
                  </div>
                </div>
                <button onClick={() => remove(c)} disabled={busy === c.id} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50" aria-label={`Remove ${c.first_name} as key child`}><Trash2 className="h-4 w-4" /></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
