import type { AccentName } from "@/lib/admin-theme";
import type { Branch } from "@/types";

// branchShortName returns the concise branch label for admin/dashboard use
// ("Harrow", "Pinner Green") rather than the full public marketing name
// ("Blue Nest Montessori School — Harrow"). It strips the location off the tail
// of a dash-separated name, falling back to a prettified slug.
export function branchShortName(b: Pick<Branch, "slug" | "name">): string {
  if (b.name) {
    const parts = b.name.split(/\s*[—–-]\s*/);
    if (parts.length > 1) {
      const tail = parts[parts.length - 1].trim();
      if (tail) return tail;
    }
  }
  return b.slug
    .split("-")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

// performanceAccent maps a branch health score to an admin accent colour.
export function performanceAccent(score: number): AccentName {
  if (score >= 90) return "green";
  if (score >= 80) return "amber";
  return "red";
}

export const branchStatusAccent: Record<string, AccentName> = {
  active: "green",
  coming_soon: "amber",
  archived: "slate",
};

export const branchStatusLabel: Record<string, string> = {
  active: "Active",
  coming_soon: "Coming soon",
  archived: "Archived",
};
