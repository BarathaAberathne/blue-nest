"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Baby, CalendarCheck, ClipboardList, DoorOpen, HeartPulse, Save,
  ShieldAlert, Star, TriangleAlert, Users, UtensilsCrossed,
} from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { branchShortName, branchStatusAccent, branchStatusLabel, performanceAccent } from "@/lib/branch";
import { ACCENT } from "@/lib/admin-theme";
import { fmtDate } from "@/lib/child";
import StatCard from "@/components/admin/ui/StatCard";
import StageBadge from "@/components/admin/ui/StageBadge";
import ProgressBar from "@/components/admin/ui/ProgressBar";
import Tabs from "@/components/ui/Tabs";
import ReviewsTab from "./ReviewsTab";
import type { Branch, BranchDashboard, BranchInput, Child, Room, Staff } from "@/types";

// branchBriefing turns the live dashboard into a short rule-based morning
// briefing (the per-branch AI voice — same stub pattern as the MD Command
// Centre; no external LLM call). Returns prioritised insight lines.
function branchBriefing(name: string, d: BranchDashboard): { tone: "ok" | "warn" | "bad"; text: string }[] {
  const out: { tone: "ok" | "warn" | "bad"; text: string }[] = [];
  out.push({ tone: d.performance >= 90 ? "ok" : d.performance >= 80 ? "warn" : "bad", text: `${name} is performing at ${d.performance}/100 this morning.` });
  if (d.safeguarding_open > 0) out.push({ tone: "bad", text: `${d.safeguarding_open} open safeguarding action${d.safeguarding_open > 1 ? "s" : ""} — review before the morning huddle.` });
  if (d.staff_present < d.staff_total - Math.ceil(d.staff_total * 0.15)) out.push({ tone: "warn", text: `Staffing is light — ${d.staff_present}/${d.staff_total} in (${d.staff_on_leave} on leave). Check ratios.` });
  out.push({ tone: d.attendance_rate >= 90 ? "ok" : "warn", text: `Attendance is ${d.attendance_rate}% — ${d.children_present} of ${d.children_expected} children in.` });
  if (d.available > 0) out.push({ tone: "ok", text: `${d.available} places free (${d.occupancy}% occupancy) — ${d.new_enquiries} new enquir${d.new_enquiries === 1 ? "y" : "ies"} to convert.` });
  if (d.medication_due > 0) out.push({ tone: "warn", text: `${d.medication_due} medication${d.medication_due > 1 ? "s" : ""} due today — confirm consent forms.` });
  const bdays = d.birthdays ?? [];
  if (bdays.length > 0) out.push({ tone: "ok", text: `🎂 ${bdays.length} birthday${bdays.length > 1 ? "s" : ""} today: ${bdays.join(", ")}.` });
  return out;
}

const TABS = [
  { key: "dashboard", label: "Dashboard" }, { key: "general", label: "General" },
  { key: "management", label: "Management" }, { key: "rooms", label: "Rooms" },
  { key: "staff", label: "Staff" }, { key: "children", label: "Children" },
  { key: "admissions", label: "Admissions" }, { key: "finance", label: "Finance" },
  { key: "attendance", label: "Attendance" }, { key: "communications", label: "Communications" },
  { key: "events", label: "Events" }, { key: "reviews", label: "Reviews" },
  { key: "settings", label: "Settings" }, { key: "audit", label: "Audit Log" },
];

function toInput(b: Branch): BranchInput {
  return {
    slug: b.slug, name: b.name, status: b.status, short_description: b.short_description,
    hero_image_url: b.hero_image_url, logo_url: b.logo_url, gallery: b.gallery,
    contact: b.contact, admissions: b.admissions, postcode: b.postcode, lat: b.lat, lng: b.lng,
    website: b.website, parking: b.parking, opening_hours: b.opening_hours, capacity: b.capacity,
    age_groups: b.age_groups, ofsted_rating: b.ofsted_rating, ofsted_report_url: b.ofsted_report_url,
    google: b.google, social: b.social, group_id: b.group_id,
  };
}

export default function BranchProfileClient({ slug }: { slug: string }) {
  const [branch, setBranch] = useState<Branch | null>(null);
  const [dash, setDash] = useState<BranchDashboard | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("dashboard");

  const [form, setForm] = useState<BranchInput | null>(null);
  const [saving, setSaving] = useState(false);
  const [managers, setManagers] = useState<Branch["managers"]>({});

  const load = async () => {
    const token = getAccessToken();
    if (!token) { setError("Not authenticated."); setLoading(false); return; }
    const [b, d, s, c, r] = await Promise.allSettled([
      api.adminGetBranch(token, slug), api.adminGetBranchDashboard(token, slug),
      api.adminGetStaff(token, { branch: slug }), api.adminGetChildren(token, { branch: slug }),
      api.adminGetRooms(token, slug),
    ]);
    if (b.status === "fulfilled") { setBranch(b.value as Branch); setForm(toInput(b.value as Branch)); setManagers((b.value as Branch).managers ?? {}); }
    else { setError("Branch not found or outside your scope."); }
    if (d.status === "fulfilled") setDash(d.value as BranchDashboard);
    if (s.status === "fulfilled") setStaff((s.value as Staff[]) ?? []);
    if (c.status === "fulfilled") setChildren((c.value as Child[]) ?? []);
    if (r.status === "fulfilled") setRooms((r.value as Room[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, [slug]);

  const staffName = useMemo(() => {
    const m = new Map(staff.map((s) => [s.id, `${s.first_name} ${s.last_name}`]));
    return (id?: string) => (id ? m.get(id) ?? "—" : "Unassigned");
  }, [staff]);

  const saveGeneral = async () => {
    const token = getAccessToken();
    if (!token || !form) return;
    setSaving(true); setError(null);
    try { const up = await api.adminUpdateBranch(token, slug, form); setBranch(up as Branch); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to save"); }
    finally { setSaving(false); }
  };

  const saveManagers = async () => {
    const token = getAccessToken();
    if (!token || !managers) return;
    setSaving(true); setError(null);
    try { const up = await api.adminSetBranchManagers(token, slug, managers); setBranch(up as Branch); setManagers(up.managers ?? {}); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to assign (super admin only)"); }
    finally { setSaving(false); }
  };

  const setF = (patch: Partial<BranchInput>) => setForm((f) => (f ? { ...f, ...patch } : f));

  if (loading) return <p className="text-slate-400">Loading…</p>;
  if (!branch) return <p className="text-red-500">{error ?? "Branch not found."}</p>;

  return (
    <>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-2xl font-bold text-slate-900">{branchShortName(branch)}</h1>
            <StageBadge label={branchStatusLabel[branch.status] ?? branch.status} accent={branchStatusAccent[branch.status] ?? "slate"} withDot />
            {branch.ofsted_rating && <StageBadge label={`Ofsted: ${branch.ofsted_rating}`} accent="sky" withDot={false} />}
          </div>
          <p className="mt-1 text-sm text-slate-500">{branch.contact?.address} · <span className="font-mono text-xs text-slate-400">{branch.ref ?? branch.slug}</span></p>
        </div>
        {dash && (
          <div className="flex h-16 w-16 flex-col items-center justify-center rounded-full border-4" style={{ borderColor: ACCENT[performanceAccent(dash.performance)].solid }}>
            <span className="text-xl font-bold leading-none" style={{ color: ACCENT[performanceAccent(dash.performance)].solid }}>{dash.performance}</span>
            <span className="text-[0.55rem] uppercase tracking-wider text-slate-400">health</span>
          </div>
        )}
      </div>

      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">{error}</p>}

      <Tabs tabs={TABS} active={tab} onChange={setTab} className="mb-6" />

      {tab === "dashboard" && dash && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Children present" value={`${dash.children_present}/${dash.children_expected}`} icon={Baby} accent="teal" />
            <StatCard label="Attendance" value={`${dash.attendance_rate}%`} accent="blue" progress={dash.attendance_rate} />
            <StatCard label="Occupancy" value={`${dash.occupancy}%`} sub={`${dash.available} places free`} accent="amber" progress={dash.occupancy} />
            <StatCard label="Staff present" value={`${dash.staff_present}/${dash.staff_total}`} sub={`${dash.staff_on_leave} on leave`} icon={Users} accent="violet" />
            <StatCard label="Open enquiries" value={dash.new_enquiries} sub={`${dash.enquiries} total`} icon={ClipboardList} accent="sky" />
            <StatCard label="Medication due" value={dash.medication_due} icon={HeartPulse} accent="violet" />
            <StatCard label="Safeguarding" value={dash.safeguarding_open} icon={ShieldAlert} accent={dash.safeguarding_open > 0 ? "red" : "green"} />
            <StatCard label="Google rating" value={dash.rating > 0 ? `${dash.rating.toFixed(1)}★` : "—"} sub={dash.review_count ? `${dash.review_count} reviews` : undefined} icon={Star} accent="amber" />
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="card p-5 lg:col-span-2">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-400">Live activity</h2>
              {(dash.activity ?? []).length === 0 ? <p className="text-sm text-slate-400">No recent records.</p> : (
                <ul className="divide-y divide-slate-100">
                  {(dash.activity ?? []).map((a, i) => (
                    <li key={i} className="flex items-center gap-3 py-2.5 text-sm">
                      <StageBadge label={a.kind} accent="slate" withDot={false} />
                      <span className="flex-1 text-slate-700">{a.text}</span>
                      <span className="text-xs text-slate-400">{fmtDate(a.time)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="card p-5">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-400">Today</h2>
              <div className="space-y-3 text-sm">
                <Row icon={UtensilsCrossed} label="Meals served" value={dash.meals_served} />
                <Row icon={TriangleAlert} label="Incidents" value={dash.incidents_today} />
                <Row icon={DoorOpen} label="Rooms" value={dash.rooms} />
              </div>
              <h2 className="mb-2 mt-6 text-sm font-bold uppercase tracking-widest text-slate-400">Birthdays 🎂</h2>
              {(dash.birthdays ?? []).length === 0 ? <p className="text-sm text-slate-400">None today.</p> : (
                <div className="flex flex-wrap gap-2">{(dash.birthdays ?? []).map((b) => <StageBadge key={b} label={b} accent="rose" withDot={false} />)}</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Per-branch AI morning briefing (rule-based from live metrics) */}
            <div className="card p-5 lg:col-span-2">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">AI</span>
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Blue Nest AI · {branchShortName(branch)}</h2>
              </div>
              <ul className="space-y-2">
                {branchBriefing(branchShortName(branch), dash).map((l, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: l.tone === "ok" ? ACCENT.green.solid : l.tone === "warn" ? ACCENT.amber.solid : ACCENT.red.solid }} />
                    <span className="text-slate-700">{l.text}</span>
                  </li>
                ))}
              </ul>
            </div>
            {/* Performance breakdown (weighted Branch Health) */}
            <div className="card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Branch health</h2>
                <span className="text-lg font-bold" style={{ color: ACCENT[performanceAccent(dash.performance)].solid }}>{dash.performance}%</span>
              </div>
              <div className="space-y-2">
                {(dash.performance_breakdown?.dimensions ?? []).map((d) => (
                  <div key={d.label} className="text-xs">
                    <div className="mb-0.5 flex items-center justify-between">
                      <span className="text-slate-500">{d.label} <span className="text-slate-300">· {d.weight}%</span></span>
                      <span className="font-semibold text-slate-700">{d.score}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100"><div className="h-1.5 rounded-full" style={{ width: `${d.score}%`, background: ACCENT[performanceAccent(d.score)].solid }} /></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "general" && form && (
        <div className="card grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
          <Field label="Name"><input value={form.name} onChange={(e) => setF({ name: e.target.value })} className="inp" /></Field>
          <Field label="Status">
            <select value={form.status} onChange={(e) => setF({ status: e.target.value as BranchInput["status"] })} className="inp bg-white">
              <option value="active">Active</option><option value="coming_soon">Coming soon</option>
            </select>
          </Field>
          <div className="sm:col-span-2"><Field label="Short description"><textarea value={form.short_description} onChange={(e) => setF({ short_description: e.target.value })} rows={2} className="inp" /></Field></div>
          <Field label="Phone"><input value={form.contact?.phone ?? ""} onChange={(e) => setF({ contact: { ...form.contact, phone: e.target.value } })} className="inp" /></Field>
          <Field label="Email"><input value={form.contact?.email ?? ""} onChange={(e) => setF({ contact: { ...form.contact, email: e.target.value } })} className="inp" /></Field>
          <div className="sm:col-span-2"><Field label="Address"><input value={form.contact?.address ?? ""} onChange={(e) => setF({ contact: { ...form.contact, address: e.target.value } })} className="inp" /></Field></div>
          <Field label="Postcode"><input value={form.postcode ?? ""} onChange={(e) => setF({ postcode: e.target.value })} className="inp" /></Field>
          <Field label="Website"><input value={form.website ?? ""} onChange={(e) => setF({ website: e.target.value })} className="inp" /></Field>
          <Field label="Capacity"><input type="number" value={form.capacity ?? 0} onChange={(e) => setF({ capacity: Number(e.target.value) })} className="inp" /></Field>
          <Field label="Ofsted rating"><input value={form.ofsted_rating ?? ""} onChange={(e) => setF({ ofsted_rating: e.target.value })} className="inp" /></Field>
          <Field label="Parking"><input value={form.parking ?? ""} onChange={(e) => setF({ parking: e.target.value })} className="inp" /></Field>
          <Field label="Google review URL"><input value={form.google?.review_url ?? ""} onChange={(e) => setF({ google: { ...form.google, review_url: e.target.value } })} className="inp" /></Field>
          <div className="sm:col-span-2 flex justify-end">
            <button type="button" onClick={saveGeneral} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"><Save className="h-4 w-4" />{saving ? "Saving…" : "Save changes"}</button>
          </div>
        </div>
      )}

      {tab === "management" && (
        <div className="card p-5">
          <h2 className="mb-1 text-sm font-bold uppercase tracking-widest text-slate-400">Leadership</h2>
          <p className="mb-4 text-sm text-slate-500">
            Assign an existing <strong>staff member</strong> to each leadership role — a relationship, never a duplicate record. These are drawn from this branch&apos;s <strong>staff records</strong> (People → Staff), not user login accounts. Saving requires Super Admin.
          </p>
          {staff.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
              No staff records at {branchShortName(branch)} yet.{" "}
              <Link href={`/admin/staff?branch=${branch.slug}`} className="font-medium text-teal-600 hover:underline">Add a staff member</Link> first, then assign them here.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {([["branch_manager", "Branch Manager"], ["deputy", "Deputy Manager"], ["assistant", "Assistant Manager"], ["regional", "Regional Manager"]] as const).map(([key, label]) => (
                  <Field key={key} label={label}>
                    <select value={managers?.[key] ?? ""} onChange={(e) => setManagers((m) => ({ ...m, [key]: e.target.value }))} className="inp bg-white">
                      <option value="">Unassigned</option>
                      {staff.map((s) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} · {s.job_title}</option>)}
                    </select>
                  </Field>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-400">
                Can&apos;t find someone? They need a <Link href={`/admin/staff?branch=${branch.slug}`} className="text-teal-600 hover:underline">staff record at {branchShortName(branch)}</Link> — a user account alone isn&apos;t enough.
              </p>
              <div className="mt-4 flex justify-end">
                <button type="button" onClick={saveManagers} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"><Save className="h-4 w-4" />{saving ? "Saving…" : "Save leadership"}</button>
              </div>
            </>
          )}
        </div>
      )}

      {tab === "rooms" && (
        <ModuleTab title="Rooms" href="/admin/rooms" count={rooms.length} icon={DoorOpen}>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr>{["Room", "Age range", "Capacity", "Ratio"].map((h) => <th key={h} className="px-4 py-2.5 text-left font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rooms.map((r) => <tr key={r.id}><td className="px-4 py-2.5 font-medium text-slate-900">{r.name}</td><td className="px-4 py-2.5 text-slate-500">{r.age_range || "—"}</td><td className="px-4 py-2.5 text-slate-700">{r.capacity}</td><td className="px-4 py-2.5 text-slate-500">{r.staff_ratio ? `1:${r.staff_ratio}` : "—"}</td></tr>)}
            </tbody>
          </table>
        </ModuleTab>
      )}

      {tab === "staff" && (
        <ModuleTab title="Staff" href="/admin/staff" count={staff.length} icon={Users}>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr>{["Name", "Role", "Type", "Status"].map((h) => <th key={h} className="px-4 py-2.5 text-left font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {staff.map((s) => <tr key={s.id} className="hover:bg-slate-50"><td className="px-4 py-2.5"><Link href={`/admin/staff/${s.id}`} className="font-medium text-slate-900 hover:text-teal-600">{s.first_name} {s.last_name}</Link></td><td className="px-4 py-2.5 text-slate-500">{s.job_title || "—"}</td><td className="px-4 py-2.5 text-slate-500">{s.staff_type}</td><td className="px-4 py-2.5 text-slate-500">{s.status}</td></tr>)}
            </tbody>
          </table>
        </ModuleTab>
      )}

      {tab === "children" && (
        <ModuleTab title="Children" href="/admin/children" count={children.length} icon={Baby}>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr>{["Ref", "Name", "Room", "Status"].map((h) => <th key={h} className="px-4 py-2.5 text-left font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {children.slice(0, 40).map((c) => <tr key={c.id} className="hover:bg-slate-50"><td className="px-4 py-2.5 font-mono text-xs text-slate-500">{c.ref ?? "—"}</td><td className="px-4 py-2.5"><Link href={`/admin/children/${c.id}`} className="font-medium text-slate-900 hover:text-teal-600">{c.first_name} {c.last_name}</Link></td><td className="px-4 py-2.5 text-slate-500">{rooms.find((r) => r.id === c.room_id)?.name ?? "—"}</td><td className="px-4 py-2.5 text-slate-500">{c.status}</td></tr>)}
            </tbody>
          </table>
          {children.length > 40 && <p className="p-3 text-center text-xs text-slate-400">Showing 40 of {children.length} — open Children for the full list.</p>}
        </ModuleTab>
      )}

      {tab === "attendance" && dash && (
        <ModuleLink title="Attendance" href="/admin/attendance" icon={CalendarCheck}
          summary={`${dash.children_present}/${dash.children_expected} present today · ${dash.attendance_rate}% attendance`} />
      )}
      {tab === "admissions" && dash && (
        <ModuleLink title="Admissions" href="/admin/inquiries" icon={ClipboardList}
          summary={`${dash.enquiries} enquiries · ${dash.new_enquiries} new`} />
      )}
      {tab === "audit" && (
        <ModuleLink title="Audit Log" href="/admin/activity" icon={ClipboardList}
          summary="Every change to this branch is recorded in the group activity log." />
      )}

      {tab === "reviews" && <ReviewsTab slug={slug} />}

      {["finance", "communications", "events", "settings"].includes(tab) && (
        <div className="card p-10 text-center">
          <p className="text-sm font-medium text-slate-600">{TABS.find((t) => t.key === tab)?.label}</p>
          <p className="mt-1 text-sm text-slate-400">
            {tab === "finance" ? "Branch finance (fees, invoices, funding) lands in a later phase." :
             "Coming in a later phase of the Branch module."}
          </p>
        </div>
      )}

      <style jsx>{`
        :global(.inp) { width: 100%; border-radius: 0.5rem; border: 1px solid rgb(226 232 240); padding: 0.5rem 0.75rem; font-size: 0.875rem; }
      `}</style>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-1 block text-xs uppercase tracking-wider text-slate-400">{label}</label>{children}</div>;
}
function Row({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-slate-400" /><span className="flex-1 text-slate-500">{label}</span><span className="font-semibold text-slate-800">{value}</span></div>;
}
function ModuleTab({ title, href, count, icon: Icon, children }: { title: string; href: string; count: number; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700"><Icon className="h-4 w-4 text-teal-600" /> {title} <span className="text-slate-400">({count})</span></div>
        <Link href={href} className="text-xs font-medium text-teal-600 hover:underline">Open {title} module →</Link>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}
function ModuleLink({ title, href, icon: Icon, summary }: { title: string; href: string; icon: React.ElementType; summary: string }) {
  return (
    <Link href={href} className="card flex items-center gap-4 p-5 transition-shadow hover:shadow-md">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600"><Icon className="h-5 w-5" /></span>
      <div className="flex-1"><p className="font-semibold text-slate-800">{title}</p><p className="text-sm text-slate-500">{summary}</p></div>
      <span className="text-sm text-teal-600">Open →</span>
    </Link>
  );
}
