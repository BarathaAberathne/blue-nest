import type { Enquiry, EnquiryPriority, EnquiryStatus } from "@/types";
import { ENQUIRY_STATUS_LABELS } from "@/types";
import { ACCENT, type AccentName } from "@/lib/admin-theme";
import type { Lane } from "@/lib/admin-status";

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

// ── Guided workflow ──────────────────────────────────────────────────────────

// Terminal statuses require a confirmation before being applied.
export const TERMINAL_STATUSES: EnquiryStatus[] = ["cancelled", "lost", "spam"];

export function isTerminalStatus(s: EnquiryStatus): boolean {
  return TERMINAL_STATUSES.includes(s);
}

// RECOMMENDED_NEXT drives the guided "next step" buttons so staff don't need to
// understand the whole funnel — each status suggests its most likely follow-on.
export const RECOMMENDED_NEXT: Record<EnquiryStatus, { status: EnquiryStatus; label: string }[]> = {
  new: [{ status: "contacted", label: "Mark as contacted" }],
  contacted: [
    { status: "awaiting_reply", label: "Awaiting reply" },
    { status: "booked_visit", label: "Book visit" },
  ],
  awaiting_reply: [
    { status: "booked_visit", label: "Book visit" },
    { status: "contacted", label: "Mark contacted" },
  ],
  booked_visit: [{ status: "visit_completed", label: "Mark visit completed" }],
  visit_completed: [
    { status: "registered", label: "Register" },
    { status: "lost", label: "Not proceeding" },
  ],
  registered: [],
  cancelled: [],
  lost: [],
  spam: [],
};

// Status → accent token. The card dot, funnel colours and lane headers all
// resolve through ACCENT so the enquiry palette matches the rest of the admin.
export const STATUS_ACCENT: Record<EnquiryStatus, AccentName> = {
  new: "blue",
  contacted: "amber",
  awaiting_reply: "violet",
  booked_visit: "teal",
  visit_completed: "indigo",
  registered: "green",
  cancelled: "red",
  lost: "red",
  spam: "red",
};

// Solid hex per status (card dot + funnel), derived from the accent tokens.
export const STATUS_COLOR = Object.fromEntries(
  (Object.keys(STATUS_ACCENT) as EnquiryStatus[]).map((s) => [s, ACCENT[STATUS_ACCENT[s]].solid]),
) as Record<EnquiryStatus, string>;

// Kanban lanes — one per workflow stage; terminal states collapse into a single
// "Cancelled / Lost" lane. Uses the shared Lane shape so the generic KanbanBoard
// can render it.
export const PIPELINE_LANES: Lane<EnquiryStatus>[] = [
  { key: "new", label: "New", accent: "blue", statuses: ["new"], dropStatus: "new", desc: "Needs first contact", emptyEmoji: "📥", emptyText: "No new enquiries" },
  { key: "contacted", label: "Contacted", accent: "amber", statuses: ["contacted"], dropStatus: "contacted", desc: "Parent has been contacted", emptyEmoji: "📞", emptyText: "No one awaiting first contact" },
  { key: "awaiting_reply", label: "Awaiting Reply", accent: "violet", statuses: ["awaiting_reply"], dropStatus: "awaiting_reply", desc: "Waiting on the parent", emptyEmoji: "📬", emptyText: "No enquiries waiting for a reply" },
  { key: "booked_visit", label: "Booked Visit", accent: "teal", statuses: ["booked_visit"], dropStatus: "booked_visit", desc: "Visit scheduled", emptyEmoji: "📅", emptyText: "No visits booked" },
  { key: "visit_completed", label: "Visit Completed", accent: "indigo", statuses: ["visit_completed"], dropStatus: "visit_completed", desc: "Visit done — decide next step", emptyEmoji: "✅", emptyText: "No completed visits" },
  { key: "registered", label: "Registered", accent: "green", statuses: ["registered"], dropStatus: "registered", desc: "Child enrolled", emptyEmoji: "🎉", emptyText: "No registrations yet" },
  { key: "closed", label: "Cancelled / Lost", accent: "red", statuses: ["cancelled", "lost", "spam"], dropStatus: "lost", desc: "Cancelled, lost or spam", emptyEmoji: "🗂️", emptyText: "Nothing closed", terminal: true },
];

// The single most-likely next action per status — drives the prominent button
// on each kanban card. null for terminal/registered (no obvious next step).
export const PRIMARY_ACTION: Record<EnquiryStatus, { status: EnquiryStatus; label: string } | null> = {
  new: { status: "contacted", label: "Contact parent" },
  contacted: { status: "booked_visit", label: "Book visit" },
  awaiting_reply: { status: "booked_visit", label: "Book visit" },
  booked_visit: { status: "visit_completed", label: "Complete visit" },
  visit_completed: { status: "registered", label: "Register child" },
  registered: null,
  cancelled: null,
  lost: null,
  spam: null,
};

// ── Stage-age analytics ──────────────────────────────────────────────────────
// When did an enquiry enter its current stage? The latest activity entry that
// set the current status, else the creation time (the "new" stage). Used for
// the per-column "average days in stage" bottleneck indicator.
export function stageEnteredAt(e: Enquiry): number {
  let t = new Date(e.created_at).getTime();
  for (const a of e.activity_log ?? []) {
    if (a.to_status === e.status) {
      const at = new Date(a.created_at).getTime();
      if (!Number.isNaN(at) && at > t) t = at;
    }
  }
  return t;
}

export function stageDays(e: Enquiry): number {
  return (Date.now() - stageEnteredAt(e)) / 86_400_000;
}

// Average days-in-stage across a set of cards, rounded to 1dp (null when empty).
export function avgStageDays(items: Enquiry[]): number | null {
  if (items.length === 0) return null;
  const total = items.reduce((s, e) => s + stageDays(e), 0);
  return Math.round((total / items.length) * 10) / 10;
}

// Compact "15 Jun" day+month for dense cards.
export function fmtDayMonth(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// Initials for an assigned-staff avatar.
export function initialsOf(name?: string | null): string {
  if (!name) return "";
  return name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

// ── Quick note templates ─────────────────────────────────────────────────────
export const NOTE_TEMPLATES: string[] = [
  "Called parent, no answer",
  "Parent requested fees",
  "Visit booked",
  "Waiting for documents",
  "Not interested",
  "Follow-up required",
];

// ── Reply email templates ────────────────────────────────────────────────────
// Pre-written replies the admin can pick, edit, then open in their mail client.
// Wording mirrors the public site ("within one working day", contact details).
const SIGN_OFF =
  "\n\nWarm regards,\nThe Blue Nest Montessori Team\n020 8861 5574 · manager@bluenest.uk\nMon–Fri, 07:30–18:30";

export type ReplyTemplate = {
  key: string;
  label: string;
  subject: string;
  body: (e: Enquiry) => string;
};

export const REPLY_TEMPLATES: ReplyTemplate[] = [
  {
    key: "thank_you",
    label: "Thank you for your enquiry",
    subject: "Re: your enquiry to Blue Nest Montessori",
    body: (e) =>
      `Dear ${e.name},\n\nThank you for your enquiry to Blue Nest Montessori${e.branch ? ` (${fmtBranch(e.branch)})` : ""}. We're delighted you're considering us for your child's early years.\n\nA member of our team will be in touch within one working day. If there's anything specific you'd like to know in the meantime, just reply to this email.${SIGN_OFF}`,
  },
  {
    key: "fees",
    label: "Fees and availability response",
    subject: "Fees & availability — Blue Nest Montessori",
    body: (e) =>
      `Dear ${e.name},\n\nThank you for asking about our fees and availability at ${fmtBranch(e.branch) || "Blue Nest Montessori"}. We'd be happy to talk through the session options and current spaces for your child.\n\nCould you let us know your preferred days and your child's age, and we'll send a tailored quote and availability? You're also very welcome to book a visit to see the nursery.${SIGN_OFF}`,
  },
  {
    key: "book_visit",
    label: "Book a visit invitation",
    subject: "Come and visit us — Blue Nest Montessori",
    body: (e) =>
      `Dear ${e.name},\n\nWe'd love to welcome you and your child for a visit to ${fmtBranch(e.branch) || "our nursery"}, so you can meet the team and see our Montessori environment.\n\nPlease let us know a few dates and times that suit you (we're open Mon–Fri, 07:30–18:30) and we'll arrange a convenient slot.${SIGN_OFF}`,
  },
  {
    key: "follow_up",
    label: "Follow-up after no reply",
    subject: "Following up on your enquiry — Blue Nest Montessori",
    body: (e) =>
      `Dear ${e.name},\n\nI just wanted to follow up on your recent enquiry to ${fmtBranch(e.branch) || "Blue Nest Montessori"}. We'd still love to help and answer any questions you may have.\n\nIf you'd like to arrange a visit or talk through availability, simply reply to this email or call us on 020 8861 5574.${SIGN_OFF}`,
  },
  {
    key: "visit_confirmation",
    label: "Visit confirmation",
    subject: "Your visit is confirmed — Blue Nest Montessori",
    body: (e) =>
      `Dear ${e.name},\n\nThis is to confirm your upcoming visit to ${fmtBranch(e.branch) || "our nursery"}. We're looking forward to meeting you and your child.\n\nPlease allow around 30–45 minutes for your visit. If you need to rearrange, just let us know.${SIGN_OFF}`,
  },
  {
    key: "registration",
    label: "Registration next steps",
    subject: "Next steps to secure your place — Blue Nest Montessori",
    body: (e) =>
      `Dear ${e.name},\n\nThank you for choosing Blue Nest Montessori${e.branch ? ` (${fmtBranch(e.branch)})` : ""}. To secure your child's place, the next step is to complete our registration form and confirm your preferred start date and sessions.\n\nReply to this email and we'll send everything across, along with details of any funding you may be eligible for.${SIGN_OFF}`,
  },
  {
    key: "application_received",
    label: "Application received confirmation",
    subject: "We've received your application — Blue Nest Montessori",
    body: (e) =>
      `Dear ${e.name},\n\nThank you — we've received your application for a place at ${fmtBranch(e.branch) || "Blue Nest Montessori"}. Our admissions team will review the details and be in touch within one working day to confirm the next steps.\n\nIf you have any questions in the meantime, just reply to this email.${SIGN_OFF}`,
  },
];
