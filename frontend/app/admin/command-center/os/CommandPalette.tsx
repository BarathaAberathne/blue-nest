"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Search, CornerDownLeft } from "lucide-react";
import { PALETTE_COMMANDS } from "./osdata";

// Global command palette — the AI-as-navigation layer. ⌘K / Ctrl-K opens it;
// selecting a command routes into the CMS. Grouped (Ask AI · Branches · Navigate).
export default function CommandPalette({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  const groups = Array.from(new Set(PALETTE_COMMANDS.map((c) => c.group)));
  const run = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  if (!open) return null;
  return (
    <div className="cc-cmdk-overlay" onClick={() => setOpen(false)}>
      <div className="cc-cmdk" onClick={(e) => e.stopPropagation()}>
        <Command label="Command palette" shouldFilter>
          <div className="cc-cmdk-input-row">
            <Search size={16} color="var(--cc-primary-soft)" />
            <Command.Input
              autoFocus
              value={search}
              onValueChange={setSearch}
              placeholder="Ask Blue Nest AI or jump to…"
              className="cc-cmdk-input"
            />
            <span className="cc-cmdk-kbd">ESC</span>
          </div>
          <Command.List className="cc-cmdk-list">
            <Command.Empty className="cc-cmdk-empty">No matches — try “Open Harrow” or “Show absences”.</Command.Empty>
            {groups.map((g) => (
              <Command.Group key={g} heading={g} className="cc-cmdk-group">
                {PALETTE_COMMANDS.filter((c) => c.group === g).map((c) => (
                  <Command.Item key={c.label} value={`${c.label} ${c.hint}`} onSelect={() => run(c.href)} className="cc-cmdk-item">
                    <span>{c.label}</span>
                    <span className="cc-cmdk-hint">{c.hint}</span>
                    <CornerDownLeft size={12} className="cc-cmdk-enter" />
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
