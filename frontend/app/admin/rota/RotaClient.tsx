"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, ChevronLeft, ChevronRight, Plus, Trash2, X } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { branchShortName } from "@/lib/branch";
import type { Branch, Room, Shift, Staff } from "@/types";

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
function mondayOf(d: Date) { const x = new Date(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); x.setHours(0, 0, 0, 0); return x; }
const PRESETS = ["08:00-16:00", "08:00-17:00", "09:00-17:00", "07:30-18:00", "08:00-13:00", "13:00-18:00"];

type EditState = { staff: Staff; date: string; shift?: Shift; roomId: string; start: string; end: string };

export default function RotaClient() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branch, setBranch] = useState("");
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [staff, setStaff] = useState<Staff[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(d.getDate() + i); return d; }), [weekStart]);
  const weekKey = ymd(weekStart);

  // Load branches once.
  useEffect(() => {
    const token = getAccessToken();
    if (!token) { setError("Not authenticated."); setLoading(false); return; }
    api.adminGetBranches(token).then((b) => {
      const live = (b ?? []).filter((x) => !x.archived_at);
      setBranches(live);
      setBranch((cur) => cur || live[0]?.slug || "");
    }).catch(() => setError("Failed to load branches."));
  }, []);

  // Load staff + rooms + shifts when branch or week changes.
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

  // shift lookup by staff+date
  const byCell = useMemo(() => {
    const m = new Map<string, Shift>();
    for (const s of shifts) m.set(`${s.staff_id}|${s.date}`, s);
    return m;
  }, [shifts]);

  const shiftBubble = (staffId: string, date: string) => byCell.get(`${staffId}|${date}`);

  const openCell = (member: Staff, date: string) => {
    const shift = shiftBubble(member.id, date);
    setEdit({ staff: member, date, shift, roomId: shift?.room_id ?? member.room_id ?? "", start: shift?.start_time ?? "08:00", end: shift?.end_time ?? "16:00" });
  };

  const save = async () => {
    if (!edit) return;
    const token = getAccessToken();
    if (!token) return;
    if (edit.end <= edit.start) { setError("End time must be after start time."); return; }
    setSaving(true); setError(null);
    const body = { staff_id: edit.staff.id, room_id: edit.roomId || undefined, date: edit.date, start_time: edit.start, end_time: edit.end };
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

  const shiftWeek = (delta: number) => { const d = new Date(weekStart); d.setDate(d.getDate() + delta * 7); setWeekStart(d); };
  const weekLabel = `${weekStart.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${days[6].toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
  const isToday = (d: Date) => ymd(d) === ymd(new Date());

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-heading text-2xl font-bold text-slate-900"><CalendarClock className="h-6 w-6 text-teal-600" /> Staff Rota</h1>
          <p className="text-sm text-slate-500">Plan who works where and when. Attendance is matched against these shifts to measure late arrivals, overtime and early departures.</p>
        </div>
        <div className="flex items-center gap-2">
          {branches.length > 1 && (
            <select value={branch} onChange={(e) => setBranch(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
              {branches.map((b) => <option key={b.slug} value={b.slug}>{branchShortName(b)}</option>)}
            </select>
          )}
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 p-1">
            <button onClick={() => shiftWeek(-1)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100"><ChevronLeft className="h-4 w-4" /></button>
            <button onClick={() => setWeekStart(mondayOf(new Date()))} className="px-2 text-sm font-medium text-slate-700">{weekLabel}</button>
            <button onClick={() => shiftWeek(1)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">{error}</p>}

      <div className="card overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-[180px] border-b border-slate-100 bg-white px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Staff</th>
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
            ) : staff.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">No active staff at this branch.</td></tr>
            ) : staff.map((m) => (
              <tr key={m.id} className="hover:bg-slate-50/50">
                <td className="sticky left-0 z-10 border-b border-slate-100 bg-white px-4 py-2">
                  <div className="font-medium text-slate-900">{m.first_name} {m.last_name}</div>
                  <div className="text-xs text-slate-400">{m.job_title || "Staff"}</div>
                </td>
                {days.map((d) => {
                  const key = ymd(d);
                  const sh = shiftBubble(m.id, key);
                  return (
                    <td key={key} className={`border-b border-l border-slate-100 p-1.5 align-top ${isToday(d) ? "bg-teal-50/40" : ""}`}>
                      {sh ? (
                        <button onClick={() => openCell(m, key)} className="w-full rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-2 text-left transition hover:border-teal-400">
                          <div className="text-sm font-semibold text-teal-800 tabular-nums">{sh.start_time}–{sh.end_time}</div>
                          {sh.room_name && <div className="truncate text-xs text-teal-600">{sh.room_name}</div>}
                        </button>
                      ) : (
                        <button onClick={() => openCell(m, key)} className="flex h-full w-full items-center justify-center rounded-lg border border-dashed border-slate-200 py-3 text-slate-300 transition hover:border-teal-300 hover:text-teal-500"><Plus className="h-4 w-4" /></button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Assign / edit modal */}
      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={(e) => { if (e.target === e.currentTarget) setEdit(null); }}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="font-heading text-lg font-bold text-slate-900">{edit.shift ? "Edit shift" : "Add shift"}</h2>
                <p className="text-sm text-slate-500">{edit.staff.first_name} {edit.staff.last_name} · {new Date(edit.date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</p>
              </div>
              <button onClick={() => setEdit(null)} className="rounded p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
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
    </div>
  );
}
