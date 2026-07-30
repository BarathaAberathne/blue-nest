"use client";

import { useMemo, useState } from "react";
import type { CaseResult, GraphPayload, RunDetail, RunSummary } from "../lib/types";

interface RunsScreenProps {
  runs: RunSummary[];
  runsLoading: boolean;
  selectedRunId: string | null;
  onSelectRun: (runId: string) => void;
  runDetail: RunDetail | null;
  graph: GraphPayload | null;
  onJumpToCase: (caseId: string) => void;
}

function fmtDate(ms: number): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}

export default function RunsScreen({ runs, runsLoading, selectedRunId, onSelectRun, runDetail, graph, onJumpToCase }: RunsScreenProps) {
  const [selectedCase, setSelectedCase] = useState<CaseResult | null>(null);

  const suiteGroups = useMemo(() => {
    if (!runDetail) return [];
    const bySuite = new Map<string, CaseResult[]>();
    for (const c of runDetail.cases) {
      if (!bySuite.has(c.suiteId)) bySuite.set(c.suiteId, []);
      bySuite.get(c.suiteId)!.push(c);
    }
    return Array.from(bySuite.entries()).map(([suiteId, cases]) => {
      const title = graph?.nodes.find((n) => n.id === suiteId)?.title ?? suiteId;
      const duration = cases.reduce((sum, c) => sum + c.durationMs, 0);
      const failed = cases.filter((c) => c.status === "FAILED");
      const blocked = cases.filter((c) => c.status === "BLOCKED");
      const overall = failed.length > 0 ? "FAILED" : blocked.length === cases.length ? "BLOCKED" : blocked.length > 0 ? "PARTIAL" : "PASSED";
      return { suiteId, title, cases, duration, failed, blocked, overall };
    });
  }, [runDetail, graph]);

  const summary = runs.find((r) => r.runId === selectedRunId);
  const overallColor: Record<string, string> = {
    FAILED: "var(--tf-fail)",
    BLOCKED: "var(--tf-notrun)",
    PARTIAL: "var(--tf-skip)",
    PASSED: "var(--tf-pass)",
  };
  const overallGlyph: Record<string, string> = { FAILED: "✕", BLOCKED: "–", PARTIAL: "!", PASSED: "✓" };

  return (
    <div className="grid h-full" style={{ gridTemplateColumns: "220px 1fr", overflow: "hidden" }}>
      <div style={{ overflowY: "auto", borderRight: "1px solid #8e8e8e", background: "#fff" }}>
        <p className="tf-propgrid-section-title">Recent Runs</p>
        {runsLoading && <p style={{ padding: 10, fontSize: 12, color: "#888" }}>Loading…</p>}
        {!runsLoading && runs.length === 0 && (
          <p style={{ padding: 10, fontSize: 12, color: "#888" }}>
            No runs found yet. Run <code className="font-mono">make test-new</code> or any{" "}
            <code className="font-mono">make test-suite</code> target locally.
          </p>
        )}
        {runs.map((r) => (
          <div
            key={r.runId}
            onClick={() => {
              onSelectRun(r.runId);
              setSelectedCase(null);
            }}
            className={r.runId === selectedRunId ? "tf-selected" : undefined}
            style={{
              padding: "6px 10px",
              borderBottom: "1px solid #e4e0cd",
              cursor: "pointer",
              background: r.runId === selectedRunId ? "var(--tf-tree-selected-bg)" : undefined,
            }}
          >
            <p className="font-mono" style={{ fontSize: 11, color: "#888" }}>
              {r.runId.slice(0, 8)}
            </p>
            <p style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{fmtDate(r.finishedAtEpochMs)}</p>
            <p style={{ fontSize: 11, marginTop: 2 }}>
              <span style={{ color: "var(--tf-pass)" }}>{r.passed}✓</span>{" "}
              {r.failed > 0 && <span style={{ color: "var(--tf-fail)" }}>{r.failed}✕ </span>}
              {r.skipped > 0 && <span style={{ color: "var(--tf-notrun)" }}>{r.skipped}–</span>}
            </p>
          </div>
        ))}
      </div>

      <div style={{ overflowY: "auto", padding: 14 }}>
        {!runDetail || !summary ? (
          <p style={{ fontSize: 12, color: "#888" }}>Select a run to see its timeline.</p>
        ) : (
          <>
            <div style={{ marginBottom: 14 }}>
              <h2 className="font-mono" style={{ fontSize: 14, fontWeight: "bold" }}>
                Run #{summary.runId.slice(0, 8)}
              </h2>
              <p style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
                Environment: {summary.environment} · Commit: <span className="font-mono">{summary.gitCommit || "—"}</span>
              </p>
              <p style={{ fontSize: 12, marginTop: 6 }}>
                <span style={{ fontWeight: "bold", color: "var(--tf-pass)" }}>{summary.passed} Passed</span>
                {summary.failed > 0 && <span style={{ fontWeight: "bold", color: "var(--tf-fail)", marginLeft: 10 }}>{summary.failed} Failed</span>}
                {summary.skipped > 0 && <span style={{ fontWeight: "bold", color: "var(--tf-notrun)", marginLeft: 10 }}>{summary.skipped} Skipped</span>}
                <span style={{ color: "#888", marginLeft: 10 }}>
                  Duration: {fmtDuration(summary.finishedAtEpochMs - summary.startedAtEpochMs || summary.total * 50)}
                </span>
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {suiteGroups.map((g) => (
                <div key={g.suiteId} style={{ border: "1px solid #8e8e8e", background: "#fff" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 10px", fontSize: 12, background: "#f5f4ee" }}>
                    <span className="font-mono" style={{ color: overallColor[g.overall], fontWeight: "bold" }}>
                      {overallGlyph[g.overall]}
                    </span>
                    <span style={{ fontWeight: "bold" }}>{g.title}</span>
                    <span className="font-mono" style={{ marginLeft: "auto", fontSize: 11, color: "#888" }}>
                      {fmtDuration(g.duration)}
                    </span>
                  </div>
                  {(g.failed.length > 0 || g.blocked.length > 0) && (
                    <div style={{ borderTop: "1px solid #e4e0cd", padding: "4px 10px" }}>
                      {g.failed.map((c) => (
                        <div
                          key={c.caseId}
                          onClick={() => setSelectedCase(c)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "2px 0 2px 16px",
                            fontSize: 11,
                            cursor: "pointer",
                            background: selectedCase?.caseId === c.caseId ? "var(--tf-fail-bg)" : undefined,
                          }}
                        >
                          <span style={{ color: "var(--tf-fail)" }}>└── ✕</span>
                          <span className="font-mono" style={{ color: "#666" }}>
                            {c.caseId}
                          </span>
                          <span style={{ color: "#666" }}>{c.title}</span>
                        </div>
                      ))}
                      {g.blocked.map((c) => (
                        <div key={c.caseId} style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 0 2px 16px", fontSize: 11, color: "#888" }}>
                          <span>└── –</span>
                          <span className="font-mono">{c.caseId}</span>
                          <span>{c.skippedReason ?? "Blocked"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {selectedCase && (
              <div style={{ marginTop: 14, border: "1px solid var(--tf-fail)", background: "var(--tf-fail-bg)", padding: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <h3 className="font-mono" style={{ fontSize: 12, fontWeight: "bold", color: "var(--tf-fail)" }}>
                    {selectedCase.caseId} — Failed Assertion
                  </h3>
                  <button className="tf-btn" onClick={() => onJumpToCase(selectedCase.caseId)}>
                    Open in Explorer
                  </button>
                </div>
                {selectedCase.failedAssertion && (
                  <p className="font-mono" style={{ fontSize: 11, color: "var(--tf-fail)" }}>
                    {selectedCase.failedAssertion}
                  </p>
                )}
                {selectedCase.errorMessage && <p style={{ fontSize: 12, color: "var(--tf-fail)", marginTop: 4 }}>{selectedCase.errorMessage}</p>}
                {selectedCase.steps.some((s) => s.duplicateWarning) && (
                  <p style={{ fontSize: 11, color: "var(--tf-skip)", marginTop: 6 }}>
                    Duplicate request detected:{" "}
                    {selectedCase.steps
                      .filter((s) => s.duplicateWarning)
                      .map((s) => `${s.httpMethod} ${s.normalizedUrl}`)
                      .join(", ")}
                  </p>
                )}
                <div className="font-mono" style={{ marginTop: 6, fontSize: 10, color: "var(--tf-fail)" }}>
                  {selectedCase.steps.map((s, i) => (
                    <p key={i}>
                      {s.httpMethod} {s.normalizedUrl} → {s.responseStatus} · correlation {s.correlationId}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
