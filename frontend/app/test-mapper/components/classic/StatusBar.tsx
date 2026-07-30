"use client";

import type { RunSummary } from "../../lib/types";

interface StatusBarProps {
  latestRun: RunSummary | null;
  onViewReport: () => void;
}

export default function StatusBar({ latestRun, onViewReport }: StatusBarProps) {
  return (
    <div className="tf-statusbar">
      <span className="tf-statusbar-cell">Ready</span>
      <span className="tf-statusbar-cell" style={{ color: "var(--tf-pass)", fontWeight: "bold" }}>
        Passed: {latestRun?.passed ?? 0}
      </span>
      <span className="tf-statusbar-cell" style={{ color: "var(--tf-fail)", fontWeight: "bold" }}>
        Failed: {latestRun?.failed ?? 0}
      </span>
      <span className="tf-statusbar-cell" style={{ color: "var(--tf-skip)", fontWeight: "bold" }}>
        Skipped: {latestRun?.skipped ?? 0}
      </span>
      <span className="tf-statusbar-cell">Total: {latestRun?.total ?? 0}</span>
      <button className="tf-link-btn tf-statusbar-cell" onClick={onViewReport} style={{ marginLeft: "auto" }}>
        View Report
      </button>
    </div>
  );
}
