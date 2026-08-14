"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Baby, Plus, Search, Users, X } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { branchShortName } from "@/lib/branch";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import ExportButton from "@/components/admin/ExportButton";
import StatCard from "@/components/admin/ui/StatCard";
import StageBadge from "@/components/admin/ui/StageBadge";
import Avatar from "@/components/admin/ui/Avatar";
import { sendActive } from "@/lib/send";
import { ageLabel, childStatusAccent, fundingLabel } from "@/lib/child";
import { useTaxonomy, sessionOptions } from "@/lib/useTaxonomy";
import type { Branch, Child, ChildInput, ChildSession, ChildStats, Room } from "@/types";

// Weekly-session controls, matched to the child edit form so a session pattern
// can be captured at registration time — not only when editing an existing child.
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

const emptyForm: ChildInput = {
  first_name: "", last_name: "", dob: "", gender: "", branch_slug: "",
  status: "active", start_date: "", funding_type: "none", allergies: "", dietary_reqs: "", medical_notes: "",
  guardians: [{ name: "", relation: "Mother", email: "", phone: "", primary: true }],
  sessions: [],
};

export default function ChildrenClient() {
  const [children, setChildren] = useState<Child[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [stats, setStats] = useState<ChildStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [branchFilter, setBranchFilter] = useState("");
  // Default to the active roster — waitlist/left children are a filter away,
  // not mixed into the everyday view.
  const [statusFilter, setStatusFilter] = useState("active");
  const [sendFilter, setSendFilter] = useState("");
  const [q, setQ] = useState("");

  const [form, setForm] = useState<ChildInput>(emptyForm);
  // Optional room to place the new child in on create — a first-class
  // child-room-assignment call, not a field on the child record.
  const [newRoomId, setNewRoomId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const token = getAccessToken();
    if (!token) { setError("Not authenticated — please sign in as admin."); setLoading(false); return; }
    const [c, b, r, s] = await Promise.allSettled([
      api.adminGetChildren(token), api.adminGetBranches(token), api.adminGetRooms(token), api.adminGetChildStats(token),
    ]);
    if (c.status === "fulfilled") setChildren((c.value as Child[]) ?? []);
    if (b.status === "fulfilled") setBranches((b.value as Branch[]) ?? []);
    if (r.status === "fulfilled") setRooms((r.value as Room[]) ?? []);
    if (s.status === "fulfilled") setStats(s.value as ChildStats);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);
  // Keeps the list current if another staff member adds/edits a child
  // elsewhere while this page sits open — same cadence as attendance/staff.
  useAutoRefresh(load, 30_000);

  const branchName = useMemo(() => {
    const m = new Map(branches.map((b) => [b.slug, branchShortName(b)]));
    return (slug: string) => m.get(slug) ?? slug;
  }, [branches]);
  const roomName = useMemo(() => {
    const m = new Map(rooms.map((r) => [r.id, r.name]));
    return (id?: string) => (id ? m.get(id) ?? "—" : "—");
  }, [rooms]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = children.filter((c) => {
      if (branchFilter && c.branch_slug !== branchFilter) return false;
      if (statusFilter && c.status !== statusFilter) return false;
      if (sendFilter === "send" && !sendActive(c.send_status)) return false;
      if (sendFilter === "non_send" && sendActive(c.send_status)) return false;
      if (needle) {
        const hay = `${c.first_name} ${c.last_name} ${c.ref ?? ""} ${roomName(c.room_id)}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    // Alphabetical by name, grouped by branch (branch order first, then name).
    return filtered.sort((a, b) => {
      const byBranch = branchName(a.branch_slug).localeCompare(branchName(b.branch_slug), undefined, { sensitivity: "base" });
      if (byBranch !== 0) return byBranch;
      return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`, undefined, { sensitivity: "base" });
    });
  }, [children, branchFilter, statusFilter, sendFilter, q, branchName, roomName]);

  const roomsForBranch = useMemo(
    () => rooms.filter((r) => r.branch_slug === form.branch_slug),
    [rooms, form.branch_slug],
  );

  // Server-side export (CSV/Excel) via the shared ExportButton — full dataset
  // with the current branch/status/search filters applied server-side.
  const exportPath = useMemo(() => {
    const p = new URLSearchParams();
    if (branchFilter) p.set("branch", branchFilter);
    if (statusFilter) p.set("status", statusFilter);
    if (q.trim()) p.set("q", q.trim());
    const qs = p.toString();
    return `/api/v1/admin/children/export${qs ? `?${qs}` : ""}`;
  }, [branchFilter, statusFilter, q]);

  const openCreate = () => {
    setNewRoomId("");
    setForm({ ...emptyForm, branch_slug: branchFilter || branches[0]?.slug || "", guardians: [{ name: "", relation: "Mother", email: "", phone: "", primary: true }] });
    setShowForm(true);
  };

  const save = async () => {
    const token = getAccessToken();
    if (!token || !form.first_name.trim() || !form.last_name.trim() || !form.branch_slug) {
      setError("First name, last name and branch are required."); return;
    }
    setSaving(true); setError(null);
    try {
      const payload: ChildInput = { ...form, guardians: (form.guardians ?? []).filter((g) => g.name.trim()) };
      const created = await api.adminCreateChild(token, payload);
      // Place the child in the chosen room via the canonical assignment
      // endpoint (the same one the room/child profiles use). If the placement
      // is rejected (age range / capacity), roll the just-created child back so
      // the whole create is atomic — the user saw an error, so nothing should
      // persist. Single-node Mongo has no multi-doc transactions; compensating
      // rollback is the established pattern here (see the transfer semantics in
      // docs/rooms/room-allocation-design.md).
      if (newRoomId && created?.id) {
        try {
          await api.adminCreateChildRoomAssignment(token, { child_id: created.id, room_id: newRoomId });
        } catch (assignErr) {
          const reason = assignErr instanceof Error ? assignErr.message : "Room allocation failed";
          try {
            await api.adminDeleteChild(token, created.id);
          } catch {
            // Rollback failed too — the child exists but is unplaced. Say so plainly.
            throw new Error(`${reason}. The child was created but could not be placed — open the child to assign a valid room.`);
          }
          throw new Error(`${reason}. The child was not created — pick a valid room, or leave it unassigned.`);
        }
      }
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save child");
    } finally { setSaving(false); }
  };

  const setField = (patch: Partial<ChildInput>) => setForm((f) => ({ ...f, ...patch }));
  const setGuardian = (patch: Partial<NonNullable<ChildInput["guardians"]>[number]>) =>
    setForm((f) => ({ ...f, guardians: [{ ...(f.guardians?.[0] ?? { name: "", primary: true }), ...patch }] }));

  const sessionFor = (day: string) => form.sessions?.find((s) => s.day === day)?.type ?? "";
  const setSession = (day: string, type: string) =>
    setForm((f) => {
      const rest = (f.sessions ?? []).filter((s) => s.day !== day);
      const next: ChildSession[] = type ? [...rest, { day, type }] : rest;
      return { ...f, sessions: next.sort((a, b) => WEEKDAYS.indexOf(a.day) - WEEKDAYS.indexOf(b.day)) };
    });

  // Configurable, per-branch lists drive the pickers (fall back to defaults).
  const sessionTypeOptions = sessionOptions(useTaxonomy("session_type", form.branch_slug ?? ""));
  const allergyTerms = useTaxonomy("allergy_type", form.branch_slug ?? "");
  const dietaryTerms = useTaxonomy("dietary_label", form.branch_slug ?? "");
  const toggleTag = (field: "allergy_tags" | "dietary_tags", code: string) =>
    setForm((f) => {
      const cur = f[field] ?? [];
      return { ...f, [field]: cur.includes(code) ? cur.filter((c) => c !== code) : [...cur, code] };
    });

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">Children</h1>
          <p className="text-sm text-slate-500">Enrolled &amp; waitlisted children across every branch — the foundation record for occupancy &amp; attendance.</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton path={exportPath} />
          <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700">
            <Plus className="h-4 w-4" /> Add child
          </button>
        </div>
      </div>

      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">{error}</p>}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total children" value={stats?.total ?? children.length} icon={Baby} accent="blue" />
        <StatCard label="Active" value={stats?.active ?? "—"} sub={`${stats?.waitlist ?? 0} on waitlist`} icon={Users} accent="green" />
        <StatCard label="Occupancy" value={stats ? `${stats.occupancy_rate}%` : "—"} sub={stats ? `capacity ${stats.capacity}` : undefined} accent="teal" progress={stats?.occupancy_rate} />
        <StatCard label="Available places" value={stats?.available ?? "—"} accent="amber" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or ref…" className="rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-sm" />
        </div>
        <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="">All branches</option>
          {branches.map((b) => <option key={b.slug} value={b.slug}>{branchShortName(b)}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="waitlist">Waitlist</option>
          <option value="left">Left</option>
        </select>
        <select value={sendFilter} onChange={(e) => setSendFilter(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="">All children</option>
          <option value="send">SEND / additional support</option>
          <option value="non_send">Non-SEND</option>
        </select>
        <span className="ml-auto text-sm text-slate-400">{rows.length} shown</span>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr>{["Ref", "Name", "Age", "Branch", "Room", "Funding", "Status"].map((h) => <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-6 text-slate-400">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-400">No children match.</td></tr>
            ) : rows.map((c, i) => (
              <Fragment key={c.id}>
              {(i === 0 || rows[i - 1].branch_slug !== c.branch_slug) && (
                <tr className="bg-slate-50/70"><td colSpan={7} className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">{branchName(c.branch_slug)}</td></tr>
              )}
              <tr className="cursor-pointer hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs text-slate-500"><Link href={`/admin/children/${c.id}`} className="hover:text-teal-600">{c.ref ?? "—"}</Link></td>
                <td className="px-4 py-3 font-medium text-slate-900">
                  <Link href={`/admin/children/${c.id}`} className="flex items-center gap-2.5 hover:text-teal-600">
                    <Avatar name={`${c.first_name} ${c.last_name}`} src={c.photo_url} size="sm" />
                    {c.first_name} {c.last_name}
                    {sendActive(c.send_status) && <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-violet-700">SEND</span>}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-500">{ageLabel(c.dob)}</td>
                <td className="px-4 py-3 text-slate-500">{branchName(c.branch_slug)}</td>
                <td className="px-4 py-3 text-slate-500">{roomName(c.room_id)}</td>
                <td className="px-4 py-3 text-slate-500">{fundingLabel(c.funding_type)}</td>
                <td className="px-4 py-3"><StageBadge label={c.status} accent={childStatusAccent[c.status]} withDot /></td>
              </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-auto rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-lg font-heading font-bold text-slate-900">Add child</h2>
              <button type="button" onClick={() => setShowForm(false)} aria-label="Close" className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
              <Field label="First name *"><input value={form.first_name} onChange={(e) => setField({ first_name: e.target.value })} className="inp" /></Field>
              <Field label="Last name *"><input value={form.last_name} onChange={(e) => setField({ last_name: e.target.value })} className="inp" /></Field>
              <Field label="Date of birth"><input type="date" max={new Date().toISOString().slice(0, 10)} value={form.dob} onChange={(e) => setField({ dob: e.target.value })} className="inp" /></Field>
              <Field label="Gender">
                <select value={form.gender} onChange={(e) => setField({ gender: e.target.value })} className="inp bg-white">
                  <option value="">—</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option>
                </select>
              </Field>
              <Field label="Branch *">
                <select value={form.branch_slug} onChange={(e) => { setField({ branch_slug: e.target.value }); setNewRoomId(""); }} className="inp bg-white">
                  <option value="">Select branch…</option>
                  {branches.map((b) => <option key={b.slug} value={b.slug}>{branchShortName(b)}</option>)}
                </select>
              </Field>
              <Field label="Room">
                <select value={newRoomId} onChange={(e) => setNewRoomId(e.target.value)} className="inp bg-white" disabled={!form.branch_slug}>
                  <option value="">Unassigned</option>
                  {roomsForBranch.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </Field>
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

              <div className="sm:col-span-2 mt-2 border-t border-slate-100 pt-3 text-xs font-bold uppercase tracking-widest text-slate-400">Primary guardian</div>
              <Field label="Name"><input value={form.guardians?.[0]?.name ?? ""} onChange={(e) => setGuardian({ name: e.target.value })} className="inp" /></Field>
              <Field label="Relation">
                <select value={form.guardians?.[0]?.relation ?? "Mother"} onChange={(e) => setGuardian({ relation: e.target.value })} className="inp bg-white">
                  <option>Mother</option><option>Father</option><option>Guardian</option>
                </select>
              </Field>
              <Field label="Email"><input type="email" value={form.guardians?.[0]?.email ?? ""} onChange={(e) => setGuardian({ email: e.target.value })} className="inp" /></Field>
              <Field label="Phone"><input value={form.guardians?.[0]?.phone ?? ""} onChange={(e) => setGuardian({ phone: e.target.value })} className="inp" /></Field>

              <div className="sm:col-span-2 mt-2 border-t border-slate-100 pt-3 text-xs font-bold uppercase tracking-widest text-slate-400">Care notes</div>
              <div className="sm:col-span-2">
                <label className="mb-2 block text-xs font-medium text-slate-500">Allergies</label>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {allergyTerms.length === 0 && <span className="text-xs text-slate-400">No allergy tags configured — add them under Lists.</span>}
                  {allergyTerms.map((t) => {
                    const on = (form.allergy_tags ?? []).includes(t.code);
                    return <button type="button" key={t.id} onClick={() => toggleTag("allergy_tags", t.code)} className={`rounded-full px-2.5 py-1 text-xs font-medium ${on ? "bg-red-100 text-red-700" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{t.label}</button>;
                  })}
                </div>
                <input value={form.allergies} onChange={(e) => setField({ allergies: e.target.value })} className="inp" placeholder="Additional allergy notes…" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-2 block text-xs font-medium text-slate-500">Dietary requirements</label>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {dietaryTerms.length === 0 && <span className="text-xs text-slate-400">No dietary labels configured — add them under Lists.</span>}
                  {dietaryTerms.map((t) => {
                    const on = (form.dietary_tags ?? []).includes(t.code);
                    return <button type="button" key={t.id} onClick={() => toggleTag("dietary_tags", t.code)} className={`rounded-full px-2.5 py-1 text-xs font-medium ${on ? "bg-amber-100 text-amber-700" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{t.label}</button>;
                  })}
                </div>
                <input value={form.dietary_reqs} onChange={(e) => setField({ dietary_reqs: e.target.value })} className="inp" placeholder="Additional dietary notes…" />
              </div>
              <div className="sm:col-span-2"><Field label="Medical notes"><textarea value={form.medical_notes} onChange={(e) => setField({ medical_notes: e.target.value })} rows={2} className="inp" /></Field></div>
              <div className="sm:col-span-2">
                <label className="mb-2 block text-xs font-medium text-slate-500">Weekly sessions</label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
                  {WEEKDAYS.map((day) => (
                    <label key={day} className="text-sm">
                      <span className="mb-1 block text-xs font-medium text-slate-500">{day}</span>
                      <select value={sessionFor(day)} onChange={(e) => setSession(day, e.target.value)} className="inp bg-white">
                        {sessionTypeOptions.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={save} disabled={saving} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">{saving ? "Saving…" : "Create child"}</button>
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
