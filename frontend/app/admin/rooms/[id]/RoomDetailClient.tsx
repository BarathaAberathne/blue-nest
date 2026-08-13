"use client";

// Room detail — the room profile with Overview / Staff / Children / Capacity /
// History tabs. Staff and children are allocated FROM here using the same
// authoritative assignment endpoints the staff/child profiles use, so both
// sides stay consistent (docs/rooms/room-allocation-design.md).

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, DoorOpen, Plus, Star, Users, X } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { branchShortName } from "@/lib/branch";
import StatCard from "@/components/admin/ui/StatCard";
import StageBadge from "@/components/admin/ui/StageBadge";
import { sendActive } from "@/lib/send";
import { usePermissions } from "@/lib/usePermissions";
import type {
  Branch, ChildRoomAssignment, Room, RoomCapacitySummary, Staff, StaffRoomAssignment,
} from "@/types";

type Tab = "overview" | "staff" | "children" | "capacity" | "history";

export default function RoomDetailClient({ id }: { id: string }) {
  const { has } = usePermissions();
  const canManageStaff = has("staff.manage");
  const canManageChildren = has("children.manage");

  const [room, setRoom] = useState<Room | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [capacity, setCapacity] = useState<RoomCapacitySummary | null>(null);
  const [staffAssignments, setStaffAssignments] = useState<StaffRoomAssignment[]>([]);
  const [childAssignments, setChildAssignments] = useState<ChildRoomAssignment[]>([]);
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token) { setError("Not authenticated — please sign in as admin."); setLoading(false); return; }
    try {
      const [r, b, cap, sa, ca] = await Promise.all([
        api.adminGetRoom(token, id),
        api.adminGetBranches(token),
        api.adminGetRoomCapacity(token, id),
        api.adminGetRoomStaff(token, id, true),
        api.adminGetRoomChildren(token, id, true),
      ]);
      setRoom(r);
      setBranches(b);
      setCapacity(cap);
      setStaffAssignments(sa);
      setChildAssignments(ca);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Room not found");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const branchLabel = useMemo(() => {
    const b = branches.find((x) => x.slug === room?.branch_slug);
    return b ? branchShortName(b) : room?.branch_slug ?? "";
  }, [branches, room]);

  if (loading) return <p className="text-slate-400">Loading…</p>;
  if (!room) return <p className="text-red-500">{error ?? "Room not found."}</p>;

  const activeStaff = staffAssignments.filter((a) => a.status === "active");
  const activeChildren = childAssignments.filter((a) => a.status === "active");

  return (
    <>
      <Link href="/admin/rooms" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-600">
        <ArrowLeft className="h-4 w-4" /> All rooms
      </Link>

      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">{error}</p>}

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="grid h-14 w-14 flex-none place-items-center rounded-xl bg-teal-100 text-teal-700"><DoorOpen className="h-7 w-7" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-2xl font-bold text-slate-900">{room.name}</h1>
            {room.code && <span className="font-mono text-xs text-slate-400">{room.code}</span>}
            <StageBadge label={room.status === "inactive" ? "Inactive" : "Active"} accent={room.status === "inactive" ? "slate" : "teal"} withDot={false} />
            <StageBadge label={room.provision === "send_dedicated" ? "SEND-dedicated provision" : "Mainstream"} accent={room.provision === "send_dedicated" ? "violet" : "slate"} withDot={false} />
          </div>
          <p className="mt-1 text-sm text-slate-500">{branchLabel}{room.age_range ? ` · ${room.age_range}` : ""}</p>
        </div>
      </div>

      {/* KPI strip */}
      {capacity && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
          <StatCard label="Capacity" value={capacity.capacity} icon={DoorOpen} accent="blue" />
          <StatCard label="Children placed" value={capacity.allocated_children} sub={`${capacity.future_children} scheduled`} icon={Users} accent="teal" />
          <StatCard label="Available spaces" value={capacity.available_spaces} sub={capacity.over_capacity ? "over capacity" : undefined} icon={Users} accent={capacity.over_capacity ? "amber" : "teal"} />
          <StatCard label="Staff allocated" value={capacity.staff_allocated} sub={`${capacity.present_children} present today`} icon={Users} accent="slate" />
          <StatCard label="SEND children" value={capacity.send_children} sub="count toward normal capacity" icon={Users} accent="violet" />
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b border-slate-200" role="tablist">
        {([["overview", "Overview"], ["staff", `Staff (${activeStaff.length})`], ["children", `Children (${activeChildren.length})`], ["capacity", "Capacity"], ["history", "History"]] as [Tab, string][]).map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition ${tab === k ? "border-teal-600 text-teal-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="card p-5">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
            <Item label="Branch" value={branchLabel} />
            <Item label="Code" value={room.code || "—"} />
            <Item label="Age range" value={room.age_range || "—"} />
            <Item label="Age (months)" value={room.min_age_months || room.max_age_months ? `${room.min_age_months ?? 0}–${room.max_age_months ?? 0}` : "—"} />
            <Item label="Capacity" value={String(room.capacity)} />
            <Item label="Staff ratio" value={room.staff_ratio ? `1:${room.staff_ratio}` : "—"} />
            <Item label="Status" value={room.status === "inactive" ? "Inactive" : "Active"} />
          </dl>
          {room.description && <p className="mt-4 text-sm text-slate-600">{room.description}</p>}
        </div>
      )}

      {tab === "staff" && (
        <StaffTab roomId={id} branchSlug={room.branch_slug} roomActive={room.status !== "inactive"} canManage={canManageStaff} assignments={staffAssignments} onChange={load} />
      )}

      {tab === "children" && (
        <ChildrenTab roomId={id} branchSlug={room.branch_slug} roomActive={room.status !== "inactive"} canManage={canManageChildren} sendDedicated={room.provision === "send_dedicated"} assignments={childAssignments} onChange={load} />
      )}

      {tab === "capacity" && capacity && (
        <div className="card p-5">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
            <Item label="Capacity" value={String(capacity.capacity)} />
            <Item label="Children allocated (active)" value={String(capacity.allocated_children)} />
            <Item label="Future / scheduled" value={String(capacity.future_children)} />
            <Item label="Available spaces" value={String(capacity.available_spaces)} />
            <Item label="Occupancy" value={`${capacity.occupancy_rate}%`} />
            <Item label="Staff allocated" value={String(capacity.staff_allocated)} />
            <Item label="Present today (attendance)" value={String(capacity.present_children)} />
            <Item label="Over capacity" value={capacity.over_capacity ? "Yes" : "No"} />
          </dl>
          <p className="mt-4 text-xs text-slate-400">Available spaces = capacity − currently active placements. &quot;Present today&quot; is live attendance and is shown separately; it never affects available spaces.</p>
        </div>
      )}

      {tab === "history" && (
        <div className="card p-5">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-400">Allocation history</h3>
          <ul className="space-y-1 text-sm text-slate-600">
            {[...staffAssignments.filter((a) => a.status === "ended").map((a) => ({ k: `s-${a.id}`, t: `Staff · ${a.staff_name ?? "?"} · ${a.start_date} → ${a.end_date ?? "?"}` })),
              ...childAssignments.filter((a) => a.status === "ended").map((a) => ({ k: `c-${a.id}`, t: `Child · ${a.child_name ?? "?"} · ${a.start_date} → ${a.end_date ?? "?"}${a.transfer_reason ? ` · ${a.transfer_reason}` : ""}` }))]
              .map((row) => <li key={row.k}>{row.t}</li>)}
            {staffAssignments.every((a) => a.status !== "ended") && childAssignments.every((a) => a.status !== "ended") && (
              <li className="text-slate-400">No ended allocations yet.</li>
            )}
          </ul>
        </div>
      )}
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

// ── Staff tab ─────────────────────────────────────────────────────────────────

function StaffTab({ roomId, branchSlug, roomActive, canManage, assignments, onChange }: {
  roomId: string; branchSlug: string; roomActive: boolean; canManage: boolean;
  assignments: StaffRoomAssignment[]; onChange: () => void;
}) {
  const [allStaff, setAllStaff] = useState<Staff[]>([]);
  const [adding, setAdding] = useState(false);
  const [staffId, setStaffId] = useState("");
  const [role, setRole] = useState("");
  const [primary, setPrimary] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const active = assignments.filter((a) => a.status === "active");
  const history = assignments.filter((a) => a.status === "ended");

  useEffect(() => {
    const token = getAccessToken();
    if (!token || !adding) return;
    void api.adminGetStaff(token, { branch: branchSlug }).then((s) =>
      setAllStaff(s.filter((m) => m.status !== "inactive" && !active.some((a) => a.staff_id === m.id))),
    ).catch(() => {});
  }, [adding, branchSlug, active]);

  async function add() {
    const token = getAccessToken();
    if (!token || !staffId || busy) return;
    setBusy(true); setErr(null);
    try {
      await api.adminCreateStaffRoomAssignment(token, { staff_id: staffId, room_id: roomId, role_in_room: role.trim() || undefined, is_primary: primary });
      setAdding(false); setStaffId(""); setRole(""); setPrimary(false);
      onChange();
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed to allocate staff"); }
    finally { setBusy(false); }
  }

  async function end(aid: string) {
    const token = getAccessToken();
    if (!token || busy) return;
    setBusy(true); setErr(null);
    try { await api.adminUpdateStaffRoomAssignment(token, aid, { end: true }); onChange(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Failed to end allocation"); }
    finally { setBusy(false); }
  }

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Allocated staff</h3>
        {canManage && roomActive && !adding && (
          <button type="button" onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"><Plus className="h-3.5 w-3.5" /> Add staff</button>
        )}
      </div>
      {err && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{err}</p>}
      {active.length === 0 ? <p className="text-sm text-slate-400">No staff allocated to this room.</p> : (
        <ul className="space-y-2">
          {active.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2 text-sm">
              <Link href={`/admin/staff/${a.staff_id}`} className="font-medium text-slate-800 hover:text-teal-600 hover:underline">{a.staff_name ?? "Staff"}</Link>
              {a.is_primary && <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"><Star className="h-3 w-3" /> Primary</span>}
              {a.role_in_room && <span className="text-xs text-slate-500">· {a.role_in_room}</span>}
              {canManage && <button type="button" onClick={() => end(a.id)} disabled={busy} className="ml-auto text-slate-400 hover:text-red-500 disabled:opacity-50"><X className="h-4 w-4" /></button>}
            </li>
          ))}
        </ul>
      )}
      {adding && (
        <div className="mt-3 space-y-2 rounded-lg border border-teal-200 bg-teal-50/50 p-3">
          <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="">Select a staff member…</option>
            {allStaff.map((m) => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
          </select>
          <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role in room (optional)" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={primary} onChange={(e) => setPrimary(e.target.checked)} /> Set as their primary room</label>
          <div className="flex items-center gap-2">
            <button type="button" onClick={add} disabled={!staffId || busy} className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">{busy ? "Adding…" : "Add"}</button>
            <button type="button" onClick={() => { setAdding(false); setErr(null); }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
          </div>
        </div>
      )}
      {history.length > 0 && (
        <details className="mt-4"><summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700">Previous staff ({history.length})</summary>
          <ul className="mt-2 space-y-1">{history.map((a) => <li key={a.id} className="text-xs text-slate-500">{a.staff_name ?? "Staff"} · {a.start_date} → {a.end_date ?? "?"}</li>)}</ul>
        </details>
      )}
    </div>
  );
}

// ── Children tab ──────────────────────────────────────────────────────────────

function ChildrenTab({ roomId, branchSlug, roomActive, canManage, sendDedicated, assignments, onChange }: {
  roomId: string; branchSlug: string; roomActive: boolean; canManage: boolean; sendDedicated: boolean;
  assignments: ChildRoomAssignment[]; onChange: () => void;
}) {
  const [candidates, setCandidates] = useState<{ id: string; name: string; send: boolean }[]>([]);
  const [adding, setAdding] = useState(false);
  const [childId, setChildId] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const active = assignments.filter((a) => a.status === "active");
  const history = assignments.filter((a) => a.status === "ended");

  useEffect(() => {
    const token = getAccessToken();
    if (!token || !adding) return;
    // Unallocated children in this branch (room_id empty) are the safe
    // candidates to ADD; children already in another room use Transfer.
    void api.adminGetChildren(token, { branch: branchSlug }).then((cs) =>
      setCandidates(cs.filter((c) => !c.room_id).map((c) => ({ id: c.id, name: `${c.first_name} ${c.last_name}`, send: sendActive(c.send_status) }))),
    ).catch(() => {});
  }, [adding, branchSlug]);

  async function add() {
    const token = getAccessToken();
    if (!token || !childId || busy) return;
    setBusy(true); setErr(null);
    try {
      await api.adminCreateChildRoomAssignment(token, { child_id: childId, room_id: roomId, override_reason: overrideReason.trim() || undefined });
      setAdding(false); setChildId(""); setOverrideReason("");
      onChange();
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed to allocate child"); }
    finally { setBusy(false); }
  }

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Allocated children</h3>
        {canManage && roomActive && !adding && (
          <button type="button" onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"><Plus className="h-3.5 w-3.5" /> Add child</button>
        )}
      </div>
      {err && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{err}</p>}
      {active.length === 0 ? <p className="text-sm text-slate-400">No children allocated to this room.</p> : (
        <ul className="space-y-2">
          {active.map((a) => (
            <li key={a.id} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2 text-sm">
              <Link href={`/admin/children/${a.child_id}`} className="font-medium text-slate-800 hover:text-teal-600 hover:underline">{a.child_name ?? "Child"}</Link>
              <span className="ml-auto text-xs text-slate-400">since {a.start_date}</span>
            </li>
          ))}
        </ul>
      )}
      {adding && (
        <div className="mt-3 space-y-2 rounded-lg border border-teal-200 bg-teal-50/50 p-3">
          <select value={childId} onChange={(e) => setChildId(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="">Select an unallocated child…</option>
            {candidates.map((c) => <option key={c.id} value={c.id}>{c.name}{c.send ? " · SEND support" : ""}</option>)}
          </select>
          <p className="text-xs text-slate-400">Children already in another room are moved via Transfer on their profile.</p>
          {(sendDedicated || candidates.find((c) => c.id === childId)?.send) && (
            <p className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-700">
              {[
                sendDedicated ? "This room is configured as SEND-dedicated provision." : "",
                candidates.find((c) => c.id === childId)?.send ? "This child is recorded as requiring additional SEND support." : "",
              ].filter(Boolean).join(" ")} Allocation is at management&apos;s discretion.
            </p>
          )}
          <input value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} placeholder="Override reason (only if over capacity or outside age range)" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <div className="flex items-center gap-2">
            <button type="button" onClick={add} disabled={!childId || busy} className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">{busy ? "Adding…" : "Add"}</button>
            <button type="button" onClick={() => { setAdding(false); setErr(null); }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
          </div>
        </div>
      )}
      {history.length > 0 && (
        <details className="mt-4"><summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700">Previous children ({history.length})</summary>
          <ul className="mt-2 space-y-1">{history.map((a) => <li key={a.id} className="text-xs text-slate-500">{a.child_name ?? "Child"} · {a.start_date} → {a.end_date ?? "?"}</li>)}</ul>
        </details>
      )}
    </div>
  );
}
