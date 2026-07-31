"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import type { TaxonomyTerm } from "@/types";

// Fallback session slots — only used if the configurable list can't be loaded
// (offline / not yet seeded) so the picker is never empty. Codes match the
// seeded defaults + existing child.session values.
export const SESSION_TYPE_FALLBACK: { code: string; label: string }[] = [
  { code: "am", label: "AM (8am–1pm)" },
  { code: "pm", label: "PM (1pm–6pm)" },
  { code: "full", label: "Full day (8am–6pm)" },
  { code: "school", label: "School day (9am–4pm)" },
];

// useTaxonomy fetches the active terms of a category available to a branch
// (branch's own + org-wide). Empty branch still returns org-wide defaults.
// Refetches when branch changes so the picker follows the selected branch.
export function useTaxonomy(category: string, branch: string): TaxonomyTerm[] {
  const [terms, setTerms] = useState<TaxonomyTerm[]>([]);
  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    let alive = true;
    api
      .adminGetTaxonomy(token, category, branch || undefined)
      .then((t) => { if (alive) setTerms(t ?? []); })
      .catch(() => { if (alive) setTerms([]); });
    return () => { alive = false; };
  }, [category, branch]);
  return terms;
}

// sessionOptions maps session-type terms to the picker's {value,label} shape
// (with a leading "Not attending" blank), falling back to the static list.
export function sessionOptions(terms: TaxonomyTerm[]): { value: string; label: string }[] {
  const src = terms.length ? terms.map((t) => ({ value: t.code, label: t.label })) : SESSION_TYPE_FALLBACK.map((t) => ({ value: t.code, label: t.label }));
  return [{ value: "", label: "Not attending" }, ...src];
}
