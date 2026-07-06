"use client";

import Link from "next/link";
import { ArrowRight, CalendarClock, Eye, MoreHorizontal, NotebookPen, StickyNote } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  PRIMARY_ACTION,
  PRIORITY_META,
  STATUS_COLOR,
  fmtBranch,
  fmtDateShort,
  fmtDayMonth,
  initialsOf,
  isFollowUpOverdue,
} from "@/lib/enquiry";
import type { Enquiry, EnquiryStatus } from "@/types";

function childLine(e: Enquiry): string | null {
  const name = e.application?.child?.name?.trim();
  if (name && e.child_age) return `${name} (${e.child_age})`;
  if (name) return name;
  if (e.child_age) return e.child_age;
  return null;
}

/**
 * Premium CRM card for the kanban board (and follow-up grid). Scannable: a
 * status dot + priority chip up top, child/branch/type, an assignee avatar and
 * follow-up chip, one prominent next-step button, and quiet icon quick-actions.
 */
export default function EnquiryCard({
  enquiry: e,
  onStatus,
  onNote,
  onFollowUp,
  showStatus = false,
}: {
  enquiry: Enquiry;
  onStatus?: (e: Enquiry, status: EnquiryStatus) => void;
  onNote?: (e: Enquiry) => void;
  onFollowUp?: (e: Enquiry) => void;
  showStatus?: boolean;
}) {
  const overdue = isFollowUpOverdue(e.status, e.follow_up_date);
  const child = childLine(e);
  const noteCount = e.notes?.length ?? 0;
  const priority = e.priority ?? "medium";
  const primary = PRIMARY_ACTION[e.status];
  const initials = initialsOf(e.assigned_to_name);

  return (
    <div className="group relative rounded-2xl border border-slate-100 bg-white p-3 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(15,23,42,0.13)]">
      {/* Name row: status dot + name, priority chip */}
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white" style={{ background: STATUS_COLOR[e.status] }} />
          <p className="truncate font-semibold leading-tight text-slate-900">{e.name}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide ${PRIORITY_META[priority].badge}`}>
          {priority}
        </span>
      </div>

      {child && <p className="mb-2 text-xs text-slate-500">Child: <span className="font-medium text-slate-700">{child}</span></p>}

      {/* Branch + type badges */}
      <div className="mb-2 flex flex-wrap gap-1.5">
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[0.7rem] font-medium text-slate-600">{fmtBranch(e.branch)}</span>
        {e.enquiry_type && <span className="rounded-md bg-slate-50 px-2 py-0.5 text-[0.7rem] text-slate-500">{e.enquiry_type}</span>}
      </div>

      {showStatus && <div className="mb-2"><StatusBadge status={e.status} /></div>}

      {/* Meta row: received · avatar · follow-up */}
      <div className="mb-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400">
        <span>{fmtDayMonth(e.created_at)}</span>
        {initials ? (
          <span className="inline-flex items-center gap-1 text-slate-500" title={e.assigned_to_name}>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-100 text-[0.6rem] font-bold text-teal-700">{initials}</span>
          </span>
        ) : (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[0.6rem] text-slate-400" title="Unassigned">–</span>
        )}
        {e.follow_up_date && (
          <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 ${overdue ? "bg-rose-50 font-semibold text-rose-600" : "bg-slate-50 text-slate-500"}`}>
            <CalendarClock className="h-3 w-3" /> {fmtDateShort(e.follow_up_date)}
          </span>
        )}
        {noteCount > 0 && <span className="inline-flex items-center gap-0.5"><StickyNote className="h-3 w-3" /> {noteCount}</span>}
      </div>

      {/* Primary action */}
      {primary && onStatus && (
        <button
          type="button"
          onClick={() => onStatus(e, primary.status)}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-teal-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
        >
          {primary.label} <ArrowRight className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Quiet quick-actions (full opacity on hover) */}
      <div className="mt-2 flex items-center justify-between border-t border-slate-50 pt-2 opacity-70 transition-opacity group-hover:opacity-100">
        <div className="flex items-center gap-0.5">
          <Link href={`/admin/inquiries/${e.id}`} aria-label="View" title="View" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <Eye className="h-4 w-4" />
          </Link>
          {onNote && (
            <button type="button" onClick={() => onNote(e)} aria-label="Add note" title="Add note" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <NotebookPen className="h-4 w-4" />
            </button>
          )}
          {onFollowUp && (
            <button type="button" onClick={() => onFollowUp(e)} aria-label="Set follow-up" title="Set follow-up" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <CalendarClock className="h-4 w-4" />
            </button>
          )}
        </div>
        <Link href={`/admin/inquiries/${e.id}`} aria-label="More" title="More" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
          <MoreHorizontal className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
