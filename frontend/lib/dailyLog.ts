import type { AccentName } from "@/lib/admin-theme";
import type { DailyRecordType } from "@/types";

// Per-type metadata driving the daily-log forms + detail rendering. Each type
// has its own field set (spec: "each log type has different fields and details").
export const DAILY_TYPES: { value: DailyRecordType; label: string; blurb: string }[] = [
  { value: "observation", label: "Observation", blurb: "EYFS learning-journal moment" },
  { value: "incident", label: "Incident / accident", blurb: "Bump, fall or accident" },
  { value: "safeguarding", label: "Safeguarding", blurb: "A concern to record & escalate" },
  { value: "medication", label: "Medication", blurb: "Medicine administered / due" },
  { value: "meal", label: "Meal", blurb: "What was served & eaten" },
];

export const dailyTypeLabelOf = (t: string) => DAILY_TYPES.find((d) => d.value === t)?.label ?? t;

// The seven EYFS areas of learning (observations).
export const EYFS_AREAS = [
  "Communication and Language",
  "Physical Development",
  "Personal, Social and Emotional Development",
  "Literacy",
  "Mathematics",
  "Understanding the World",
  "Expressive Arts and Design",
];

export const MEAL_TYPES = ["breakfast", "lunch", "snack", "tea"];
export const EATEN_OPTIONS = ["all", "most", "some", "none"];
export const SEVERITIES = ["low", "medium", "high"];
// Statutory bodies an incident/safeguarding record may be reported to (not
// shown to parents).
export const REPORTED_TO_OPTIONS = ["RIDDOR", "Ofsted", "LADO", "DSL"];

// Approval-status display.
export const approvalLabel: Record<string, string> = {
  "": "Approved", pending: "Pending approval", approved: "Approved", rejected: "Rejected",
};
export const approvalAccent: Record<string, AccentName> = {
  "": "green", pending: "amber", approved: "green", rejected: "red",
};

// Which fields each type shows (used by the form + detail view). `required`
// lists the extra fields (beyond title) the incident/safeguarding form enforces.
export interface TypeFields {
  detailLabel: string;
  severity?: boolean; eyfs?: boolean; nextSteps?: boolean; actionTaken?: boolean;
  reportedTo?: boolean; firstAid?: boolean; witnesses?: boolean; otherStaff?: boolean;
  parentsNotified?: boolean; otherNotes?: boolean; medication?: boolean; meal?: boolean;
  required?: ("first_aid" | "parents_notified")[];
}

export function typeFields(t: DailyRecordType): TypeFields {
  switch (t) {
    case "observation": return { detailLabel: "What happened", eyfs: true, nextSteps: true };
    case "incident": return {
      detailLabel: "Nature of accident / incident",
      severity: true, firstAid: true, witnesses: true, otherStaff: true,
      parentsNotified: true, reportedTo: true, actionTaken: true, otherNotes: true,
      required: ["first_aid", "parents_notified"],
    };
    case "safeguarding": return {
      detailLabel: "Concern",
      severity: true, witnesses: true, otherStaff: true, parentsNotified: true,
      reportedTo: true, actionTaken: true, otherNotes: true,
    };
    case "medication": return { detailLabel: "Notes", medication: true };
    case "meal": return { detailLabel: "Notes", meal: true };
    default: return { detailLabel: "Detail" };
  }
}
