"use client";

import { Fragment, useMemo, useState } from "react";
import type { GraphNodeData, GraphPayload } from "../../lib/types";
import { buildEndpointMatrix } from "../../lib/graphUtils";
import StatusChip from "../classic/StatusChip";

interface EndpointsTabProps {
  graph: GraphPayload;
  scopeCaseIds?: Set<string>;
  onSelectCase: (n: GraphNodeData) => void;
}

export default function EndpointsTab({ graph, scopeCaseIds, onSelectCase }: EndpointsTabProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const rows = useMemo(() => {
    const all = buildEndpointMatrix(graph);
    if (!scopeCaseIds) return all;
    return all
      .map((r) => ({ ...r, cases: r.cases.filter((c) => scopeCaseIds.has(c.id)) }))
      .filter((r) => r.cases.length > 0);
  }, [graph, scopeCaseIds]);

  return (
    <div style={{ padding: 12 }}>
      <table className="tf-table">
        <thead>
          <tr>
            <th>Endpoint</th>
            <th>Method</th>
            <th>Cases</th>
            <th>Last Result</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <Fragment key={r.endpointId}>
              <tr onClick={() => setExpanded(expanded === r.endpointId ? null : r.endpointId)} style={{ cursor: "pointer" }}>
                <td className="font-mono">{r.path}</td>
                <td>
                  <span style={{ background: "#e4e0cd", border: "1px solid #ccc", padding: "1px 5px", fontSize: 11, fontWeight: "bold" }}>{r.method}</span>
                </td>
                <td>{r.cases.length}</td>
                <td>
                  <StatusChip status={r.worstStatus} />
                </td>
              </tr>
              {expanded === r.endpointId && (
                <tr>
                  <td colSpan={4} style={{ background: "#f5f4ee" }}>
                    <p style={{ fontSize: 11, color: "#777", marginBottom: 4 }}>Covered by:</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {r.cases.map((c) => (
                        <button
                          key={c.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectCase(c);
                          }}
                          className="tf-btn"
                          style={{ fontSize: 11 }}
                        >
                          {c.id} — {c.title}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p style={{ padding: 24, textAlign: "center", color: "#888" }}>No endpoints covered here.</p>}
    </div>
  );
}
