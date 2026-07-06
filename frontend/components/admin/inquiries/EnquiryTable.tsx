"use client";

import Link from "next/link";
import { AlertTriangle, ArrowUpDown, CheckCircle2, Flame, StickyNote } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { fmtBranch, fmtDateShort, isFollowUpOverdue } from "@/lib/enquiry";
import type { Enquiry } from "@/types";

export type SortKey =
  | "created_at" | "name" | "branch" | "enquiry_type" | "status" | "assigned_to" | "follow_up_date";

const PAGE_SIZES = [25, 50, 100];

/** Power-user table: checkbox selection, sortable headers and server pagination. */
export default function EnquiryTable({
  enquiries,
  selected,
  onToggle,
  onToggleAll,
  sortKey,
  sortDir,
  onSort,
  page,
  pageSize,
  total,
  onPage,
  onPageSize,
}: {
  enquiries: Enquiry[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onSort: (k: SortKey) => void;
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
  onPageSize: (n: number) => void;
}) {
  const allChecked = enquiries.length > 0 && enquiries.every((e) => selected.has(e.id));
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const sortTh = (label: string, k: SortKey) => (
    <th className="px-4 py-3 text-left font-medium">
      <button type="button" onClick={() => onSort(k)} className="inline-flex items-center gap-1 hover:text-slate-700">
        {label}
        <ArrowUpDown className={`h-3 w-3 ${sortKey === k ? "text-teal-600" : "text-slate-300"}`} />
      </button>
    </th>
  );

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-4 py-3">
              <input type="checkbox" checked={allChecked} onChange={onToggleAll} className="accent-teal-600" aria-label="Select all" />
            </th>
            {sortTh("Date", "created_at")}
            {sortTh("Name", "name")}
            {sortTh("Type", "enquiry_type")}
            {sortTh("Branch", "branch")}
            {sortTh("Status", "status")}
            {sortTh("Assigned", "assigned_to")}
            {sortTh("Follow-up", "follow_up_date")}
            <th className="px-4 py-3 text-left font-medium">Flags</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {enquiries.length === 0 ? (
            <tr>
              <td colSpan={10} className="px-4 py-12 text-center text-sm text-slate-400">No enquiries match your filters.</td>
            </tr>
          ) : (
            enquiries.map((e) => {
              const overdue = isFollowUpOverdue(e.status, e.follow_up_date);
              const registered = e.registration?.is_registered || e.status === "registered";
              const noNotes = (e.notes?.length ?? 0) === 0;
              return (
                <tr key={e.id} className={`hover:bg-slate-50 ${selected.has(e.id) ? "bg-teal-50/40" : ""}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(e.id)} onChange={() => onToggle(e.id)} className="accent-teal-600" aria-label={`Select ${e.name}`} />
                  </td>
                  <td className="px-4 py-3 text-slate-500">{fmtDateShort(e.created_at)}</td>
                  <td className="px-4 py-3 text-slate-900">
                    {e.name}
                    <span className="block text-xs font-normal text-slate-400">{e.email}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{e.enquiry_type || "—"}</td>
                  <td className="px-4 py-3 text-slate-700">{fmtBranch(e.branch)}</td>
                  <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                  <td className="px-4 py-3 text-slate-600">{e.assigned_to_name || <span className="text-slate-300">—</span>}</td>
                  <td className={`px-4 py-3 ${overdue ? "font-semibold text-rose-600" : "text-slate-500"}`}>
                    {e.follow_up_date ? fmtDateShort(e.follow_up_date) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {overdue && <AlertTriangle className="h-4 w-4 text-rose-500" aria-label="Overdue follow-up" />}
                      {e.priority === "high" && <Flame className="h-4 w-4 text-orange-500" aria-label="High priority" />}
                      {registered && <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-label="Registered" />}
                      {noNotes && <StickyNote className="h-4 w-4 text-slate-300" aria-label="No notes yet" />}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/inquiries/${e.id}`} className="text-xs font-medium text-teal-600 hover:underline">View</Link>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span>Rows per page</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSize(Number(e.target.value))}
            className="rounded-lg border border-slate-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <span>
            {total === 0 ? "0" : `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, total)}`} of {total}
          </span>
          <div className="flex gap-1">
            <button type="button" onClick={() => onPage(page - 1)} disabled={page <= 0}
              className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-40">Prev</button>
            <button type="button" onClick={() => onPage(page + 1)} disabled={page >= pageCount - 1}
              className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
