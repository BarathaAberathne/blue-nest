import type { EnquiryPriority, EnquiryStatus } from "@/types";
import { ENQUIRY_STATUS_LABELS } from "@/types";

// Per-status display metadata. Class strings are written in full (not
// interpolated) so Tailwind's JIT scanner keeps them in the build.
export const STATUS_META: Record<
  EnquiryStatus,
  { label: string; badge: string; dot: string }
> = {
  new: { label: ENQUIRY_STATUS_LABELS.new, badge: "bg-sky-100 text-sky-700", dot: "bg-sky-500" },
  contacted: { label: ENQUIRY_STATUS_LABELS.contacted, badge: "bg-indigo-100 text-indigo-700", dot: "bg-indigo-500" },
  awaiting_reply: { label: ENQUIRY_STATUS_LABELS.awaiting_reply, badge: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  booked_visit: { label: ENQUIRY_STATUS_LABELS.booked_visit, badge: "bg-violet-100 text-violet-700", dot: "bg-violet-500" },
  visit_completed: { label: ENQUIRY_STATUS_LABELS.visit_completed, badge: "bg-cyan-100 text-cyan-700", dot: "bg-cyan-500" },
  registered: { label: ENQUIRY_STATUS_LABELS.registered, badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  cancelled: { label: ENQUIRY_STATUS_LABELS.cancelled, badge: "bg-rose-100 text-rose-700", dot: "bg-rose-500" },
  lost: { label: ENQUIRY_STATUS_LABELS.lost, badge: "bg-slate-200 text-slate-600", dot: "bg-slate-500" },
  spam: { label: ENQUIRY_STATUS_LABELS.spam, badge: "bg-gray-200 text-gray-500", dot: "bg-gray-400" },
};

export function statusLabel(status: string): string {
  return STATUS_META[status as EnquiryStatus]?.label ?? status;
}

export const PRIORITY_META: Record<
  EnquiryPriority,
  { label: string; badge: string }
> = {
  low: { label: "Low", badge: "bg-slate-100 text-slate-600" },
  medium: { label: "Medium", badge: "bg-amber-100 text-amber-700" },
  high: { label: "High", badge: "bg-rose-100 text-rose-700" },
};

// Calm, nursery-friendly palette for charts (teal brand + soft pastels).
export const CHART_COLORS = [
  "#0d9488", // brand teal
  "#7ECFC8",
  "#E99FC1",
  "#F3C97A",
  "#9FC6A8",
  "#8b9cf0",
  "#f4aac8",
  "#67c7cf",
];

// fmtBranch turns a stored branch slug ("pinner-green") into a display label.
export function fmtBranch(value: string): string {
  if (!value) return "—";
  return value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtDateShort(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// toDateInput converts an ISO timestamp to a yyyy-mm-dd value for <input type=date>.
export function toDateInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

// A follow-up is overdue when its date has passed and the enquiry is still open.
export function isFollowUpOverdue(status: EnquiryStatus, followUpDate?: string | null): boolean {
  if (!followUpDate) return false;
  if (status === "registered" || status === "cancelled" || status === "lost" || status === "spam") {
    return false;
  }
  const d = new Date(followUpDate);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() < Date.now();
}
