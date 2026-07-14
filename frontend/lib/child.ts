import type { AccentName } from "@/lib/admin-theme";
import type { AttendanceStatus, ChildStatus } from "@/types";

// ageLabel renders a friendly age from a YYYY-MM-DD dob ("2y 4m", "9m").
export function ageLabel(dob?: string): string {
  if (!dob) return "—";
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return "—";
  const now = new Date();
  let months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  if (now.getDate() < d.getDate()) months--;
  if (months < 0) months = 0;
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m}m`;
  return m === 0 ? `${y}y` : `${y}y ${m}m`;
}

export const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

export const fmtTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—";

export const childStatusAccent: Record<ChildStatus, AccentName> = {
  active: "green",
  waitlist: "amber",
  left: "slate",
};

export const fundingLabel = (f?: string) => (f && f !== "none" ? f : "Private");

export const attendanceAccent: Record<AttendanceStatus, AccentName> = {
  present: "green",
  expected: "slate",
  absent: "red",
  holiday: "sky",
  sick: "amber",
};
