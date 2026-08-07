"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, DoorOpen, UserPlus, Users, X } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken, scopedBranches } from "@/lib/auth";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import { branchShortName } from "@/lib/branch";
import type { Branch, CapacityDay, CapacityForecast, CapacityWeek, Child, RoomCapacityForecast } from "@/types";

type Tab = "planner" | "availability";

const fmtWeek = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

// The worst (lowest) available slot across a room's week, plus which day/
// session it was — the single number that answers "can I take a new child
// this week?" without drowning the heatmap in every day's detail.
function weekWorst(week: CapacityWeek): { available: number; label: string } {
  let worst = Infinity;
  let label = "";
  for (const d of week.days) {
    if (d.am_available < worst) { worst = d.am_available; label = `${d.day} AM`; }
    if (d.pm_available < worst) { worst = d.pm_available; label = `${d.day} PM`; }
  }
  return { available: worst === Infinity ? 0 : worst, label };
}

function availabilityTone(available: number): string {
  if (available < 0) return "bg-red-100 text-red-700";
  if (available === 0) return "bg-amber-100 text-amber-700";
  if (available <= 2) return "bg-amber-50 text-amber-600";
  return "bg-green-50 text-green-700";
}

function SessionCell({ day, capacity }: { day: CapacityDay; capacity: number }) {
  const overbooked = day.am_available < 0 || day.pm_available < 0;
  return (
    <td className={`px-3 py-2.5 text-center align-top ${overbooked ? "bg-red-50" : ""}`}>
      <div className="flex items-center justify-center gap-3">
        <SessionSlot label="AM" children_={day.am_children} capacity={capacity} available={day.am_available} staff={day.am_staff_required} />
        <SessionSlot label="PM" children_={day.pm_children} capacity={capacity} available={day.pm_available} staff={day.pm_staff_required} />
      </div>
    </td>
  );
}

function SessionSlot({ label, children_, capacity, available, staff }: { label: string; children_: number; capacity: number; available: number; staff: number }) {
  return (
    <div className="min-w-[52px]">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`text-sm font-bold ${available < 0 ? "text-red-600" : "text-slate-800"}`}>{children_}<span className="text-slate-400">/{capacity}</span></p>
      <p className="flex items-center justify-center gap-0.5 text-[11px] text-slate-400"><Users className="h-3 w-3" /> {staff}</p>
    </div>
  );
}

export default function RoomPlannerClient() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchFilter, setBranchFilter] = useState("");
  const [forecast, setForecast] = useState<CapacityForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("planner");
  const [weekIndex, setWeekIndex] = useState(0);
  const [assignFor, setAssignFor] = useState<RoomCapacityForecast | null>(null);

  const reloadForecast = () => {
    const token = getAccessToken();
    if (!token) return;
    api.adminGetCapacityForecast(token, { branch: branchFilter, weeks: 12 })
      .then((f) => setForecast(f as CapacityForecast))
      .catch(() => { /* keep the current view */ });
  };
  // The planner tracks live session/allocation changes: silent background
  // refresh (30s + on tab focus), same pattern as the attendance pages.
  useAutoRefresh(reloadForecast, 30_000);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    api.adminGetBranches(token).then((b) => setBranches(scopedBranches((b as Branch[]) ?? []))).catch(() => {});
  }, []);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) { setError("Not authenticated — please sign in as admin."); setLoading(false); return; }
    setLoading(true); setError(null);
    api.adminGetCapacityForecast(token, { branch: branchFilter, weeks: 12 })
      .then((f) => { setForecast(f as CapacityForecast); setWeekIndex(0); })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load capacity forecast"))
      .finally(() => setLoading(false));
  }, [branchFilter]);

  const rooms = useMemo(() => forecast?.rooms ?? [], [forecast]);
  const weeks = forecast?.weeks ?? [];
  const branchName = useMemo(() => {
    const m = new Map(branches.map((b) => [b.slug, branchShortName(b)]));
    return (slug: string) => m.get(slug) ?? slug;
  }, [branches]);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">Room planner</h1>
          <p className="text-sm text-slate-500">Booked children and required staff by room and session, projected forward from each child&apos;s weekly sessions — plus a 12-week spare-capacity view.</p>
        </div>
        <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="">All branches</option>
          {branches.map((b) => <option key={b.slug} value={b.slug}>{branchShortName(b)}</option>)}
        </select>
      </div>

      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">{error}</p>}

      <div className="mb-5 flex gap-1.5">
        <button type="button" onClick={() => setTab("planner")} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${tab === "planner" ? "bg-teal-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>Room planner</button>
        <button type="button" onClick={() => setTab("availability")} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${tab === "availability" ? "bg-teal-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>Future availability</button>
      </div>

      {loading ? (
        <p className="text-slate-400">Loading…</p>
      ) : rooms.length === 0 ? (
        <div className="card p-8 text-center text-sm text-slate-400">No rooms found for this branch.</div>
      ) : tab === "planner" ? (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <button type="button" disabled={weekIndex === 0} onClick={() => setWeekIndex((i) => Math.max(0, i - 1))} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /> Prev</button>
            <span className="text-sm font-semibold text-slate-800">Week of {fmtWeek(weeks[weekIndex] ?? "")}</span>
            <button type="button" disabled={weekIndex >= weeks.length - 1} onClick={() => setWeekIndex((i) => Math.min(weeks.length - 1, i + 1))} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40">Next <ChevronRight className="h-4 w-4" /></button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-medium">Room</th>
                  {(rooms[0]?.weeks[weekIndex]?.days ?? []).map((d) => (
                    <th key={d.day} className="px-3 py-3 text-center font-medium">{d.day}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rooms.map((room) => {
                  const week = room.weeks[weekIndex];
                  const overbookedAny = week?.days.some((d) => d.am_available < 0 || d.pm_available < 0);
                  return (
                    <tr key={room.room_id} className="align-top hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-2 font-semibold text-slate-800"><DoorOpen className="h-4 w-4 text-slate-400" /> {room.room_name}</div>
                        <p className="mt-0.5 text-xs text-slate-400">{branchName(room.branch_slug)} · cap {room.capacity} · 1:{room.staff_ratio || "—"}</p>
                        {overbookedAny && <p className="mt-1 flex items-center gap-1 text-xs font-medium text-red-600"><AlertTriangle className="h-3.5 w-3.5" /> Over capacity</p>}
                        <button type="button" onClick={() => setAssignFor(room)}
                          className="mt-1.5 inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
                          <UserPlus className="h-3 w-3" /> Assign child
                        </button>
                      </td>
                      {week?.days.map((d) => <SessionCell key={d.day} day={d} capacity={room.capacity} />)}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">Each cell shows children booked / room capacity, and <Users className="inline h-3 w-3 align-text-bottom" />&nbsp;required staff (1 staff : {rooms[0]?.staff_ratio ?? "N"} ratio, rounded up). Sessions classify into AM/PM from the org&apos;s configured session times; children count from their start date, and scheduled room moves apply from their effective date. Not term-date aware.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-medium">Room</th>
                  {weeks.map((w) => <th key={w} className="px-2 py-3 text-center font-medium">{fmtWeek(w)}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rooms.map((room) => (
                  <tr key={room.room_id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-2 font-semibold text-slate-800"><DoorOpen className="h-4 w-4 text-slate-400" /> {room.room_name}</div>
                      <p className="mt-0.5 text-xs text-slate-400">{branchName(room.branch_slug)} · cap {room.capacity}</p>
                    </td>
                    {room.weeks.map((week, i) => {
                      const { available, label } = weekWorst(week);
                      return (
                        <td key={weeks[i]} className="px-2 py-3 text-center">
                          <span title={`${label}: ${available} available`} className={`inline-flex h-8 min-w-[36px] items-center justify-center rounded-lg px-1.5 text-sm font-bold ${availabilityTone(available)}`}>
                            {available}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
            <span className="font-medium text-slate-600">Legend — spare places, worst session that week:</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-green-50" /> Plenty</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-amber-50" /> Nearly full</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-amber-100" /> Full</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-red-100" /> Overbooked</span>
          </div>
        </div>
      )}

      {assignFor && (
        <AssignChildModal
          room={assignFor}
          onClose={() => setAssignFor(null)}
          onDone={() => { setAssignFor(null); reloadForecast(); }}
        />
      )}
    </>
  );
}

// AssignChildModal places a child into a room straight from the planner — the
// page that answers "where is there space?" now acts on the answer. Reuses the
// canonical assignment endpoints: children with no active room are assigned,
// children already placed are transferred (reason required); capacity/age-band
// rejections surface the server message with an override-reason field.
function AssignChildModal({ room, onClose, onDone }: { room: RoomCapacityForecast; onClose: () => void; onDone: () => void }) {
  const token = typeof window !== "undefined" ? getAccessToken() : "";
  const [children, setChildren] = useState<Child[]>([]);
  const [childId, setChildId] = useState("");
  const [reason, setReason] = useState("");
  const [override, setOverride] = useState("");
  const [needsOverride, setNeedsOverride] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api.adminGetChildren(token)
      .then((all) => setChildren(((all as Child[]) ?? []).filter((c) => c.branch_slug === room.branch_slug && c.status !== "left" && c.room_id !== room.room_id)))
      .catch(() => setErr("Failed to load children"));
  }, [token, room.branch_slug, room.room_id]);

  const selected = children.find((c) => c.id === childId);
  const isTransfer = !!selected?.room_id;

  const submit = async () => {
    if (!token || !selected) return;
    if (isTransfer && !reason.trim()) { setErr("A transfer reason is required."); return; }
    setSaving(true); setErr(null);
    try {
      if (isTransfer) {
        await api.adminTransferChildRoom(token, selected.id, { room_id: room.room_id, reason: reason.trim(), override_reason: override.trim() || undefined });
      } else {
        await api.adminCreateChildRoomAssignment(token, { child_id: selected.id, room_id: room.room_id, override_reason: override.trim() || undefined });
      }
      onDone();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to assign";
      setErr(msg);
      if (/capacity|age range|override/i.test(msg)) setNeedsOverride(true);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold text-slate-900">Assign child — {room.room_name}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button>
        </div>
        {err && <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p>}
        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-xs font-medium text-slate-500">Child ({children.length} at this branch)</span>
          <select value={childId} onChange={(e) => { setChildId(e.target.value); setErr(null); setNeedsOverride(false); }} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
            <option value="">Select a child…</option>
            {children.map((c) => (
              <option key={c.id} value={c.id}>{c.first_name} {c.last_name}{c.room_name ? ` — currently ${c.room_name}` : " — no room"}</option>
            ))}
          </select>
        </label>
        {isTransfer && (
          <label className="mb-3 block text-sm">
            <span className="mb-1 block text-xs font-medium text-slate-500">Reason for transfer (required)</span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </label>
        )}
        {needsOverride && (
          <label className="mb-3 block text-sm">
            <span className="mb-1 block text-xs font-medium text-slate-500">Override reason (capacity / age-range rule)</span>
            <input value={override} onChange={(e) => setOverride(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </label>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
          <button type="button" onClick={submit} disabled={saving || !childId}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">
            {saving ? "Saving…" : isTransfer ? "Transfer here" : "Assign here"}
          </button>
        </div>
      </div>
    </div>
  );
}
