import type { AccentName } from "@/lib/admin-theme";
import type { StaffAttendanceStatus, StaffStatus, StaffType } from "@/types";

export const staffStatusAccent: Record<StaffStatus, AccentName> = {
  active: "green",
  on_leave: "amber",
  inactive: "slate",
};

export const staffStatusLabel: Record<StaffStatus, string> = {
  active: "Active",
  on_leave: "On leave",
  inactive: "Inactive",
};

export const staffTypeLabel: Record<StaffType, string> = {
  permanent: "Permanent",
  agency: "Agency",
  bank: "Bank",
};

export const staffTypeAccent: Record<StaffType, AccentName> = {
  permanent: "slate",
  agency: "violet",
  bank: "sky",
};

export const staffAttendanceAccent: Record<StaffAttendanceStatus, AccentName> = {
  present: "green",
  expected: "slate",
  absent: "red",
  leave: "sky",
  sick: "amber",
  training: "violet",
  meeting: "blue",
  remote: "indigo",
};

// dbsExpiry classifies a DBS expiry date: expired (red), soon <=90d (amber),
// otherwise ok (slate). Returns null for a missing/invalid date.
export function dbsExpiry(date?: string): { days: number; accent: AccentName; label: string } | null {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const days = Math.floor((d.getTime() - Date.now()) / 86400000);
  if (days < 0) return { days, accent: "red", label: "Expired" };
  if (days <= 90) return { days, accent: "amber", label: `${days}d left` };
  return { days, accent: "slate", label: `${days}d` };
}
