"use client";

// ChildRoomAllocations is the single child↔room UI, embedded on the child
// profile. It shows the current room, room history, and a Transfer flow (with
// live capacity + age warnings and an authorised-override path), talking only
// to the authoritative assignment endpoints — the same ones the room profile
// uses, so both stay consistent. It is the SOLE writer of a child's room; the
// child edit form no longer touches room_id.

import { useCallback, useEffect, useState } from "react";
import { ArrowRightLeft, DoorOpen, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import PickerModal from "@/components/admin/ui/PickerModal";
import type { ChildRoomAssignment, Room, RoomCapacitySummary } from "@/types";

export default function ChildRoomAllocations({
  childId,
  branchSlug,
  canManage,
  onChange,
  openRequest,
}: {
  childId: string;
  branchSlug: string;
  canManage: boolean;
  onChange?: () => void;
  /** Increment to open the assign/transfer popup from elsewhere on the page
      (e.g. the profile's ROOM row Change button). */
  openRequest?: number;
}) {
  const [assignments, setAssignments] = useState<ChildRoomAssignment[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [capacity, setCapacity] = useState<Record<string, RoomCapacitySummary>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<null | "assign" | "transfer">(null);
  const [busy, setBusy] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [reason, setReason] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [overrideReason, setOverrideReason] = useState("");

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    try {
      const [a, r, caps] = await Promise.all([
        api.adminGetChildRoomAssignments(token, childId),
        api.adminGetRooms(token, branchSlug),
        api.adminGetBranchRoomCapacity(token, branchSlug),
      ]);
      setAssignments(a);
      setRooms(r.filter((room) => room.status !== "inactive"));
      setCapacity(Object.fromEntries(caps.map((c) => [c.room_id, c])));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load room placements");
    } finally {
      setLoading(false);
    }
  }, [childId, branchSlug]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!openRequest || !canManage) return;
    setMode(assignments.some((a) => a.status === "active") ? "transfer" : "assign");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openRequest]);

  const current = assignments.find((a) => a.status === "active");
  const scheduled = assignments.find((a) => a.status === "scheduled");
  const history = assignments.filter((a) => a.status === "ended");
  const targetRooms = rooms.filter((r) => r.id !== current?.room_id);

  // Live warning for the chosen destination, mirroring the backend checks so
  // the manager sees why an override may be needed before confirming.
  const chosen = capacity[roomId];
  const capacityWarning = chosen && chosen.available_spaces <= 0 ? "This room is at capacity." : null;

  function reset() {
    setMode(null);
    setRoomId("");
    setReason("");
    setEffectiveDate("");
    setOverrideReason("");
    setError(null);
  }

  async function submit() {
    const token = getAccessToken();
    if (!token || !roomId || busy) return;
    if (mode === "transfer" && !reason.trim()) {
      setError("A transfer reason is required.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "assign") {
        await api.adminCreateChildRoomAssignment(token, {
          child_id: childId,
          room_id: roomId,
          override_reason: overrideReason.trim() || undefined,
        });
      } else {
        await api.adminTransferChildRoom(token, childId, {
          room_id: roomId,
          reason: reason.trim(),
          effective_date: effectiveDate || undefined,
          override_reason: overrideReason.trim() || undefined,
        });
      }
      reset();
      await load();
      onChange?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update room placement");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-400">Loading room placement…</p>;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-heading text-sm font-semibold text-slate-900">
          <DoorOpen className="h-4 w-4 text-teal-600" /> Room Placement
        </h3>
        {canManage && mode === null && (
          current ? (
            <button type="button" onClick={() => setMode("transfer")} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
              <ArrowRightLeft className="h-3.5 w-3.5" /> Transfer room
            </button>
          ) : (
            <button type="button" onClick={() => setMode("assign")} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
              <Plus className="h-3.5 w-3.5" /> Allocate room
            </button>
          )
        )}
      </div>

      {error && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

      {current ? (
        <div className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2 text-sm">
          <span className="font-medium text-slate-800">{current.room_name ?? "Room"}</span>
          <span className="text-xs text-slate-400"> · since {current.start_date}</span>
          {capacity[current.room_id] && (
            <span className="ml-2 text-xs text-slate-500">
              ({capacity[current.room_id].allocated_children}/{capacity[current.room_id].capacity} placed,
              {" "}{capacity[current.room_id].available_spaces} free)
            </span>
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-400">Not placed in a room yet.</p>
      )}

      {scheduled && (
        <p className="mt-2 text-xs text-indigo-600">
          Scheduled to move to <strong>{scheduled.room_name}</strong> on {scheduled.start_date}.
        </p>
      )}

      {mode !== null && (
        <PickerModal
          title={mode === "assign" ? "Allocate room" : "Transfer room"}
          subtitle={mode === "assign" ? "Pick a room at this branch — live availability shown." : "Pick the destination room — a reason is required, and a future date schedules the move."}
          options={targetRooms.map((r) => {
            const cap = capacity[r.id];
            const free = cap?.available_spaces;
            return {
              id: r.id,
              label: r.name + (r.code ? ` (${r.code})` : ""),
              detail: r.age_range || undefined,
              badge: cap ? (free && free > 0 ? `${free} free` : "full") : undefined,
              badgeTone: cap ? (free && free > 0 ? ("teal" as const) : ("amber" as const)) : undefined,
            };
          })}
          selectedId={roomId}
          onSelect={setRoomId}
          onClose={reset}
          emptyText="No other rooms at this branch."
        >
          <div className="mt-3 space-y-2">
            {mode === "transfer" && (
              <>
                <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for transfer (required)" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                <label className="block text-xs text-slate-500">
                  Effective date (leave blank for today; a future date schedules the move)
                  <input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </label>
              </>
            )}
            {capacityWarning && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                {capacityWarning} An override reason is required to proceed.
              </p>
            )}
            <input
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Override reason (only if over capacity or outside the age range)"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={reset} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button type="button" onClick={submit} disabled={!roomId || busy} className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">
                {busy ? "Saving…" : mode === "assign" ? "Allocate" : "Transfer"}
              </button>
            </div>
          </div>
        </PickerModal>
      )}

      {history.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700">
            Room history ({history.length})
          </summary>
          <ul className="mt-2 space-y-1">
            {history.map((a) => (
              <li key={a.id} className="text-xs text-slate-500">
                {a.room_name ?? "Room"} · {a.start_date} → {a.end_date ?? "?"}
                {a.transfer_reason ? ` · ${a.transfer_reason}` : ""}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
