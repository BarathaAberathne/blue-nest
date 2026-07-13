import type { AccentName } from "@/lib/admin-theme";
import type { DailyRecordStatus, DailyRecordType } from "@/types";

export const dailyTypeLabel: Record<DailyRecordType, string> = {
  observation: "Observation",
  incident: "Incident / accident",
  safeguarding: "Safeguarding",
  medication: "Medication",
  meal: "Meal",
};

export const dailyTypeAccent: Record<DailyRecordType, AccentName> = {
  observation: "sky",
  incident: "orange",
  safeguarding: "red",
  medication: "violet",
  meal: "green",
};

export const dailyStatusLabel: Record<DailyRecordStatus, string> = {
  open: "Open",
  resolved: "Resolved",
  administered: "Administered",
  logged: "Logged",
};

export const dailyStatusAccent: Record<DailyRecordStatus, AccentName> = {
  open: "amber",
  resolved: "green",
  administered: "green",
  logged: "slate",
};

export const severityAccent: Record<string, AccentName> = {
  low: "slate",
  medium: "amber",
  high: "red",
};

// EYFS prime + specific areas of learning (for the observation form).
export const EYFS_AREAS = [
  "Communication & Language",
  "Physical Development",
  "PSED",
  "Literacy",
  "Mathematics",
  "Understanding the World",
  "Expressive Arts & Design",
];
