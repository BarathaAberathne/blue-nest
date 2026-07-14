"use client";

import { useEffect, useMemo, useState } from "react";
import { DoorOpen, Pencil, Plus, Trash2, Users, X } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { branchShortName } from "@/lib/branch";
import StatCard from "@/components/admin/ui/StatCard";
import StageBadge from "@/components/admin/ui/StageBadge";
import type { Branch, Room, RoomInput } from "@/types";

const emptyForm: RoomInput = { branch_slug: "", name: "", age_range: "", capacity: 0, staff_ratio: 0 };

export default function RoomsClient() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
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
    const [r, b] = await Promise.allSettled([api.adminGetRooms(token), api.getBranches()]);
    if (r.status === "fulfilled") setRooms((r.value as Room[]) ?? []);
    if (b.status === "fulfilled") setBranches((b.value as Branch[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const branchName = useMemo(() => {
    const m = new Map(branches.map((b) => [b.slug, branchShortName(b)]));
    return (slug: string) => m.get(slug) ?? slug;
  }, [branches]);

  const rows = useMemo(
    () => (branchFilter ? rooms.filter((r) => r.branch_slug === branchFilter) : rooms),
    [rooms, branchFilter],
  );

  const totals = useMemo(() => {
    const capacity = rooms.reduce((s, r) => s + (r.capacity ?? 0), 0);
    return { rooms: rooms.length, capacity };
  }, [rooms]);

  const openCreate = () => { setEditing(null); setForm({ ...emptyForm, branch_slug: branchFilter || branches[0]?.slug || "" }); setShowForm(true); };
  const openEdit = (r: Room) => {
    setEditing(r);
    setForm({ branch_slug: r.branch_slug, name: r.name, age_range: r.age_range ?? "", capacity: r.capacity ?? 0, staff_ratio: r.staff_ratio ?? 0 });
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
    if (!window.confirm(`Delete room “${r.name}”? Children in this room keep their record but lose the room link.`)) return;
    const token = getAccessToken();
    if (!token) return;
    try { await api.adminDeleteRoom(token, r.id); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to delete room"); }
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
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr>{["Room", "Branch", "Age range", "Capacity", "Ratio", ""].map((h) => <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-6 text-slate-400">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">No rooms yet — add your first.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{r.name}</td>
                <td className="px-4 py-3"><StageBadge label={branchName(r.branch_slug)} accent="slate" withDot={false} /></td>
                <td className="px-4 py-3 text-slate-500">{r.age_range || "—"}</td>
                <td className="px-4 py-3 text-slate-700">{r.capacity}</td>
                <td className="px-4 py-3 text-slate-500">{r.staff_ratio ? `1:${r.staff_ratio}` : "—"}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button type="button" onClick={() => openEdit(r)} aria-label="Edit" className="text-slate-400 hover:text-teal-600"><Pencil className="h-4 w-4" /></button>
                    <button type="button" onClick={() => remove(r)} aria-label="Delete" className="text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
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
              <Field label="Age range"><input value={form.age_range} onChange={(e) => setField({ age_range: e.target.value })} placeholder="e.g. 2–3 years" className="inp" /></Field>
              <Field label="Capacity"><input type="number" min={0} value={form.capacity} onChange={(e) => setField({ capacity: Number(e.target.value) })} className="inp" /></Field>
              <Field label="Staff ratio (1:x)"><input type="number" min={0} value={form.staff_ratio} onChange={(e) => setField({ staff_ratio: Number(e.target.value) })} placeholder="e.g. 4" className="inp" /></Field>
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
