import type { ExecStatus } from "../../lib/types";

const COLORS: Record<ExecStatus, { fg: string; bg: string; dot: string }> = {
  PASSED: { fg: "var(--tf-pass)", bg: "var(--tf-pass-bg)", dot: "#3fae46" },
  FAILED: { fg: "var(--tf-fail)", bg: "var(--tf-fail-bg)", dot: "#d84343" },
  SKIPPED: { fg: "var(--tf-skip)", bg: "var(--tf-skip-bg)", dot: "#e0a530" },
  BLOCKED: { fg: "var(--tf-skip)", bg: "var(--tf-skip-bg)", dot: "#e0a530" },
  NOT_RUN: { fg: "var(--tf-notrun)", bg: "var(--tf-notrun-bg)", dot: "#a8a8a8" },
  QUEUED: { fg: "var(--tf-running)", bg: "var(--tf-running-bg)", dot: "#4a90d9" },
  RUNNING: { fg: "var(--tf-running)", bg: "var(--tf-running-bg)", dot: "#4a90d9" },
  INVALID: { fg: "var(--tf-fail)", bg: "var(--tf-fail-bg)", dot: "#d84343" },
};

const LABEL: Record<ExecStatus, string> = {
  PASSED: "PASSED",
  FAILED: "FAILED",
  SKIPPED: "SKIPPED",
  BLOCKED: "BLOCKED",
  NOT_RUN: "NOT RUN",
  QUEUED: "QUEUED",
  RUNNING: "RUNNING",
  INVALID: "INVALID",
};

export default function StatusChip({ status }: { status: ExecStatus }) {
  const c = COLORS[status];
  return (
    <span className="tf-status-chip" style={{ color: c.fg, background: c.bg, borderColor: c.fg }}>
      <span className="tf-status-dot" style={{ background: c.dot }} />
      {LABEL[status]}
    </span>
  );
}
