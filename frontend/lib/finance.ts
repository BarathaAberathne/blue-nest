import type { AccentName } from "@/lib/admin-theme";
import type { ChargeStatus, MandateStatus } from "@/types";

/** £-formatted pence (all money is integer pence end-to-end). */
export function formatPence(pence: number | undefined | null): string {
  return ((pence ?? 0) / 100).toLocaleString("en-GB", { style: "currency", currency: "GBP" });
}

export const chargeStatusLabel: Record<ChargeStatus, string> = {
  draft: "Draft",
  upcoming: "Upcoming",
  due: "Due",
  processing: "Processing",
  paid: "Paid",
  partially_paid: "Partially paid",
  overdue: "Overdue",
  failed: "Failed",
  cancelled: "Cancelled",
  refunded: "Refunded",
  written_off: "Written off",
};

export const chargeStatusAccent: Record<ChargeStatus, AccentName> = {
  draft: "slate",
  upcoming: "sky",
  due: "blue",
  processing: "violet",
  paid: "green",
  partially_paid: "teal",
  overdue: "red",
  failed: "rose",
  cancelled: "slate",
  refunded: "amber",
  written_off: "slate",
};

export const mandateStatusLabel: Record<MandateStatus, string> = {
  "": "Not set up",
  pending: "Pending",
  active: "Active",
  failed: "Failed",
  cancelled: "Cancelled",
};

export const mandateStatusAccent: Record<MandateStatus, AccentName> = {
  "": "slate",
  pending: "amber",
  active: "green",
  failed: "red",
  cancelled: "slate",
};

export const paymentStatusAccent: Record<string, AccentName> = {
  succeeded: "green",
  processing: "violet",
  pending: "amber",
  failed: "red",
  refunded: "amber",
};
