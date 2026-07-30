"use client";

import { useEffect, useMemo, useState } from "react";
import type { CaseResult, GraphNodeData, ScenarioPhase, ScenarioStep } from "../../lib/types";
import { attachRuntimeSteps, parseScenario, utilIdFromCallLine } from "../../lib/scenario";

/** A short, readable summary for one scenario-step bullet — resolves a `Call
 * <path>/UTIL-ID-slug.bnrest.md` line down to just "Call UTIL-ID" instead of
 * the full relative path, which is long and uninformative once truncated. */
function stepSummary(s: ScenarioStep): string {
  const firstLine = s.text.split("\n")[0].trim();
  const utilId = utilIdFromCallLine(firstLine);
  if (utilId) return `Call ${utilId}`;
  const req = s.steps?.[0];
  if (req?.httpMethod && req?.normalizedUrl) return `${req.httpMethod} ${req.normalizedUrl}`;
  return firstLine.replace(/^(Assert\w*|Post|Get|Put|Patch|Delete|Set)\s+/, "").slice(0, 34);
}

interface ScenarioTabProps {
  selected: GraphNodeData;
  runCase: CaseResult | null;
  loadSource: (path: string) => Promise<string>;
}

type FlowBoxKey = "given" | "when" | "then" | "output";
type FlowStatus = "PASSED" | "FAILED" | "NOT_RUN" | "SKIPPED";

const FLOW_BOX: Record<FlowBoxKey, { label: string; sub: string; icon: string; phases: ScenarioPhase[] }> = {
  given: { label: "1. GIVEN", sub: "(Setup)", icon: "📋", phases: ["setup", "given"] },
  when: { label: "2. WHEN", sub: "(Action)", icon: "⚙️", phases: ["when"] },
  then: { label: "3. THEN", sub: "(Assertions)", icon: "✅", phases: ["then"] },
  output: { label: "4. OUTPUT", sub: "(Cleanup)", icon: "📤", phases: ["teardown"] },
};

const STATUS_BAR_STYLE: Record<FlowStatus, { bg: string; fg: string }> = {
  PASSED: { bg: "var(--tf-pass-bg)", fg: "var(--tf-pass)" },
  FAILED: { bg: "var(--tf-fail-bg)", fg: "var(--tf-fail)" },
  SKIPPED: { bg: "var(--tf-skip-bg)", fg: "var(--tf-skip)" },
  NOT_RUN: { bg: "var(--tf-notrun-bg)", fg: "var(--tf-notrun)" },
};

function utilsAndEndpointsFor(steps: ScenarioStep[]): { utils: string[]; endpoints: string[] } {
  const utils = new Set<string>();
  const endpoints = new Set<string>();
  for (const s of steps) {
    for (const r of s.steps ?? []) {
      if (r.utilId) utils.add(r.utilId);
      if (r.endpointTemplate) endpoints.add(r.endpointTemplate);
    }
  }
  return { utils: Array.from(utils), endpoints: Array.from(endpoints) };
}

/**
 * Infers each flow box's status from the whole-case result: this DSL executes
 * strictly sequentially and stops at the first failed assertion (no
 * branching/retry), so a box is FAILED only if the case's own failed-assertion
 * text matches one of its steps, PASSED if it ran before that point (or the
 * case passed outright), and NOT_RUN if it comes after the failure.
 */
function computeBoxStatuses(
  boxes: { key: FlowBoxKey; steps: ScenarioStep[] }[],
  runCase: CaseResult | null
): Record<FlowBoxKey, FlowStatus> {
  const result = {} as Record<FlowBoxKey, FlowStatus>;

  if (!runCase) {
    for (const b of boxes) result[b.key] = "NOT_RUN";
    return result;
  }
  if (runCase.status === "BLOCKED" || runCase.status === "SKIPPED") {
    for (const b of boxes) result[b.key] = "SKIPPED";
    return result;
  }
  if (runCase.status === "PASSED") {
    for (const b of boxes) result[b.key] = b.steps.length > 0 ? "PASSED" : "NOT_RUN";
    return result;
  }

  // FAILED: find the first box containing a step whose text overlaps the
  // case's failed-assertion/error text; everything before it passed,
  // everything from it onward never ran.
  const needle = (runCase.failedAssertion ?? runCase.errorMessage ?? "").toLowerCase();
  const failedIndex = needle
    ? boxes.findIndex((b) => b.steps.some((s) => s.text.toLowerCase().includes(needle.slice(0, 24)) || needle.includes(s.text.split("\n")[0].toLowerCase().slice(0, 24))))
    : -1;

  boxes.forEach((b, i) => {
    if (failedIndex === -1) {
      result[b.key] = b.steps.length > 0 ? "PASSED" : "NOT_RUN"; // couldn't localise it — don't guess further
    } else if (i < failedIndex) result[b.key] = "PASSED";
    else if (i === failedIndex) result[b.key] = "FAILED";
    else result[b.key] = "NOT_RUN";
  });
  return result;
}

function FlowConnector() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, flexShrink: 0 }}>
      <span style={{ fontSize: 18, color: "#7a7a7a" }}>→</span>
    </div>
  );
}

export default function ScenarioTab({ selected, runCase, loadSource }: ScenarioTabProps) {
  const [source, setSource] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSource(null);
    setError(null);
    if (selected.type !== "TEST_CASE" || !selected.sourceFile) return;
    loadSource(selected.sourceFile)
      .then(setSource)
      .catch((e) => setError(String(e)));
  }, [selected, loadSource]);

  const scenario = useMemo(() => {
    if (!source) return [];
    const parsed = parseScenario(source);
    return runCase ? attachRuntimeSteps(parsed, runCase.steps) : parsed;
  }, [source, runCase]);

  if (selected.type !== "TEST_CASE") {
    return (
      <p style={{ padding: 24, fontSize: 12, color: "#777" }}>Select a test case to see its Scenario Flow.</p>
    );
  }
  if (error) {
    return (
      <p style={{ padding: 24, fontSize: 12, color: "var(--tf-fail)" }}>Could not load source: {error}</p>
    );
  }
  if (!source) {
    return <p style={{ padding: 24, fontSize: 12, color: "#777" }}>Loading…</p>;
  }

  const boxOrder: FlowBoxKey[] = ["given", "when", "then", "output"];
  const boxes = boxOrder
    .map((key) => {
      const def = FLOW_BOX[key];
      const steps = scenario.filter((s) => def.phases.includes(s.phase));
      return { key, def, steps };
    })
    .filter((b) => b.steps.length > 0);
  const statuses = computeBoxStatuses(boxes, runCase);

  // Flatten every runtime request in source order for the Execution Timeline,
  // with a synthetic (not wall-clock) running offset from the case start.
  const timeline: { step: ScenarioStep; requestIndex: number; offsetMs: number }[] = [];
  let offset = 0;
  for (const s of scenario) {
    for (let i = 0; i < (s.steps ?? []).length; i++) {
      timeline.push({ step: s, requestIndex: i, offsetMs: offset });
      offset += s.steps![i].responseTimeMs ?? 0;
    }
  }

  return (
    <div style={{ padding: 12 }}>
      <div style={{ marginBottom: 12 }}>
        <p style={{ fontSize: 13, fontWeight: "bold", color: "var(--tf-link)" }}>Scenario Flow</p>
        <p style={{ fontSize: 12, color: "#555" }}>
          {selected.id} — {selected.title}
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "stretch", overflowX: "auto", paddingBottom: 8 }}>
        {boxes.map((b, i) => {
          const status = statuses[b.key];
          const { utils, endpoints } = utilsAndEndpointsFor(b.steps);
          const barStyle = STATUS_BAR_STYLE[status];
          return (
            <div key={b.key} style={{ display: "flex", alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", width: 200, flexShrink: 0 }}>
                <div style={{ border: "1px solid #8e8e8e", background: "#fff" }}>
                  <div style={{ padding: "8px 10px", minHeight: 90 }}>
                    <div style={{ fontSize: 20 }}>{b.def.icon}</div>
                    <div style={{ fontWeight: "bold", fontSize: 12, marginTop: 4 }}>{b.def.label}</div>
                    <div style={{ fontSize: 10, color: "#777", marginBottom: 6 }}>{b.def.sub}</div>
                    <ul style={{ fontSize: 11, color: "#333", paddingLeft: 14, margin: 0 }}>
                      {b.steps.slice(0, 3).map((s, si) => (
                        <li key={si} style={{ marginBottom: 2 }} className={utilIdFromCallLine(s.text.split("\n")[0]) ? "font-mono" : undefined}>
                          {stepSummary(s)}
                        </li>
                      ))}
                      {b.steps.length > 3 && <li>…and {b.steps.length - 3} more</li>}
                    </ul>
                  </div>
                  <div
                    style={{
                      textAlign: "center",
                      fontWeight: "bold",
                      fontSize: 11,
                      padding: "3px 0",
                      background: barStyle.bg,
                      color: barStyle.fg,
                      borderTop: "1px solid #8e8e8e",
                    }}
                  >
                    {status.replace("_", " ")}
                  </div>
                </div>

                {(utils.length > 0 || endpoints.length > 0) && (
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                    {utils.slice(0, 2).map((u) => (
                      <div key={u} className="font-mono" style={{ background: "var(--tf-node-util-bg)", border: "1px solid var(--tf-node-util-border)", fontSize: 10, padding: "3px 6px" }}>
                        🔧 {u}
                      </div>
                    ))}
                    {endpoints.slice(0, 2).map((e) => (
                      <div key={e} className="font-mono" style={{ background: "var(--tf-node-endpoint-bg)", border: "1px solid var(--tf-node-endpoint-border)", fontSize: 10, padding: "3px 6px" }}>
                        🌐 {e}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {i < boxes.length - 1 && <FlowConnector />}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 16 }}>
        <p style={{ fontSize: 13, fontWeight: "bold", color: "var(--tf-link)", marginBottom: 6 }}>Execution Timeline</p>
        <table className="tf-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Step</th>
              <th>Type</th>
              <th>Status</th>
              <th>Offset</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            {timeline.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", color: "#888" }}>
                  No requests recorded for this run.
                </td>
              </tr>
            )}
            {timeline.map((t, i) => {
              const req = t.step.steps![t.requestIndex];
              return (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>
                    {req.utilId ? `via ${req.utilId}` : "direct"} — {req.httpMethod} {req.normalizedUrl}
                  </td>
                  <td>{t.step.phase.toUpperCase()}</td>
                  <td style={{ color: req.result === "OK" && req.responseStatus && req.responseStatus < 400 ? "var(--tf-pass)" : "var(--tf-fail)", fontWeight: "bold" }}>
                    {req.responseStatus ?? req.result}
                  </td>
                  <td>+{t.offsetMs} ms</td>
                  <td>{req.responseTimeMs ?? 0} ms</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
