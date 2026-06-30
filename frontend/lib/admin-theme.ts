// ── Admin design system — accent tokens ──────────────────────────────────────
// One tokenized colour language for the whole back-office: Kanban lanes, status
// dots/pills, KPI cards, progress bars and funnel strips all resolve through
// ACCENT instead of scattered raw hex. The admin keeps its own slate/teal
// system, separate from the public site's cream/cursive theme.
//
// Each accent carries: a strong `solid` hex (dots, headers, bars), a `soft`
// tint hex (lane backgrounds, icon chips) and Tailwind `text` / `chip` classes.
// The chip strings are written out in full so Tailwind's JIT keeps them.

export type AccentName =
  | "slate" | "blue" | "sky" | "amber" | "orange" | "violet"
  | "indigo" | "teal" | "green" | "emerald" | "rose" | "red";

export type Accent = { solid: string; soft: string; text: string; chip: string };

export const ACCENT: Record<AccentName, Accent> = {
  slate:   { solid: "#64748B", soft: "#F1F5F9", text: "text-slate-600",   chip: "bg-slate-100 text-slate-600" },
  blue:    { solid: "#2D7FF9", soft: "#EAF4FF", text: "text-blue-700",    chip: "bg-blue-100 text-blue-700" },
  sky:     { solid: "#0284C7", soft: "#E0F2FE", text: "text-sky-700",     chip: "bg-sky-100 text-sky-700" },
  amber:   { solid: "#F59E0B", soft: "#FFF7E6", text: "text-amber-700",   chip: "bg-amber-100 text-amber-700" },
  orange:  { solid: "#EA580C", soft: "#FFF1E6", text: "text-orange-700",  chip: "bg-orange-100 text-orange-700" },
  violet:  { solid: "#7C3AED", soft: "#F4F0FF", text: "text-violet-700",  chip: "bg-violet-100 text-violet-700" },
  indigo:  { solid: "#4F46E5", soft: "#EEF4FF", text: "text-indigo-700",  chip: "bg-indigo-100 text-indigo-700" },
  teal:    { solid: "#0F9D8C", soft: "#E8FBF7", text: "text-teal-700",    chip: "bg-teal-100 text-teal-700" },
  green:   { solid: "#16A34A", soft: "#EAFBF2", text: "text-green-700",   chip: "bg-green-100 text-green-700" },
  emerald: { solid: "#10B981", soft: "#E7FBF3", text: "text-emerald-700", chip: "bg-emerald-100 text-emerald-700" },
  rose:    { solid: "#E11D48", soft: "#FFF1F4", text: "text-rose-700",    chip: "bg-rose-100 text-rose-700" },
  red:     { solid: "#DC2626", soft: "#FFF1F1", text: "text-red-700",     chip: "bg-red-100 text-red-700" },
};

export const accent = (name: AccentName): Accent => ACCENT[name] ?? ACCENT.slate;

// A Kanban lane's theme — a soft tinted background, a strong header colour, a
// one-line description and a friendly empty state.
export type LaneTheme = {
  key: string;
  label: string;
  accent: AccentName;
  desc: string;
  emptyEmoji: string;
  emptyText: string;
};

// Calm, nursery-friendly chart palette (teal-led). Shared by every admin chart.
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

// Section-label style used across the admin (small, uppercase, tracked).
export const SECTION_LABEL = "text-xs font-bold uppercase tracking-widest text-slate-400";
