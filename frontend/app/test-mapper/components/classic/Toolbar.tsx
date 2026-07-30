"use client";

import { useState } from "react";
import { PlayIcon, RefreshIcon, PrintIcon, SearchIcon, HelpIcon } from "./icons";

interface ToolbarProps {
  onRefresh: () => void;
  onFocusSearch: () => void;
  onShowAbout: () => void;
  onCopyCommand: (cmd: string) => void;
}

const RUN_COMMANDS = [
  { label: "Run everything", cmd: "make test-new" },
  { label: "Run one suite", cmd: "make test-suite SUITE=SUI-REG-001" },
  { label: "Run one case", cmd: "make test-case CASE=KEY-TC-001" },
  { label: "Validate only (no HTTP calls)", cmd: "make test-validate" },
];

export default function Toolbar({ onRefresh, onFocusSearch, onShowAbout, onCopyCommand }: ToolbarProps) {
  const [runOpen, setRunOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  return (
    <div className="tf-toolbar">
      <div style={{ position: "relative" }}>
        <button className="tf-toolbar-btn" onClick={() => setRunOpen((o) => !o)} onBlur={() => setTimeout(() => setRunOpen(false), 150)}>
          <PlayIcon />
          Run
        </button>
        {runOpen && (
          <div className="tf-menu-dropdown" style={{ top: "100%" }}>
            <p style={{ padding: "4px 10px", fontSize: 11, color: "#777" }}>Copies the real command — nothing runs from here</p>
            {RUN_COMMANDS.map((r) => (
              <button
                key={r.cmd}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onCopyCommand(r.cmd);
                  setCopied(r.cmd);
                  setTimeout(() => setCopied(null), 1200);
                }}
              >
                {copied === r.cmd ? "Copied ✓" : r.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <span className="tf-toolbar-sep" />
      <button className="tf-toolbar-btn" onClick={onRefresh}>
        <RefreshIcon />
        Refresh
      </button>
      <button className="tf-toolbar-btn" onClick={() => window.print()}>
        <PrintIcon />
        Print
      </button>
      <span className="tf-toolbar-sep" />
      <button className="tf-toolbar-btn" onClick={onFocusSearch}>
        <SearchIcon />
        Search
      </button>
      <button className="tf-toolbar-btn" onClick={onShowAbout}>
        <HelpIcon />
        Help
      </button>
    </div>
  );
}
