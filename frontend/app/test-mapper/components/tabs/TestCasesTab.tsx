"use client";

import { useMemo, useState } from "react";
import type { GraphNodeData, GraphPayload } from "../../lib/types";
import { execStatus } from "../../lib/graphUtils";
import StatusChip from "../classic/StatusChip";

interface TestCasesTabProps {
  cases: GraphNodeData[];
  graph: GraphPayload;
  onSelect: (n: GraphNodeData) => void;
}

type SortKey = "id" | "title" | "status" | "duration" | "endpoints";

export default function TestCasesTab({ cases, graph, onSelect }: TestCasesTabProps) {
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortDir, setSortDir] = useState<1 | -1>(1);

  const endpointCountByCase = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of graph.edges) {
      if (e.type !== "CALLS_ENDPOINT") continue;
      m.set(e.from, (m.get(e.from) ?? 0) + 1);
    }
    return m;
  }, [graph]);

  const sorted = useMemo(() => {
    const copy = [...cases];
    copy.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "id":
          cmp = a.id.localeCompare(b.id);
          break;
        case "title":
          cmp = (a.title ?? "").localeCompare(b.title ?? "");
          break;
        case "status":
          cmp = execStatus(a).localeCompare(execStatus(b));
          break;
        case "duration":
          cmp = (a.durationMs ?? 0) - (b.durationMs ?? 0);
          break;
        case "endpoints":
          cmp = (endpointCountByCase.get(a.id) ?? 0) - (endpointCountByCase.get(b.id) ?? 0);
          break;
      }
      return cmp * sortDir;
    });
    return copy;
  }, [cases, sortKey, sortDir, endpointCountByCase]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(key);
      setSortDir(1);
    }
  }

  const cols: { key: SortKey; label: string }[] = [
    { key: "id", label: "ID" },
    { key: "title", label: "Test case" },
    { key: "status", label: "Status" },
    { key: "duration", label: "Duration" },
    { key: "endpoints", label: "Endpoints" },
  ];

  return (
    <div style={{ padding: 12 }}>
      <table className="tf-table">
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c.key} style={{ cursor: "pointer" }} onClick={() => toggleSort(c.key)}>
                {c.label} {sortKey === c.key ? (sortDir === 1 ? "▲" : "▼") : ""}
              </th>
            ))}
            <th>Tags</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((c) => {
            const status = execStatus(c);
            return (
              <tr key={c.id} onClick={() => onSelect(c)} style={{ cursor: "pointer" }}>
                <td className="font-mono" style={{ color: "#666" }}>
                  {c.id}
                </td>
                <td>{c.title ?? "—"}</td>
                <td>
                  <StatusChip status={status} />
                </td>
                <td>{c.durationMs ? `${c.durationMs} ms` : "—"}</td>
                <td>{endpointCountByCase.get(c.id) ?? 0}</td>
                <td style={{ color: "#888" }}>{(c.tags ?? []).join(", ") || "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {sorted.length === 0 && <p style={{ padding: 24, textAlign: "center", color: "#888" }}>No test cases here.</p>}
    </div>
  );
}
