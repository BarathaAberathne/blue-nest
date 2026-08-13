import type { AccentName } from "@/lib/admin-theme";
import type { SendPlanStatus, SendStatus } from "@/types";

// SEND / additional support display maps. The "Additional support" badge is
// the ONLY marker shown outside send.manage views — restrained by design.

export const sendStatusLabel: Record<SendStatus, string> = {
  "": "Not identified",
  monitoring: "Monitoring",
  sen_support: "SEN support",
  ehcp: "EHCP",
  ended: "Support ended",
};

export const sendStatusAccent: Record<SendStatus, AccentName> = {
  "": "slate",
  monitoring: "amber",
  sen_support: "indigo",
  ehcp: "violet",
  ended: "slate",
};

export const sendPlanLabel: Record<SendPlanStatus, string> = {
  "": "No plan",
  draft: "Plan drafted",
  active: "Plan active",
  ended: "Plan ended",
};

/** The single active-SEND classifier — mirrors models.SendStatusActive. */
export function sendActive(s?: SendStatus): boolean {
  return s === "monitoring" || s === "sen_support" || s === "ehcp";
}

export const provisionLabel: Record<string, string> = {
  mainstream: "Mainstream",
  send_dedicated: "SEND-dedicated",
  unallocated: "Unallocated",
};

export const provisionAccent: Record<string, AccentName> = {
  mainstream: "teal",
  send_dedicated: "violet",
  unallocated: "amber",
};
