"use client";

import { useMemo, useState } from "react";
import { ReactFlow, Background, Controls, type Node, type Edge, MarkerType } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { GraphNodeData, GraphPayload } from "../../lib/types";
import { CombinedEdge, TYPE_LABEL, neighborhood } from "../../lib/graphUtils";

interface DependenciesTabProps {
  selected: GraphNodeData;
  graph: GraphPayload;
  onSelect: (n: GraphNodeData) => void;
}

const NODE_BG: Record<string, string> = {
  TEST_COLLECTION: "#d5e8d4",
  TEST_SUITE: "#dae8fc",
  TEST_CASE: "#fff2cc",
  TEST_UTIL: "#e1d5e7",
  TEST_DATA: "#e1d5e7",
  API_ENDPOINT: "#e1d5e7",
  FIXTURE: "#ffe6cc",
};
const NODE_BORDER: Record<string, string> = {
  TEST_COLLECTION: "#82b366",
  TEST_SUITE: "#6c8ebf",
  TEST_CASE: "#d6b656",
  TEST_UTIL: "#9673a6",
  TEST_DATA: "#9673a6",
  API_ENDPOINT: "#9673a6",
  FIXTURE: "#d79b00",
};
const NODE_ICON: Record<string, string> = {
  TEST_COLLECTION: "🗄️",
  TEST_SUITE: "📁",
  TEST_CASE: "📄",
  TEST_UTIL: "🔧",
  TEST_DATA: "🔧",
  API_ENDPOINT: "🌐",
  FIXTURE: "🧰",
};

const DEPTH_OPTIONS = [
  { key: "direct", label: "Direct dependencies", value: 1 },
  { key: "two", label: "Two levels", value: 2 },
  { key: "complete", label: "Complete graph", value: Infinity },
] as const;

function edgeStyle(e: CombinedEdge) {
  if (e.types.includes("DEPENDS_ON")) return { stroke: "#a15c00", strokeDasharray: "4 3", strokeWidth: 1.4 };
  if (e.types.every((t) => t === "CALLS_ENDPOINT")) return { stroke: "#7a7a7a", strokeDasharray: "1 3", strokeWidth: 1.2 };
  return { stroke: "#3a3a3a", strokeWidth: 1.4 };
}

function edgeLabel(e: CombinedEdge): string {
  if (e.types.includes("DEPENDS_ON")) return "depends on";
  if (e.types.includes("CALLS_ENDPOINT")) return "calls";
  if (e.types.includes("USES") || e.types.includes("CALLS")) return "uses";
  return e.types[0]?.toLowerCase() ?? "";
}

export default function DependenciesTab({ selected, graph, onSelect }: DependenciesTabProps) {
  const [depthKey, setDepthKey] = useState<(typeof DEPTH_OPTIONS)[number]["key"]>("direct");
  const depth = DEPTH_OPTIONS.find((d) => d.key === depthKey)!.value;

  const { nodeIds, edges, hopOf } = useMemo(() => {
    const { nodeIds, edges } = neighborhood(graph, selected.id, depth);
    const adjacency = new Map<string, string[]>();
    for (const e of edges) {
      if (!adjacency.has(e.from)) adjacency.set(e.from, []);
      if (!adjacency.has(e.to)) adjacency.set(e.to, []);
      adjacency.get(e.from)!.push(e.to);
      adjacency.get(e.to)!.push(e.from);
    }
    const hopOf = new Map<string, number>([[selected.id, 0]]);
    let frontier = [selected.id];
    let hop = 0;
    while (frontier.length > 0) {
      hop++;
      const next: string[] = [];
      for (const id of frontier) {
        for (const neighbour of adjacency.get(id) ?? []) {
          if (!hopOf.has(neighbour)) {
            hopOf.set(neighbour, hop);
            next.push(neighbour);
          }
        }
      }
      frontier = next;
    }
    return { nodeIds, edges, hopOf };
  }, [graph, selected.id, depth]);

  const byId = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph]);

  const flowNodes: Node[] = useMemo(() => {
    const nodesToPlace = Array.from(nodeIds)
      .map((id) => byId.get(id))
      .filter((n): n is GraphNodeData => !!n);

    const rowTotals: Record<number, number> = {};
    for (const n of nodesToPlace) {
      const hop = hopOf.get(n.id) ?? 0;
      rowTotals[hop] = (rowTotals[hop] ?? 0) + 1;
    }

    const rowCounts: Record<number, number> = {};
    return nodesToPlace.map((n) => {
      const hop = hopOf.get(n.id) ?? 0;
      const col = rowCounts[hop] ?? 0;
      rowCounts[hop] = col + 1;
      const rowWidth = (rowTotals[hop] ?? 1) * 220;
      const isRoot = n.id === selected.id;
      return {
        id: n.id,
        position: { x: col * 220 - rowWidth / 2, y: hop * 130 },
        data: {
          label: (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: "bold", fontSize: 11 }}>
                {NODE_ICON[n.type]} {n.title && n.title.length > 26 ? n.title.slice(0, 24) + "…" : n.title ?? n.type}
              </div>
              <div className="font-mono" style={{ fontSize: 9, color: "#555", marginTop: 2 }}>
                {n.id}
              </div>
            </div>
          ),
        },
        style: {
          background: NODE_BG[n.type] ?? "#fff",
          color: "#1a1a1a",
          border: isRoot ? "2px solid #0b3d91" : `1.4px solid ${NODE_BORDER[n.type] ?? "#8e8e8e"}`,
          borderRadius: 3,
          padding: 8,
          width: 190,
          boxShadow: isRoot ? "0 0 0 2px #cfe0fb" : "1px 1px 3px rgba(0,0,0,0.15)",
          opacity: hop <= 1 ? 1 : 0.65,
        },
      };
    });
  }, [nodeIds, byId, hopOf, selected.id]);

  const flowEdges: Edge[] = useMemo(
    () =>
      edges.map((e, i) => ({
        id: `${e.from}-${e.to}-${i}`,
        source: e.from,
        target: e.to,
        type: "smoothstep",
        label: edgeLabel(e),
        style: edgeStyle(e),
        labelStyle: { fontSize: 9, fill: "#555", fontFamily: "Tahoma, sans-serif" },
        labelBgStyle: { fill: "#ece9d8", fillOpacity: 0.9 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#3a3a3a", width: 14, height: 14 },
      })),
    [edges]
  );

  return (
    <div className="flex h-full flex-col" style={{ padding: 8, background: "#f5f4ee" }}>
      <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 12 }}>Show:</span>
        <select
          value={depthKey}
          onChange={(e) => setDepthKey(e.target.value as typeof depthKey)}
          style={{ fontSize: 12, padding: "2px 4px", border: "1px solid #8e8e8e" }}
        >
          {DEPTH_OPTIONS.map((d) => (
            <option key={d.key} value={d.key}>
              {d.label}
            </option>
          ))}
        </select>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12, fontSize: 11, color: "#555" }}>
          {Object.entries(TYPE_LABEL)
            .filter(([type]) => type !== "TEST_DATA")
            .map(([type, label]) => (
              <span key={type} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span
                  style={{
                    display: "inline-block",
                    width: 11,
                    height: 11,
                    background: NODE_BG[type],
                    border: `1px solid ${NODE_BORDER[type]}`,
                  }}
                />
                {label}
              </span>
            ))}
        </div>
      </div>
      <div style={{ minHeight: 0, flex: 1, border: "1px solid #8e8e8e", background: "#fdfdf8" }}>
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          onNodeClick={(_, node) => {
            const n = byId.get(node.id);
            if (n) onSelect(n);
          }}
          fitView
        >
          <Background color="#d8d4c4" gap={16} />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}
