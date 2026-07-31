"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, KeyRound, Plus, Search, ShieldCheck, UserCheck, Users, X } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { branchShortName } from "@/lib/branch";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import StatCard from "@/components/admin/ui/StatCard";
import StageBadge from "@/components/admin/ui/StageBadge";
import { dbsExpiry, staffStatusAccent, staffStatusLabel, staffTypeAccent, staffTypeLabel } from "@/lib/staff";
import type { Branch, Room, Staff, StaffInput, StaffStats } from "@/types";

const emptyForm: StaffInput = {
  first_name: "", last_name: "", email: "", phone: "", branch_slug: "",
  job_title: "", staff_type: "permanent", status: "active", start_date: "", contract_hours: 40,
  qualifications: [], dbs_number: "", dbs_expiry: "", first_aid_expiry: "",
  enable_login: false, login_role: "staff", login_password: "",
};

// Roles that can be granted to a person's optional system login.
const LOGIN_ROLES = ["staff", "branch_manager", "deputy_manager", "regional_manager", "finance", "admissions", "procurement"] as const;

export default function StaffClient() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [stats, setStats] = useState<StaffStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [branchFilter, setBranchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [q, setQ] = useState("");

  const [form, setForm] = useState<StaffInput>(emptyForm);
  const [rooms, setRooms] = useState<Room[]>([]);
  // Optional room to allocate the new staff member to on create — a first-class
  // staff-room-assignment call, not a field on the staff record.
  const [newRoomId, setNewRoomId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const token = getAccessToken();
    if (!token) { setError("Not authenticated — please sign in as admin."); setLoading(false); return; }
    const [s, b, st, r] = await Promise.allSettled([api.adminGetStaff(token), api.getBranches(), api.adminGetStaffStats(token), api.adminGetRooms(token)]);
    if (s.status === "fulfilled") setStaff((s.value as Staff[]) ?? []);
    if (b.status === "fulfilled") setBranches((b.value as Branch[]) ?? []);
    if (st.status === "fulfilled") setStats(st.value as StaffStats);
    if (r.status === "fulfilled") setRooms((r.value as Room[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);
  useAutoRefresh(load, 30_000);

  const branchName = useMemo(() => {
    const m = new Map(branches.map((b) => [b.slug, branchShortName(b)]));
    return (slug: string) => m.get(slug) ?? slug;
  }, [branches]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = staff.filter((s) => {
      if (branchFilter && s.branch_slug !== branchFilter) return false;
      if (statusFilter && s.status !== statusFilter) return false;
      if (needle) {
        // Room is searchable too (resolved room_name projection).
        const hay = `${s.first_name} ${s.last_name} ${s.ref ?? ""} ${s.job_title ?? ""} ${s.room_name ?? ""}`.toLowerCase();
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
  }, [staff, branchFilter, statusFilter, q, branchName]);

  const exportCsv = () => {
    const header = ["Ref", "First name", "Last name", "Job title", "Type", "Branch", "Status", "DBS expiry", "Email"];
    const lines = rows.map((s) => [
      s.ref ?? "", s.first_name, s.last_name, s.job_title ?? "", s.staff_type,
      branchName(s.branch_slug), s.status, s.dbs_expiry ?? "", s.email ?? "",
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `staff-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const openCreate = () => {
    setForm({ ...emptyForm, branch_slug: branchFilter || branches[0]?.slug || "" });
    setNewRoomId("");
    setShowForm(true);
  };

  // Rooms selectable for the new staff member — the chosen branch's active rooms.
  const roomsForBranch = useMemo(
    () => rooms.filter((r) => r.branch_slug === form.branch_slug && r.status !== "inactive"),
    [rooms, form.branch_slug],
  );

  const save = async () => {
    const token = getAccessToken();
    if (!token || !form.first_name.trim() || !form.last_name.trim() || !form.branch_slug) {
      setError("First name, last name and branch are required."); return;
    }
    setSaving(true); setError(null);
    try {
      const created = await api.adminCreateStaff(token, form);
      // Allocate the room, if one was picked, via the canonical assignment
      // endpoint (the same one the staff/room profiles use). If the allocation
      // is rejected (inactive room / cross-branch / duplicate), roll the
      // just-created staff record back so the whole create is atomic — the user
      // saw an error, so nothing should persist. Single-node Mongo has no
      // multi-doc transactions; compensating rollback is the established
      // pattern here (see docs/rooms/room-allocation-design.md).
      if (newRoomId && created?.id) {
        try {
          await api.adminCreateStaffRoomAssignment(token, { staff_id: created.id, room_id: newRoomId, is_primary: true });
        } catch (assignErr) {
          const reason = assignErr instanceof Error ? assignErr.message : "Room allocation failed";
          try {
            await api.adminDeleteStaff(token, created.id);
          } catch {
            throw new Error(`${reason}. The staff member was created but could not be placed — open the profile to assign a valid room.`);
          }
          throw new Error(`${reason}. The staff member was not created — pick a valid room, or leave it unassigned.`);
        }
      }
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save staff");
    } finally { setSaving(false); }
  };

  const setField = (patch: Partial<StaffInput>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">Staff</h1>
          <p className="text-sm text-slate-500">Your workforce across every branch — roles, qualifications, DBS &amp; contract hours.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <Download className="h-4 w-4" /> CSV
          </button>
          <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700">
            <Plus className="h-4 w-4" /> Add staff
          </button>
        </div>
      </div>

      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">{error}</p>}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total staff" value={stats?.total ?? staff.length} icon={Users} accent="blue" />
        <StatCard label="Present today" value={stats?.present ?? "—"} sub={stats ? `${stats.on_leave} on leave · ${stats.sick} sick` : undefined} icon={UserCheck} accent="green" />
        <StatCard label="Agency today" value={stats?.agency ?? "—"} accent="violet" />
        <StatCard label="DBS expiring" value={stats?.dbs_expiring ?? "—"} sub="within 90 days" icon={ShieldCheck} accent="amber" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, ref or role…" className="rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-sm" />
        </div>
        <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="">All branches</option>
          {branches.map((b) => <option key={b.slug} value={b.slug}>{branchShortName(b)}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="on_leave">On leave</option>
          <option value="inactive">Inactive</option>
        </select>
        <span className="ml-auto text-sm text-slate-400">{rows.length} shown</span>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr>{["Ref", "Name", "Role", "Type", "Branch", "Room", "DBS", "Status"].map((h) => <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-6 text-slate-400">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-400">No staff match.</td></tr>
            ) : rows.map((s) => {
              const dbs = dbsExpiry(s.dbs_expiry);
              return (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500"><Link href={`/admin/staff/${s.id}`} className="hover:text-teal-600">{s.ref ?? "—"}</Link></td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <Link href={`/admin/staff/${s.id}`} className="hover:text-teal-600">{s.first_name} {s.last_name}</Link>
                    {s.user_id && <span className="ml-2 inline-flex items-center gap-1 align-middle text-[0.7rem] font-medium text-teal-600" title="Has a system login"><KeyRound className="h-3 w-3" /> login</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{s.job_title || "—"}</td>
                  <td className="px-4 py-3"><StageBadge label={staffTypeLabel[s.staff_type]} accent={staffTypeAccent[s.staff_type]} withDot={false} /></td>
                  <td className="px-4 py-3 text-slate-500">{branchName(s.branch_slug)}</td>
                  <td className="px-4 py-3 text-slate-500">{s.room_name || "—"}</td>
                  <td className="px-4 py-3">{dbs ? <StageBadge label={dbs.label} accent={dbs.accent} withDot={false} /> : <span className="text-slate-400">—</span>}</td>
                  <td className="px-4 py-3"><StageBadge label={staffStatusLabel[s.status]} accent={staffStatusAccent[s.status]} withDot /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-auto rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-lg font-heading font-bold text-slate-900">Add staff</h2>
              <button type="button" onClick={() => setShowForm(false)} aria-label="Close" className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
              <Field label="First name *"><input value={form.first_name} onChange={(e) => setField({ first_name: e.target.value })} className="inp" /></Field>
              <Field label="Last name *"><input value={form.last_name} onChange={(e) => setField({ last_name: e.target.value })} className="inp" /></Field>
              <Field label="Job title"><input value={form.job_title} onChange={(e) => setField({ job_title: e.target.value })} placeholder="e.g. Room Leader" className="inp" /></Field>
              <Field label="Branch *">
                <select value={form.branch_slug} onChange={(e) => { setField({ branch_slug: e.target.value }); setNewRoomId(""); }} className="inp bg-white">
                  <option value="">Select branch…</option>
                  {branches.map((b) => <option key={b.slug} value={b.slug}>{branchShortName(b)}</option>)}
                </select>
              </Field>
              <Field label="Room (optional)">
                <select value={newRoomId} onChange={(e) => setNewRoomId(e.target.value)} className="inp bg-white" disabled={!form.branch_slug}>
                  <option value="">No room yet</option>
                  {roomsForBranch.map((r) => <option key={r.id} value={r.id}>{r.name}{r.code ? ` (${r.code})` : ""}</option>)}
                </select>
              </Field>
              <Field label="Employment type">
                <select value={form.staff_type} onChange={(e) => setField({ staff_type: e.target.value as StaffInput["staff_type"] })} className="inp bg-white">
                  <option value="permanent">Permanent</option><option value="agency">Agency</option><option value="bank">Bank</option>
                </select>
              </Field>
              <Field label="Status">
                <select value={form.status} onChange={(e) => setField({ status: e.target.value as StaffInput["status"] })} className="inp bg-white">
                  <option value="active">Active</option><option value="on_leave">On leave</option><option value="inactive">Inactive</option>
                </select>
              </Field>
              <Field label="Email"><input type="email" value={form.email} onChange={(e) => setField({ email: e.target.value })} className="inp" /></Field>
              <Field label="Phone"><input value={form.phone} onChange={(e) => setField({ phone: e.target.value })} className="inp" /></Field>
              <Field label="Start date"><input type="date" value={form.start_date} onChange={(e) => setField({ start_date: e.target.value })} className="inp" /></Field>
              <Field label="Contract hours / week"><input type="number" min={0} value={form.contract_hours} onChange={(e) => setField({ contract_hours: Number(e.target.value) })} className="inp" /></Field>
              <Field label="Term-time only">
                <label className="mt-1 flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={form.term_time_only ?? false} onChange={(e) => setField({ term_time_only: e.target.checked })} />
                  Contracted for term dates only
                </label>
              </Field>
              <Field label="DBS number"><input value={form.dbs_number} onChange={(e) => setField({ dbs_number: e.target.value })} className="inp" /></Field>
              <Field label="DBS expiry"><input type="date" value={form.dbs_expiry} onChange={(e) => setField({ dbs_expiry: e.target.value })} className="inp" /></Field>
              <Field label="Paediatric first aid expiry"><input type="date" value={form.first_aid_expiry} onChange={(e) => setField({ first_aid_expiry: e.target.value })} className="inp" /></Field>
              <div className="sm:col-span-2"><Field label="Qualifications (comma-separated)"><input value={(form.qualifications ?? []).join(", ")} onChange={(e) => setField({ qualifications: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} placeholder="Level 3 Early Years, Paediatric First Aid" className="inp" /></Field></div>

              <div className="sm:col-span-2 mt-2 rounded-lg border border-slate-100 bg-slate-50 p-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                  <input type="checkbox" checked={!!form.enable_login} onChange={(e) => setField({ enable_login: e.target.checked })} className="h-4 w-4 rounded" />
                  Enable system login for this person
                </label>
                <p className="mt-1 text-xs text-slate-400">One profile — the same person, with an optional login. They&apos;ll sign in with their email, scoped to {form.branch_slug ? branchName(form.branch_slug) : "their branch"}.</p>
                {form.enable_login && (
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Login role">
                      <select value={form.login_role} onChange={(e) => setField({ login_role: e.target.value as StaffInput["login_role"] })} className="inp bg-white">
                        {LOGIN_ROLES.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
                      </select>
                    </Field>
                    <Field label="Password (min 8 chars)"><input type="password" value={form.login_password ?? ""} onChange={(e) => setField({ login_password: e.target.value })} placeholder="Leave blank to link an existing account" className="inp" /></Field>
                    {!form.email && <p className="sm:col-span-2 text-xs text-amber-600">⚠ An email is required to enable login.</p>}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={save} disabled={saving} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">{saving ? "Saving…" : "Create staff"}</button>
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
