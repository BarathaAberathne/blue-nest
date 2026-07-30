"use client";

import type { GraphNodeData, GraphPayload, RunDetail } from "../../lib/types";
import { execStatus } from "../../lib/graphUtils";
import StatusChip from "../classic/StatusChip";

interface OverviewTabProps {
  selected: GraphNodeData;
  cases: GraphNodeData[];
  graph: GraphPayload;
  latestRun: RunDetail | null;
  onSelectCase: (n: GraphNodeData) => void;
}

function fmtDate(ms: number): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleString("en-GB", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function StatBox({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid #8e8e8e", background: "#fff", padding: "8px 12px", flex: 1 }}>
      <p style={{ fontSize: 11, color: "#777" }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: "bold", color: "var(--tf-link)" }}>{value}</p>
    </div>
  );
}

export default function OverviewTab({ selected, cases, graph, latestRun, onSelectCase }: OverviewTabProps) {
  const passed = cases.filter((c) => execStatus(c) === "PASSED").length;
  const failed = cases.filter((c) => execStatus(c) === "FAILED").length;
  const notRun = cases.filter((c) => execStatus(c) === "NOT_RUN").length;
  const other = cases.length - passed - failed - notRun;

  const caseIds = new Set(cases.map((c) => c.id));
  const utilIds = new Set(graph.edges.filter((e) => caseIds.has(e.from) && e.type === "USES").map((e) => e.to));
  const endpointIds = new Set(graph.edges.filter((e) => caseIds.has(e.from) && e.type === "CALLS_ENDPOINT").map((e) => e.to));

  return (
    <div style={{ padding: 14 }}>
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ fontSize: 15, fontWeight: "bold" }}>{selected.title ?? selected.id}</h2>
        <p style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
          {cases.length} case{cases.length === 1 ? "" : "s"}
          {cases.length > 0 && (
            <>
              {" · "}
              <span style={{ color: "var(--tf-pass)" }}>{passed} passed</span>
              {failed > 0 && (
                <>
                  {" · "}
                  <span style={{ color: "var(--tf-fail)" }}>{failed} failed</span>
                </>
              )}
              {" · "}
              <span style={{ color: "#888" }}>{notRun} not run</span>
              {other > 0 && (
                <>
                  {" · "}
                  <span style={{ color: "var(--tf-skip)" }}>{other} skipped</span>
                </>
              )}
            </>
          )}
        </p>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <StatBox label="Endpoints covered" value={endpointIds.size} />
        <StatBox label="Reusable utilities" value={utilIds.size} />
        <StatBox label="Last run" value={<span style={{ fontSize: 13 }}>{latestRun ? fmtDate(latestRun.finishedAtEpochMs) : "—"}</span>} />
      </div>

      {cases.length > 0 && (
        <div>
          <p className="tf-propgrid-section-title" style={{ marginBottom: 4 }}>
            Cases
          </p>
          <table className="tf-table">
            <tbody>
              {cases.map((c) => (
                <tr key={c.id} onClick={() => onSelectCase(c)} style={{ cursor: "pointer" }}>
                  <td style={{ width: 90 }}>
                    <StatusChip status={execStatus(c)} />
                  </td>
                  <td>{c.title ?? c.id}</td>
                  <td className="font-mono" style={{ color: "#999", textAlign: "right" }}>
                    {c.id}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
