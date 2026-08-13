"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DoorOpen, Pencil, Plus, Trash2, Users, X } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { branchShortName } from "@/lib/branch";
import StatCard from "@/components/admin/ui/StatCard";
import StageBadge from "@/components/admin/ui/StageBadge";
import type { Branch, Room, RoomInput, TaxonomyTerm } from "@/types";

const emptyForm: RoomInput = { branch_slug: "", name: "", code: "", age_range: "", min_age_months: 0, max_age_months: 0, capacity: 0, staff_ratio: 0, provision: "" };

export default function RoomsClient() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [ageGroups, setAgeGroups] = useState<TaxonomyTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branchFilter, setBranchFilter] = useState("");

  const [editing, setEditing] = useState<Room | null>(null);
  const [form, setForm] = useState<RoomInput>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const token = getAccessToken();
    if (!token) { setError("Not authenticated — please sign in as admin."); setLoading(false); return; }
    const [r, b, g] = await Promise.allSettled([api.adminGetRooms(token), api.adminGetBranches(token), api.adminGetTaxonomy(token, "age_group")]);
    if (r.status === "fulfilled") setRooms((r.value as Room[]) ?? []);
    if (b.status === "fulfilled") setBranches((b.value as Branch[]) ?? []);
    if (g.status === "fulfilled") setAgeGroups((g.value as TaxonomyTerm[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const branchName = useMemo(() => {
    const m = new Map(branches.map((b) => [b.slug, branchShortName(b)]));
    return (slug: string) => m.get(slug) ?? slug;
  }, [branches]);

  const rows = useMemo(
    () => (branchFilter ? rooms.filter((r) => r.branch_slug === branchFilter) : rooms)
      .slice()
      .sort((a, b) => {
        const byBranch = branchName(a.branch_slug).localeCompare(branchName(b.branch_slug), undefined, { sensitivity: "base" });
        return byBranch !== 0 ? byBranch : a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      }),
    [rooms, branchFilter, branchName],
  );

  const totals = useMemo(() => {
    const capacity = rooms.reduce((s, r) => s + (r.capacity ?? 0), 0);
    return { rooms: rooms.length, capacity };
  }, [rooms]);

  const openCreate = () => { setEditing(null); setForm({ ...emptyForm, branch_slug: branchFilter || branches[0]?.slug || "" }); setShowForm(true); };
  const openEdit = (r: Room) => {
    setEditing(r);
    setForm({
      branch_slug: r.branch_slug, name: r.name, code: r.code ?? "", age_range: r.age_range ?? "",
      min_age_months: r.min_age_months ?? 0, max_age_months: r.max_age_months ?? 0,
      capacity: r.capacity ?? 0, staff_ratio: r.staff_ratio ?? 0, provision: r.provision ?? "",
    });
    setShowForm(true);
  };

  const save = async () => {
    const token = getAccessToken();
    if (!token || !form.name.trim() || !form.branch_slug) { setError("Room name and branch are required."); return; }
    setSaving(true); setError(null);
    try {
      if (editing) await api.adminUpdateRoom(token, editing.id, form);
      else await api.adminCreateRoom(token, form);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save room");
    } finally { setSaving(false); }
  };

  const remove = async (r: Room) => {
    if (!window.confirm(`Delete room “${r.name}”? Rooms with active allocations can't be deleted — deactivate them instead.`)) return;
    const token = getAccessToken();
    if (!token) return;
    try { await api.adminDeleteRoom(token, r.id); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to delete room"); }
  };

  const toggleStatus = async (r: Room) => {
    const token = getAccessToken();
    if (!token) return;
    const next = r.status === "inactive" ? "active" : "inactive";
    try { await api.adminSetRoomStatus(token, r.id, next); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to change room status"); }
  };

  const setField = (patch: Partial<RoomInput>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">Rooms</h1>
          <p className="text-sm text-slate-500">Age-banded rooms per branch. Total capacity across rooms drives occupancy &amp; available places.</p>
        </div>
        <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700">
          <Plus className="h-4 w-4" /> New room
        </button>
      </div>

      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">{error}</p>}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Rooms" value={totals.rooms} icon={DoorOpen} accent="blue" />
        <StatCard label="Total capacity" value={totals.capacity} sub="places across all rooms" icon={Users} accent="teal" />
      </div>

      <div className="mb-4">
        <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="">All branches</option>
          {branches.map((b) => <option key={b.slug} value={b.slug}>{branchShortName(b)}</option>)}
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr>{["Room", "Code", "Branch", "Age range", "Capacity", "Ratio", "Status", ""].map((h) => <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-6 text-slate-400">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-400">No rooms yet — add your first.</td></tr>
            ) : rows.map((r, i) => (
              <Fragment key={r.id}>
              {(i === 0 || rows[i - 1].branch_slug !== r.branch_slug) && (
                <tr className="bg-slate-50/70"><td colSpan={8} className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">{branchName(r.branch_slug)}</td></tr>
              )}
              <tr className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">
                  <Link href={`/admin/rooms/${r.id}`} className="hover:text-teal-600 hover:underline">{r.name}</Link>
                  {r.provision === "send_dedicated" && <span className="ml-2 rounded-full bg-violet-100 px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-violet-700">SEND</span>}
                </td>
                <td className="px-4 py-3 text-slate-500">{r.code || "—"}</td>
                <td className="px-4 py-3"><StageBadge label={branchName(r.branch_slug)} accent="slate" withDot={false} /></td>
                <td className="px-4 py-3 text-slate-500">{r.age_range || "—"}</td>
                <td className="px-4 py-3 text-slate-700">{r.capacity}</td>
                <td className="px-4 py-3 text-slate-500">{r.staff_ratio ? `1:${r.staff_ratio}` : "—"}</td>
                <td className="px-4 py-3">
                  <StageBadge label={r.status === "inactive" ? "Inactive" : "Active"} accent={r.status === "inactive" ? "slate" : "teal"} withDot={false} />
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <Link href={`/admin/rooms/${r.id}`} className="text-xs font-medium text-teal-600 hover:underline">Manage</Link>
                    <button type="button" onClick={() => toggleStatus(r)} className="text-xs text-slate-500 hover:text-slate-800">{r.status === "inactive" ? "Activate" : "Deactivate"}</button>
                    <button type="button" onClick={() => openEdit(r)} aria-label="Edit" className="text-slate-400 hover:text-teal-600"><Pencil className="h-4 w-4" /></button>
                    <button type="button" onClick={() => remove(r)} aria-label="Delete" className="text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-lg font-heading font-bold text-slate-900">{editing ? "Edit room" : "New room"}</h2>
              <button type="button" onClick={() => setShowForm(false)} aria-label="Close" className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
              <Field label="Name *"><input value={form.name} onChange={(e) => setField({ name: e.target.value })} placeholder="e.g. Toddlers" className="inp" /></Field>
              <Field label="Branch *">
                <select value={form.branch_slug} onChange={(e) => setField({ branch_slug: e.target.value })} className="inp bg-white">
                  <option value="">Select branch…</option>
                  {branches.map((b) => <option key={b.slug} value={b.slug}>{branchShortName(b)}</option>)}
                </select>
              </Field>
              <Field label="Code"><input value={form.code ?? ""} onChange={(e) => setField({ code: e.target.value })} placeholder="e.g. NEST-1" className="inp" /></Field>
              {ageGroups.length > 0 && (
                <Field label="Age group (quick fill)">
                  <select value="" onChange={(e) => { const t = ageGroups.find((a) => a.id === e.target.value); if (t) setField({ age_range: t.label, min_age_months: t.min_age_months ?? 0, max_age_months: t.max_age_months ?? 0 }); }} className="inp bg-white">
                    <option value="">Pick a configured band…</option>
                    {ageGroups.map((a) => <option key={a.id} value={a.id}>{a.label} ({a.min_age_months ?? 0}–{a.max_age_months ? a.max_age_months : "∞"} mo)</option>)}
                  </select>
                </Field>
              )}
              <Field label="Age range (label)"><input value={form.age_range} onChange={(e) => setField({ age_range: e.target.value })} placeholder="e.g. 2–3 years" className="inp" /></Field>
              <Field label="Min age (months)"><input type="number" min={0} value={form.min_age_months ?? 0} onChange={(e) => setField({ min_age_months: Number(e.target.value) })} placeholder="0 = no limit" className="inp" /></Field>
              <Field label="Max age (months)"><input type="number" min={0} value={form.max_age_months ?? 0} onChange={(e) => setField({ max_age_months: Number(e.target.value) })} placeholder="0 = no limit" className="inp" /></Field>
              <Field label="Capacity"><input type="number" min={0} value={form.capacity} onChange={(e) => setField({ capacity: Number(e.target.value) })} className="inp" /></Field>
              <Field label="Staff ratio (1:x)"><input type="number" min={0} value={form.staff_ratio} onChange={(e) => setField({ staff_ratio: Number(e.target.value) })} placeholder="e.g. 4" className="inp" /></Field>
              <Field label="Provision">
                <select value={form.provision ?? ""} onChange={(e) => setField({ provision: e.target.value as RoomInput["provision"] })} className="inp bg-white">
                  <option value="">Mainstream</option>
                  <option value="send_dedicated">SEND-dedicated</option>
                </select>
              </Field>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={save} disabled={saving} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">{saving ? "Saving…" : editing ? "Save changes" : "Create room"}</button>
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
