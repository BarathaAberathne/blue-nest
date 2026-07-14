"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  createColumnHelper, flexRender, getCoreRowModel, getSortedRowModel,
  useReactTable, type SortingState,
} from "@tanstack/react-table";
import {
  ArrowUpDown, Baby, Building2, LayoutGrid, MapPin, Star, Table as TableIcon, Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { branchShortName, branchStatusAccent, branchStatusLabel, performanceAccent } from "@/lib/branch";
import { ACCENT } from "@/lib/admin-theme";
import StatCard from "@/components/admin/ui/StatCard";
import StageBadge from "@/components/admin/ui/StageBadge";
import ProgressBar from "@/components/admin/ui/ProgressBar";
import ViewToggle from "@/components/admin/ui/ViewToggle";
import type { BranchOverviewRow, Staff } from "@/types";

const BranchAdminMap = dynamic(() => import("./BranchAdminMap"), { ssr: false });

type View = "table" | "cards" | "map";

export default function BranchesClient() {
  const router = useRouter();
  const [rows, setRows] = useState<BranchOverviewRow[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("table");
  const [sorting, setSorting] = useState<SortingState>([{ id: "performance", desc: true }]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) { setError("Not authenticated — please sign in as admin."); setLoading(false); return; }
    (async () => {
      const [o, s] = await Promise.allSettled([api.adminGetBranchOverview(token), api.adminGetStaff(token)]);
      if (o.status === "fulfilled") setRows((o.value as BranchOverviewRow[]) ?? []);
      else setError("Failed to load branches.");
      if (s.status === "fulfilled") setStaff((s.value as Staff[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const managerName = useMemo(() => {
    const m = new Map(staff.map((s) => [s.id, `${s.first_name} ${s.last_name}`]));
    return (id?: string) => (id ? m.get(id) ?? "—" : "—");
  }, [staff]);

  const open = (slug: string) => router.push(`/admin/branches/${slug}`);

  const totals = useMemo(() => {
    const children = rows.reduce((s, r) => s + r.children, 0);
    const staffTotal = rows.reduce((s, r) => s + r.staff, 0);
    const cap = rows.reduce((s, r) => s + r.capacity, 0);
    const occ = cap > 0 ? Math.round((children / cap) * 100) : 0;
    const perf = rows.length ? Math.round(rows.reduce((s, r) => s + r.performance, 0) / rows.length) : 0;
    return { branches: rows.length, children, staffTotal, occ, perf };
  }, [rows]);

  const columns = useMemo(() => {
    const col = createColumnHelper<BranchOverviewRow>();
    return [
      col.accessor("name", {
        header: "Branch",
        cell: (c) => (
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-700"><Building2 className="h-4 w-4" /></span>
            <div>
              <p className="font-medium text-slate-900">{branchShortName(c.row.original)}</p>
              <p className="font-mono text-[0.7rem] text-slate-400">{c.row.original.ref ?? c.row.original.slug}</p>
            </div>
          </div>
        ),
      }),
      col.accessor("status", { header: "Status", cell: (c) => <StageBadge label={branchStatusLabel[c.getValue()] ?? c.getValue()} accent={branchStatusAccent[c.getValue()] ?? "slate"} withDot /> }),
      col.accessor("manager_id", { header: "Manager", cell: (c) => <span className="text-slate-500">{managerName(c.getValue())}</span> }),
      col.accessor("occupancy", { header: "Occupancy", cell: (c) => <span className="font-semibold text-slate-800">{c.getValue()}%</span> }),
      col.accessor("children", { header: "Children", cell: (c) => <span className="text-slate-700">{c.getValue()}</span> }),
      col.accessor("staff", { header: "Staff", cell: (c) => <span className="text-slate-700">{c.row.original.staff_present}/{c.getValue()}</span> }),
      col.accessor("rooms", { header: "Rooms", cell: (c) => <span className="text-slate-700">{c.getValue()}</span> }),
      col.accessor("enquiries", { header: "Enquiries", cell: (c) => <span className="text-slate-700">{c.getValue()}</span> }),
      col.accessor("rating", { header: "Google", cell: (c) => (c.getValue() > 0 ? <span className="inline-flex items-center gap-1 text-slate-700"><Star className="h-3.5 w-3.5 text-amber-500" />{c.getValue().toFixed(1)}</span> : <span className="text-slate-300">—</span>) }),
      col.accessor("ofsted", { header: "Ofsted", cell: (c) => <span className="text-slate-500">{c.getValue() || "—"}</span> }),
      col.accessor("performance", {
        header: "Performance",
        cell: (c) => (
          <div className="flex items-center gap-2">
            <span className="font-bold" style={{ color: ACCENT[performanceAccent(c.getValue())].solid }}>{c.getValue()}%</span>
            <div className="w-16"><ProgressBar value={c.getValue()} accent={performanceAccent(c.getValue())} height="h-1.5" /></div>
          </div>
        ),
      }),
      col.display({ id: "actions", header: "", cell: (c) => <button type="button" onClick={() => open(c.row.original.slug)} className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">Open</button> }),
    ];
  }, [managerName]);

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">Branches</h1>
          <p className="text-sm text-slate-500">Every nursery is the hub that owns its children, staff, rooms, admissions &amp; performance — live, aggregated, never duplicated.</p>
        </div>
        <ViewToggle<View>
          options={[{ key: "table", label: "Table", icon: TableIcon }, { key: "cards", label: "Cards", icon: LayoutGrid }, { key: "map", label: "Map", icon: MapPin }]}
          active={view}
          onChange={setView}
        />
      </div>

      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">{error}</p>}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Branches" value={totals.branches} icon={Building2} accent="blue" />
        <StatCard label="Children" value={totals.children} icon={Baby} accent="teal" />
        <StatCard label="Staff" value={totals.staffTotal} icon={Users} accent="violet" />
        <StatCard label="Group occupancy" value={`${totals.occ}%`} accent="amber" progress={totals.occ} />
        <StatCard label="Avg performance" value={`${totals.perf}%`} accent={performanceAccent(totals.perf)} progress={totals.perf} />
      </div>

      {loading ? (
        <p className="text-slate-400">Loading…</p>
      ) : view === "table" ? (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th key={h.id} className="px-4 py-3 text-left font-medium">
                      {h.isPlaceholder ? null : (
                        <button type="button" className={`inline-flex items-center gap-1 ${h.column.getCanSort() ? "hover:text-slate-700" : ""}`} onClick={h.column.getToggleSortingHandler()}>
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {h.column.getCanSort() && <ArrowUpDown className="h-3 w-3 opacity-40" />}
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {table.getRowModel().rows.map((r) => (
                <tr key={r.id} className="cursor-pointer hover:bg-slate-50" onClick={() => open(r.original.slug)}>
                  {r.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3" onClick={(e) => { if (cell.column.id === "actions") e.stopPropagation(); }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : view === "cards" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => (
            <button key={r.slug} type="button" onClick={() => open(r.slug)} className="card p-5 text-left transition-shadow hover:shadow-md">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <p className="font-heading text-lg font-bold text-slate-900">{branchShortName(r)}</p>
                  <div className="mt-1"><StageBadge label={branchStatusLabel[r.status] ?? r.status} accent={branchStatusAccent[r.status] ?? "slate"} withDot /></div>
                </div>
                <div className="flex h-14 w-14 flex-col items-center justify-center rounded-full border-4" style={{ borderColor: ACCENT[performanceAccent(r.performance)].solid }}>
                  <span className="text-lg font-bold leading-none" style={{ color: ACCENT[performanceAccent(r.performance)].solid }}>{r.performance}</span>
                  <span className="text-[0.55rem] uppercase tracking-wider text-slate-400">health</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <Stat label="Children" value={r.children} />
                <Stat label="Occupancy" value={`${r.occupancy}%`} />
                <Stat label="Staff" value={`${r.staff_present}/${r.staff}`} />
                <Stat label="Attendance" value={`${r.attendance_today}%`} />
                <Stat label="Enquiries" value={r.enquiries} />
                <Stat label="Google" value={r.rating > 0 ? `${r.rating.toFixed(1)}★` : "—"} />
              </div>
              {(r.safeguarding_open > 0 || r.medication_due > 0) && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {r.safeguarding_open > 0 && <StageBadge label={`${r.safeguarding_open} safeguarding`} accent="red" withDot={false} />}
                  {r.medication_due > 0 && <StageBadge label={`${r.medication_due} medication`} accent="violet" withDot={false} />}
                </div>
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden p-1">
          <BranchAdminMap rows={rows} onOpen={open} />
        </div>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-base font-bold text-slate-900">{value}</p>
      <p className="text-[0.65rem] uppercase tracking-wider text-slate-400">{label}</p>
    </div>
  );
}
