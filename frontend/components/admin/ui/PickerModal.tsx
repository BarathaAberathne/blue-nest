"use client";

// PickerModal — the shared "button + popup + scrollable list" selection
// pattern (born on the child profile's key-person picker). Use it anywhere a
// record is chosen from a list instead of a raw <select>: it searches, shows
// a detail line + optional badge per option, highlights the current choice,
// and leaves room for contextual fields (reason/override/etc.) via children.
//
// Two usage shapes:
//  - instant pick: onSelect performs the action and closes (no footer needed)
//  - pick-then-confirm: onSelect just highlights (selectedId), the caller
//    renders extra fields + a confirm button via `children`.

import { useMemo, useState } from "react";
import { X } from "lucide-react";

export type PickerOption = {
  id: string;
  label: string;
  /** Secondary line (e.g. job title, capacity, current room). */
  detail?: string;
  /** Small right-aligned badge (e.g. "3 free", "full", "current"). */
  badge?: string;
  badgeTone?: "slate" | "teal" | "amber" | "red";
  disabled?: boolean;
};

const badgeTones: Record<NonNullable<PickerOption["badgeTone"]>, string> = {
  slate: "bg-slate-100 text-slate-600",
  teal: "bg-teal-100 text-teal-700",
  amber: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-700",
};

export function PickerList({
  options,
  selectedId,
  onSelect,
  searchable,
  emptyText = "Nothing to choose from.",
}: {
  options: PickerOption[];
  selectedId?: string;
  onSelect: (id: string) => void;
  /** Defaults to auto (on when more than 8 options). */
  searchable?: boolean;
  emptyText?: string;
}) {
  const [q, setQ] = useState("");
  const showSearch = searchable ?? options.length > 8;
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((o) => `${o.label} ${o.detail ?? ""}`.toLowerCase().includes(needle));
  }, [options, q]);

  return (
    <div>
      {showSearch && (
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          autoFocus
          className="mb-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      )}
      {filtered.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-400">{q ? "No matches." : emptyText}</p>
      ) : (
        <ul className="max-h-72 space-y-1 overflow-y-auto">
          {filtered.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                disabled={o.disabled}
                onClick={() => onSelect(o.id)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${
                  o.id === selectedId
                    ? "bg-teal-50 font-semibold text-teal-700 ring-1 ring-teal-200"
                    : o.disabled
                      ? "cursor-not-allowed text-slate-300"
                      : "text-slate-700 hover:bg-teal-50"
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{o.label}</span>
                  {o.detail && <span className="block truncate text-xs font-normal text-slate-400">{o.detail}</span>}
                </span>
                {o.badge && (
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${badgeTones[o.badgeTone ?? "slate"]}`}>
                    {o.badge}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function PickerModal({
  title,
  subtitle,
  options,
  selectedId,
  onSelect,
  onClose,
  searchable,
  emptyText,
  children,
}: {
  title: string;
  subtitle?: string;
  options: PickerOption[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  searchable?: boolean;
  emptyText?: string;
  /** Contextual fields + confirm actions (pick-then-confirm shape). */
  children?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        {subtitle && <p className="mb-4 text-sm text-slate-500">{subtitle}</p>}
        <PickerList options={options} selectedId={selectedId} onSelect={onSelect} searchable={searchable} emptyText={emptyText} />
        {children}
      </div>
    </div>
  );
}
