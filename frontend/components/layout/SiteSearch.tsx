"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { searchSite, type SearchEntry } from "@/lib/search-index";

interface Props {
  className?: string;
}

export default function SiteSearch({ className = "" }: Props) {
  const router = useRouter();
  const listboxId = useId();

  const [query,  setQuery]  = useState("");
  const [open,   setOpen]   = useState(false);
  const [active, setActive] = useState(0);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);

  const results: SearchEntry[] = useMemo(() => searchSite(query), [query]);

  // Reset highlight whenever the result set changes
  useEffect(() => { setActive(0); }, [query]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  function navigateTo(url: string) {
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
    router.push(url);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (!results.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      navigateTo(results[active].url);
    }
  }

  const showDropdown = open && query.trim().length > 0;

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="flex w-full items-center overflow-hidden rounded-full bg-white shadow-[0_2px_10px_rgba(90,74,66,0.07)]">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { if (query.trim()) setOpen(true); }}
          onKeyDown={onKeyDown}
          placeholder="Search..."
          aria-label="Search Blue Nest Montessori"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          aria-controls={showDropdown ? listboxId : undefined}
          aria-activedescendant={showDropdown ? `${listboxId}-opt-${active}` : undefined}
          role="combobox"
          autoComplete="off"
          className="h-10 flex-1 bg-transparent px-4 text-sm text-[var(--ink)] outline-none placeholder:text-[rgba(90,74,66,0.85)]"
        />
        <button
          type="button"
          onClick={() => {
            if (results.length) navigateTo(results[0].url);
            else inputRef.current?.focus();
          }}
          aria-label="Submit search"
          className="flex h-10 w-11 shrink-0 items-center justify-center bg-[var(--hdr-accent)] text-white transition hover:brightness-95"
        >
          <Search className="h-4 w-4" />
        </button>
      </div>

      {showDropdown && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl bg-white shadow-[0_16px_40px_rgba(90,74,66,0.18)] ring-1 ring-[rgba(90,74,66,0.10)]"
        >
          {results.length === 0 ? (
            <div className="px-4 py-5 text-sm text-[rgba(90,74,66,0.75)]">
              No matches. Try a branch name, “fees”, “forest school” or “admissions”.
            </div>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto py-1">
              {results.map((r, i) => (
                <li
                  key={r.url}
                  id={`${listboxId}-opt-${i}`}
                  role="option"
                  aria-selected={i === active}
                >
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => navigateTo(r.url)}
                    className={`flex w-full items-start gap-3 px-4 py-2.5 text-left transition ${
                      i === active ? "bg-[rgba(127,216,210,0.18)]" : "hover:bg-[rgba(127,216,210,0.10)]"
                    }`}
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-bold text-[var(--ink)] truncate">
                        {r.title}
                      </span>
                      <span className="block text-xs text-[rgba(90,74,66,0.70)] truncate">
                        {r.description}
                      </span>
                    </span>
                    <span className="ml-2 mt-0.5 shrink-0 rounded-full bg-[rgba(127,216,210,0.18)] px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-[#3aada9]">
                      {r.category}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
