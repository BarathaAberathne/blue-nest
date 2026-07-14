"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, ChevronLeft, ChevronRight, DoorOpen, Plus, Trash2, UserPlus, Users, X } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { branchShortName } from "@/lib/branch";
import type { Branch, Room, Shift, Staff } from "@/types";

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
function mondayOf(d: Date) { const x = new Date(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); x.setHours(0, 0, 0, 0); return x; }
const PRESETS = ["08:00-16:00", "08:00-17:00", "09:00-17:00", "07:30-18:00", "08:00-13:00", "13:00-18:00"];

const COVER_KEY = "__cover__"; // room bucket for external cover with no room

// A rota row is one person's week — either a rostered staff member or an
// off-roster cover person (identified by name, no staff record).
type Row = { key: string; name: string; subtitle: string; roomId: string; external: boolean; staff?: Staff };
type EditState = { row: Row; date: string; shift?: Shift; roomId: string; start: string; end: string };
type CoverState = { mode: "staff" | "external"; staffId: string; name: string; date: string; roomId: string; start: string; end: string };

// cellKey identifies a person for shift lookup: staff by id, cover by name.
const cellKey = (external: boolean, id: string, name: string) => (external ? `ext:${name}` : id);

export default function RotaClient() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branch, setBranch] = useState("");
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [staff, setStaff] = useState<Staff[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [cover, setCover] = useState<CoverState | null>(null);
  const [saving, setSaving] = useState(false);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(d.getDate() + i); return d; }), [weekStart]);
  const weekKey = ymd(weekStart);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) { setError("Not authenticated."); setLoading(false); return; }
    api.adminGetBranches(token).then((b) => {
      const live = (b ?? []).filter((x) => !x.archived_at);
      setBranches(live);
      setBranch((cur) => cur || live[0]?.slug || "");
    }).catch(() => setError("Failed to load branches."));
  }, []);

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token || !branch) return;
    setLoading(true);
    try {
      const [st, rm, sh] = await Promise.all([
        api.adminGetStaff(token, { branch, status: "active" }),
        api.adminGetRooms(token, branch),
        api.adminGetShifts(token, branch, weekKey),
      ]);
      setStaff((st as Staff[]) ?? []);
      setRooms((rm as Room[]) ?? []);
      setShifts(sh ?? []);
      setError(null);
    } catch { setError("Failed to load rota."); }
    finally { setLoading(false); }
  }, [branch, weekKey]);
  useEffect(() => { void load(); }, [load]);

  // shift lookup: `${person}|${date}` → shift
  const byCell = useMemo(() => {
    const m = new Map<string, Shift>();
    for (const s of shifts) m.set(`${cellKey(!!s.external, s.staff_id ?? "", s.staff_name)}|${s.date}`, s);
    return m;
  }, [shifts]);
  const cellShift = (row: Row, date: string) => byCell.get(`${row.key}|${date}`);

  // Off-roster cover people are derived from the week's external shifts.
  const coverRows = useMemo<Row[]>(() => {
    const seen = new Map<string, Row>();
    for (const s of shifts.filter((x) => x.external)) {
      const key = `ext:${s.staff_name}`;
      if (!seen.has(key)) seen.set(key, { key, name: s.staff_name, subtitle: "Cover", roomId: s.room_id || COVER_KEY, external: true });
    }
    return [...seen.values()];
  }, [shifts]);

  // Group rows by classroom. Rostered staff sit under their assigned room; the
  // roomless (managers / office) go to "Unassigned" (hidden unless Show all);
  // external cover sits under its room or a "Cover & visitors" bucket.
  const groups = useMemo(() => {
    const staffRows: Row[] = staff.map((m) => ({ key: m.id, name: `${m.first_name} ${m.last_name}`, subtitle: m.job_title || "Staff", roomId: m.room_id || "", external: false, staff: m }));
    const rowsFor = (roomId: string) => [
      ...staffRows.filter((r) => r.roomId === roomId),
      ...coverRows.filter((r) => r.roomId === roomId),
    ].sort((a, b) => a.name.localeCompare(b.name));

    const out: { id: string; label: string; icon: "room" | "office" | "cover"; rows: Row[] }[] = [];
    for (const rm of rooms) {
      const rows = rowsFor(rm.id);
      if (rows.length) out.push({ id: rm.id, label: rm.name, icon: "room", rows });
    }
    const roomless = staffRows.filter((r) => !r.roomId);
    if (showAll && roomless.length) out.push({ id: "__office__", label: "Unassigned / office", icon: "office", rows: roomless.sort((a, b) => a.name.localeCompare(b.name)) });
    const coverNoRoom = coverRows.filter((r) => r.roomId === COVER_KEY);
    if (coverNoRoom.length) out.push({ id: COVER_KEY, label: "Cover & visitors", icon: "cover", rows: coverNoRoom });
    return out;
  }, [staff, rooms, coverRows, showAll]);

  const hiddenCount = useMemo(() => staff.filter((m) => !m.room_id).length, [staff]);

  const openCell = (row: Row, date: string) => {
    const sh = cellShift(row, date);
    setEdit({ row, date, shift: sh, roomId: sh?.room_id ?? row.staff?.room_id ?? (row.roomId === COVER_KEY ? "" : row.roomId), start: sh?.start_time ?? "08:00", end: sh?.end_time ?? "16:00" });
  };

  const save = async () => {
    if (!edit) return;
    const token = getAccessToken();
    if (!token) return;
    if (edit.end <= edit.start) { setError("End time must be after start time."); return; }
    setSaving(true); setError(null);
    const base = { room_id: edit.roomId || undefined, date: edit.date, start_time: edit.start, end_time: edit.end };
    const body = edit.row.external
      ? { ...base, external: true, staff_name: edit.row.name, branch_slug: branch }
      : { ...base, staff_id: edit.row.staff!.id };
    try {
      if (edit.shift) await api.adminUpdateShift(token, edit.shift.id, body);
      else await api.adminCreateShift(token, body);
      setEdit(null);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to save shift"); }
    finally { setSaving(false); }
  };

  const remove = async () => {
    if (!edit?.shift) return;
    const token = getAccessToken();
    if (!token) return;
    setSaving(true);
    try { await api.adminDeleteShift(token, edit.shift.id); setEdit(null); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to remove"); }
    finally { setSaving(false); }
  };

  const saveCover = async () => {
    if (!cover) return;
    const token = getAccessToken();
    if (!token) return;
    if (cover.end <= cover.start) { setError("End time must be after start time."); return; }
    if (cover.mode === "staff" && !cover.staffId) { setError("Choose a staff member."); return; }
    if (cover.mode === "external" && !cover.name.trim()) { setError("Enter a name for the cover person."); return; }
    setSaving(true); setError(null);
    const base = { room_id: cover.roomId || undefined, date: cover.date, start_time: cover.start, end_time: cover.end };
    const body = cover.mode === "staff"
      ? { ...base, staff_id: cover.staffId }
      : { ...base, external: true, staff_name: cover.name.trim(), branch_slug: branch };
    try { await api.adminCreateShift(token, body); setCover(null); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to add cover"); }
    finally { setSaving(false); }
  };

  const shiftWeek = (delta: number) => { const d = new Date(weekStart); d.setDate(d.getDate() + delta * 7); setWeekStart(d); };
  const weekLabel = `${weekStart.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${days[6].toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
  const isToday = (d: Date) => ymd(d) === ymd(new Date());
  const openCover = () => setCover({ mode: "staff", staffId: "", name: "", date: ymd(days[0]), roomId: "", start: "08:00", end: "16:00" });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-heading text-2xl font-bold text-slate-900"><CalendarClock className="h-6 w-6 text-teal-600" /> Staff Rota</h1>
          <p className="text-sm text-slate-500">Plan who works in each room, day by day. Attendance is matched against these shifts to measure late arrivals, overtime and early departures.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {branches.length > 1 && (
            <select value={branch} onChange={(e) => setBranch(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
              {branches.map((b) => <option key={b.slug} value={b.slug}>{branchShortName(b)}</option>)}
            </select>
          )}
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 p-1">
            <button onClick={() => shiftWeek(-1)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Previous week"><ChevronLeft className="h-4 w-4" /></button>
            <button onClick={() => setWeekStart(mondayOf(new Date()))} className="px-2 text-sm font-medium text-slate-700">{weekLabel}</button>
            <button onClick={() => shiftWeek(1)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Next week"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <button onClick={openCover} className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700"><UserPlus className="h-4 w-4" /> Add cover</button>
        </div>
      </div>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">{error}</p>}

      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">Grouped by classroom. {hiddenCount > 0 && !showAll ? `${hiddenCount} management / office staff hidden.` : ""}</p>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-teal-600" />
          Show all staff
        </label>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-[200px] border-b border-slate-100 bg-white px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Staff</th>
              {days.map((d) => (
                <th key={ymd(d)} className={`min-w-[130px] border-b border-slate-100 px-2 py-2 text-center ${isToday(d) ? "bg-teal-50" : "bg-white"}`}>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{d.toLocaleDateString("en-GB", { weekday: "short" })}</div>
                  <div className={`text-sm font-bold ${isToday(d) ? "text-teal-700" : "text-slate-700"}`}>{d.getDate()}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">Loading rota…</td></tr>
            ) : groups.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">No classroom staff at this branch. Assign staff to a room, or use <span className="font-medium">Add cover</span>.</td></tr>
            ) : groups.map((g) => (
              <RoomGroup key={g.id} group={g} days={days} isToday={isToday} cellShift={cellShift} openCell={openCell} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Assign / edit shift modal */}
      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={(e) => { if (e.target === e.currentTarget) setEdit(null); }}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="font-heading text-lg font-bold text-slate-900">{edit.shift ? "Edit shift" : "Add shift"}</h2>
                <p className="text-sm text-slate-500">{edit.row.name} · {new Date(edit.date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</p>
              </div>
              <button onClick={() => setEdit(null)} className="rounded p-1 text-slate-400 hover:bg-slate-100" aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Room</label>
                <select value={edit.roomId} onChange={(e) => setEdit({ ...edit, roomId: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <option value="">No room</option>
                  {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="mb-1 block text-xs font-medium text-slate-600">Start</label><input type="time" value={edit.start} onChange={(e) => setEdit({ ...edit, start: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></div>
                <div><label className="mb-1 block text-xs font-medium text-slate-600">End</label><input type="time" value={edit.end} onChange={(e) => setEdit({ ...edit, end: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((p) => {
                  const [s, e] = p.split("-");
                  return <button key={p} onClick={() => setEdit({ ...edit, start: s, end: e })} className={`rounded-full border px-2.5 py-1 text-xs font-medium ${edit.start === s && edit.end === e ? "border-teal-400 bg-teal-50 text-teal-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>{p}</button>;
                })}
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between">
              {edit.shift ? <button onClick={remove} disabled={saving} className="inline-flex items-center gap-1.5 text-sm font-medium text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /> Remove</button> : <span />}
              <div className="flex gap-2">
                <button onClick={() => setEdit(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
                <button onClick={save} disabled={saving} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">{saving ? "Saving…" : "Save shift"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add cover modal */}
      {cover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={(e) => { if (e.target === e.currentTarget) setCover(null); }}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="font-heading text-lg font-bold text-slate-900">Add cover</h2>
                <p className="text-sm text-slate-500">Roster an extra person for one day — any staff member, or an external visitor.</p>
              </div>
              <button onClick={() => setCover(null)} className="rounded p-1 text-slate-400 hover:bg-slate-100" aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="flex gap-1.5">
                {(["staff", "external"] as const).map((m) => (
                  <button key={m} onClick={() => setCover({ ...cover, mode: m })} className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${cover.mode === m ? "border-teal-400 bg-teal-50 text-teal-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>{m === "staff" ? "Staff member" : "External / visitor"}</button>
                ))}
              </div>
              {cover.mode === "staff" ? (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Person</label>
                  <select value={cover.staffId} onChange={(e) => setCover({ ...cover, staffId: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                    <option value="">Choose staff member…</option>
                    {[...staff].sort((a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)).map((m) => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}{m.job_title ? ` · ${m.job_title}` : ""}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Name</label>
                  <input value={cover.name} onChange={(e) => setCover({ ...cover, name: e.target.value })} placeholder="e.g. Ofsted inspector, agency cover" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Day</label>
                  <select value={cover.date} onChange={(e) => setCover({ ...cover, date: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                    {days.map((d) => <option key={ymd(d)} value={ymd(d)}>{d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Room</label>
                  <select value={cover.roomId} onChange={(e) => setCover({ ...cover, roomId: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                    <option value="">No room</option>
                    {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="mb-1 block text-xs font-medium text-slate-600">Start</label><input type="time" value={cover.start} onChange={(e) => setCover({ ...cover, start: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></div>
                <div><label className="mb-1 block text-xs font-medium text-slate-600">End</label><input type="time" value={cover.end} onChange={(e) => setCover({ ...cover, end: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setCover(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={saveCover} disabled={saving} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">{saving ? "Adding…" : "Add to rota"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RoomGroup({ group, days, isToday, cellShift, openCell }: {
  group: { id: string; label: string; icon: "room" | "office" | "cover"; rows: Row[] };
  days: Date[];
  isToday: (d: Date) => boolean;
  cellShift: (row: Row, date: string) => Shift | undefined;
  openCell: (row: Row, date: string) => void;
}) {
  const Icon = group.icon === "cover" ? UserPlus : group.icon === "office" ? Users : DoorOpen;
  return (
    <>
      <tr>
        <td colSpan={8} className="border-b border-t border-slate-100 bg-slate-50/70 px-4 py-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <Icon className="h-3.5 w-3.5 text-slate-400" /> {group.label}
            <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">{group.rows.length}</span>
          </div>
        </td>
      </tr>
      {group.rows.map((row) => (
        <tr key={`${group.id}:${row.key}`} className="hover:bg-slate-50/50">
          <td className="sticky left-0 z-10 border-b border-slate-100 bg-white px-4 py-2">
            <div className="font-medium text-slate-900">{row.name}{row.external && <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700">Cover</span>}</div>
            <div className="text-xs text-slate-400">{row.subtitle}</div>
          </td>
          {days.map((d) => {
            const key = ymd(d);
            const sh = cellShift(row, key);
            return (
              <td key={key} className={`border-b border-l border-slate-100 p-1.5 align-top ${isToday(d) ? "bg-teal-50/40" : ""}`}>
                {sh ? (
                  <button onClick={() => openCell(row, key)} className="w-full rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-2 text-left transition hover:border-teal-400">
                    <div className="text-sm font-semibold text-teal-800 tabular-nums">{sh.start_time}–{sh.end_time}</div>
                    {sh.room_name && <div className="truncate text-xs text-teal-600">{sh.room_name}</div>}
                  </button>
                ) : (
                  <button onClick={() => openCell(row, key)} className="flex h-full w-full items-center justify-center rounded-lg border border-dashed border-slate-200 py-3 text-slate-300 transition hover:border-teal-300 hover:text-teal-500" aria-label="Add shift"><Plus className="h-4 w-4" /></button>
                )}
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
