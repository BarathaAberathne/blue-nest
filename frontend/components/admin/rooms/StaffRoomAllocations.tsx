"use client";

// StaffRoomAllocations is the single Room Allocations UI for a staff member,
// embedded on the staff profile. It replaces the old read-only "Room" field
// that could never be edited (see docs/rooms/staff-room-field-investigation.md)
// and talks ONLY to the authoritative assignment endpoints — the same ones the
// room profile uses, so both views stay consistent.

import { useCallback, useEffect, useState } from "react";
import { DoorOpen, Plus, Star, X } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import type { Room, StaffRoomAssignment } from "@/types";

export default function StaffRoomAllocations({
  staffId,
  branchSlug,
  canManage,
  onChange,
}: {
  staffId: string;
  branchSlug: string;
  canManage: boolean;
  onChange?: () => void;
}) {
  const [assignments, setAssignments] = useState<StaffRoomAssignment[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [role, setRole] = useState("");
  const [primary, setPrimary] = useState(false);

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    try {
      const [a, r] = await Promise.all([
        api.adminGetStaffRoomAssignments(token, staffId, true),
        api.adminGetRooms(token, branchSlug),
      ]);
      setAssignments(a);
      setRooms(r.filter((room) => room.status !== "inactive"));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load room allocations");
    } finally {
      setLoading(false);
    }
  }, [staffId, branchSlug]);

  useEffect(() => {
    void load();
  }, [load]);

  const current = assignments.filter((a) => a.status === "active");
  const history = assignments.filter((a) => a.status === "ended");
  // Rooms not already actively assigned — avoids the duplicate-allocation 400.
  const availableRooms = rooms.filter((r) => !current.some((a) => a.room_id === r.id));

  async function add() {
    const token = getAccessToken();
    if (!token || !roomId || busy) return;
    setBusy(true);
    try {
      await api.adminCreateStaffRoomAssignment(token, {
        staff_id: staffId,
        room_id: roomId,
        role_in_room: role.trim() || undefined,
        is_primary: primary,
      });
      setAdding(false);
      setRoomId("");
      setRole("");
      setPrimary(false);
      await load();
      onChange?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to allocate room");
    } finally {
      setBusy(false);
    }
  }

  async function end(id: string) {
    const token = getAccessToken();
    if (!token || busy) return;
    setBusy(true);
    try {
      await api.adminUpdateStaffRoomAssignment(token, id, { end: true });
      await load();
      onChange?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to end allocation");
    } finally {
      setBusy(false);
    }
  }

  async function makePrimary(id: string) {
    const token = getAccessToken();
    if (!token || busy) return;
    setBusy(true);
    try {
      await api.adminUpdateStaffRoomAssignment(token, id, { is_primary: true });
      await load();
      onChange?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to set primary room");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-400">Loading room allocations…</p>;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-heading text-sm font-semibold text-slate-900">
          <DoorOpen className="h-4 w-4 text-teal-600" /> Room Allocations
        </h3>
        {canManage && !adding && availableRooms.length > 0 && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <Plus className="h-3.5 w-3.5" /> Allocate room
          </button>
        )}
      </div>

      {error && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

      {current.length === 0 && !adding && (
        <p className="text-sm text-slate-400">Not allocated to any room yet.</p>
      )}

      <ul className="space-y-2">
        {current.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
            <span className="font-medium text-slate-800">{a.room_name ?? "Room"}</span>
            {a.is_primary && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                <Star className="h-3 w-3" /> Primary
              </span>
            )}
            {a.role_in_room && <span className="text-xs text-slate-500">· {a.role_in_room}</span>}
            <span className="text-xs text-slate-400">· since {a.start_date}</span>
            {canManage && (
              <span className="ml-auto flex items-center gap-2">
                {!a.is_primary && (
                  <button type="button" onClick={() => makePrimary(a.id)} disabled={busy} className="text-xs text-slate-500 hover:text-amber-600 disabled:opacity-50">
                    Make primary
                  </button>
                )}
                <button type="button" onClick={() => end(a.id)} disabled={busy} title="End allocation" className="text-slate-400 hover:text-red-500 disabled:opacity-50">
                  <X className="h-4 w-4" />
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>

      {adding && (
        <div className="mt-3 space-y-2 rounded-lg border border-teal-200 bg-teal-50/50 p-3">
          <select value={roomId} onChange={(e) => setRoomId(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="">Select a room…</option>
            {availableRooms.map((r) => (
              <option key={r.id} value={r.id}>{r.name}{r.code ? ` (${r.code})` : ""}</option>
            ))}
          </select>
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Role in room (optional, e.g. Room Leader)"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={primary} onChange={(e) => setPrimary(e.target.checked)} /> Set as primary room
          </label>
          <div className="flex items-center gap-2">
            <button type="button" onClick={add} disabled={!roomId || busy} className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">
              {busy ? "Allocating…" : "Allocate"}
            </button>
            <button type="button" onClick={() => { setAdding(false); setError(null); }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700">
            Previous rooms ({history.length})
          </summary>
          <ul className="mt-2 space-y-1">
            {history.map((a) => (
              <li key={a.id} className="text-xs text-slate-500">
                {a.room_name ?? "Room"} · {a.start_date} → {a.end_date ?? "?"}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
