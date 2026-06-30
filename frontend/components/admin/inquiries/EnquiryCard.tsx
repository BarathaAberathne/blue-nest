"use client";

import Link from "next/link";
import { AlertTriangle, CalendarClock, StickyNote, UserCircle2 } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  PRIORITY_META,
  RECOMMENDED_NEXT,
  fmtBranch,
  fmtDateShort,
  isFollowUpOverdue,
} from "@/lib/enquiry";
import type { Enquiry, EnquiryStatus } from "@/types";

function childLabel(e: Enquiry): string | null {
  const name = e.application?.child?.name?.trim();
  if (name && e.child_age) return `${name} · ${e.child_age}`;
  if (name) return name;
  if (e.child_age) return e.child_age;
  return null;
}

/**
 * Compact enquiry card for the pipeline and follow-up views. Presentational —
 * the parent wires the quick-action callbacks (status changes, note, follow-up)
 * and any drag wrapper.
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
  const child = childLabel(e);
  const noteCount = e.notes?.length ?? 0;
  const next = RECOMMENDED_NEXT[e.status] ?? [];
  const priority = e.priority ?? "medium";

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <p className="font-semibold leading-tight text-slate-900">{e.name}</p>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold capitalize ${PRIORITY_META[priority].badge}`}>
          {priority}
        </span>
      </div>

      {child && (
        <p className="mb-1 flex items-center gap-1 text-xs text-slate-500">
          <UserCircle2 className="h-3.5 w-3.5 text-slate-400" /> {child}
        </p>
      )}

      <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
        <span className="font-medium text-slate-600">{fmtBranch(e.branch)}</span>
        <span className="text-slate-300">·</span>
        <span>{e.enquiry_type || "Enquiry"}</span>
      </div>

      {showStatus && (
        <div className="mb-2">
          <StatusBadge status={e.status} />
        </div>
      )}

      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className="text-slate-400">{fmtDateShort(e.created_at)}</span>
        {e.assigned_to_name && <span className="text-slate-500">→ {e.assigned_to_name}</span>}
        {e.follow_up_date && (
          <span className={`inline-flex items-center gap-1 ${overdue ? "font-semibold text-rose-600" : "text-slate-500"}`}>
            <CalendarClock className="h-3.5 w-3.5" /> {fmtDateShort(e.follow_up_date)}
          </span>
        )}
        {noteCount > 0 && (
          <span className="inline-flex items-center gap-0.5 text-slate-400">
            <StickyNote className="h-3.5 w-3.5" /> {noteCount}
          </span>
        )}
        {overdue && (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-1.5 py-0.5 text-[0.65rem] font-semibold text-rose-600">
            <AlertTriangle className="h-3 w-3" /> Overdue
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2">
        <Link
          href={`/admin/inquiries/${e.id}`}
          className="rounded-lg px-2 py-1 text-xs font-medium text-teal-600 hover:bg-teal-50"
        >
          View
        </Link>
        {onNote && (
          <button type="button" onClick={() => onNote(e)} className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100">
            Note
          </button>
        )}
        {onFollowUp && (
          <button type="button" onClick={() => onFollowUp(e)} className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100">
            Follow-up
          </button>
        )}
        {onStatus &&
          next.map((n) => (
            <button
              key={n.status}
              type="button"
              onClick={() => onStatus(e, n.status)}
              className="rounded-lg bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-100"
            >
              {n.label}
            </button>
          ))}
      </div>
    </div>
  );
}
