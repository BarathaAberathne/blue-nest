"use client";

import { useId, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

export type SearchOption = {
  value: string;
  label: string;
  /** Extra searchable text (e.g. product codes) matched alongside the label. */
  keywords?: string;
};

/**
 * A lightweight searchable single-select combobox: type to filter, click (or
 * Enter) to pick. `extraOption`, when given, is always shown at the bottom
 * (e.g. an "Other — type manually" escape hatch). Controlled via `value`.
 */
export default function SearchSelect({
  options,
  value,
  onChange,
  placeholder = "Search…",
  extraOption,
  className = "",
  disabled = false,
}: {
  options: SearchOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  extraOption?: SearchOption;
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selectedLabel = useMemo(() => {
    if (value && extraOption && value === extraOption.value) return extraOption.label;
    return options.find((o) => o.value === value)?.label ?? "";
  }, [options, value, extraOption]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.keywords ? o.keywords.toLowerCase().includes(q) : false),
    );
  }, [options, query]);

  const pick = (v: string) => {
    onChange(v);
    setQuery("");
    setOpen(false);
  };

  return (
    <div
      ref={wrapRef}
      className={`relative ${className}`}
      onBlur={(e) => {
        // Close only when focus leaves the whole combobox.
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          value={open ? query : selectedLabel}
          placeholder={placeholder}
          disabled={disabled}
          onFocus={() => { setOpen(true); setQuery(""); }}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            if (e.key === "Enter") {
              e.preventDefault();
              if (filtered.length > 0) pick(filtered[0].value);
              else if (extraOption) pick(extraOption.value);
            }
          }}
          className="w-full rounded-lg border border-gray-200 pl-8 pr-8 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
        />
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      </div>

      {open && (
        <ul id={listId} role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg text-sm">
          {filtered.length === 0 && !extraOption && (
            <li className="px-3 py-2 text-gray-400">No matches</li>
          )}
          {filtered.map((o) => (
            <li key={o.value}>
              <button
                type="button"
                // mousedown fires before the input's blur, so the click registers.
                onMouseDown={(e) => { e.preventDefault(); pick(o.value); }}
                className={`block w-full text-left px-3 py-2 hover:bg-teal-50 ${
                  o.value === value ? "bg-teal-50 font-medium text-teal-700" : "text-gray-700"
                }`}
              >
                {o.label}
              </button>
            </li>
          ))}
          {extraOption && (
            <li className="border-t border-gray-100">
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); pick(extraOption.value); }}
                className="block w-full text-left px-3 py-2 text-gray-500 hover:bg-gray-50"
              >
                {extraOption.label}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
