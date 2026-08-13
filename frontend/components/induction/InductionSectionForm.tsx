"use client";

// Generic induction section renderer — draws a section's fields from the
// INDUCTION_FIELDS catalogue (lib/induction.ts). Used by BOTH the parent
// portal wizard and the admin review page (readOnly). "tags" fields render
// the org's taxonomy chips, mirroring the child edit form.

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { INDUCTION_FIELDS } from "@/lib/induction";
import type { InductionField } from "@/lib/induction";
import type { TaxonomyTerm } from "@/types";

function TagsField({ field, value, onChange, readOnly }: {
  field: InductionField;
  value: string[];
  onChange: (v: string[]) => void;
  readOnly?: boolean;
}) {
  // Public taxonomy endpoint — resolvable by BOTH staff and portal parents
  // (the admin taxonomy route needs a management permission).
  const [terms, setTerms] = useState<TaxonomyTerm[]>([]);
  useEffect(() => {
    let alive = true;
    api.getTaxonomy(field.taxonomy ?? "allergy_type")
      .then((t) => { if (alive) setTerms((t as TaxonomyTerm[]) ?? []); })
      .catch(() => { if (alive) setTerms([]); });
    return () => { alive = false; };
  }, [field.taxonomy]);
  const tone = field.taxonomy === "dietary_label" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";
  return (
    <div className="flex flex-wrap gap-1.5">
      {terms.map((t) => {
        const on = value.includes(t.code);
        if (readOnly) {
          return on ? <span key={t.id} className={`rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>{t.label}</span> : null;
        }
        return (
          <button type="button" key={t.id}
            onClick={() => onChange(on ? value.filter((c) => c !== t.code) : [...value, t.code])}
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${on ? tone : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
            {t.label}
          </button>
        );
      })}
      {readOnly && value.length === 0 && <span className="text-sm text-slate-400">None selected</span>}
    </div>
  );
}

export default function InductionSectionForm({ sectionKey, data, onChange, readOnly }: {
  sectionKey: string;
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
  readOnly?: boolean;
}) {
  const fields = INDUCTION_FIELDS[sectionKey] ?? [];
  const [local, setLocal] = useState(data);
  const set = (key: string, value: unknown) => {
    const next = { ...local, [key]: value };
    setLocal(next);
    onChange(next);
  };
  const str = (k: string) => (typeof local[k] === "string" ? (local[k] as string) : "");
  const strs = (k: string) => (Array.isArray(local[k]) ? (local[k] as string[]) : []);

  return (
    <div className="space-y-4">
      {fields.map((f) => (
        <div key={f.key}>
          <label className="mb-1 block text-sm font-medium text-slate-700">{f.label}</label>
          {f.hint && <p className="mb-1.5 text-xs text-slate-400">{f.hint}</p>}
          {f.kind === "text" && (
            readOnly ? <p className="text-sm text-slate-800">{str(f.key) || "—"}</p> :
            <input value={str(f.key)} onChange={(e) => set(f.key, e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          )}
          {f.kind === "textarea" && (
            readOnly ? <p className="whitespace-pre-wrap text-sm text-slate-800">{str(f.key) || "—"}</p> :
            <textarea value={str(f.key)} onChange={(e) => set(f.key, e.target.value)} rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          )}
          {f.kind === "yesno" && (
            readOnly ? <p className="text-sm text-slate-800">{str(f.key) === "yes" ? "Yes" : str(f.key) === "no" ? "No" : "—"}</p> :
            <div className="flex gap-3">
              {["yes", "no"].map((v) => (
                <label key={v} className="flex items-center gap-1.5 text-sm text-slate-700">
                  <input type="radio" name={`${sectionKey}-${f.key}`} checked={str(f.key) === v} onChange={() => set(f.key, v)} />
                  {v === "yes" ? "Yes" : "No"}
                </label>
              ))}
            </div>
          )}
          {f.kind === "tags" && (
            <TagsField field={f} value={strs(f.key)} onChange={(v) => set(f.key, v)} readOnly={readOnly} />
          )}
        </div>
      ))}
    </div>
  );
}
