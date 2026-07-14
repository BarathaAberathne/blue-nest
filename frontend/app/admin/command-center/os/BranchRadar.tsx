"use client";

import { useMemo } from "react";
import Image from "next/image";
import { ReactFlow, Handle, Position, type Node, type Edge, type NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AI_COMMAND, type BranchMetric } from "../data";
import { useBranchMetrics } from "../live";
import { CentrepieceRings } from "../widgets";

const LOGO = "/logo/bluenest-logo.png";
const statusColor = (s: BranchMetric["status"]) =>
  s === "ok" ? "var(--cc-success)" : s === "warn" ? "var(--cc-warning)" : "var(--cc-error)";

// ── Centre node: the Blue Nest radar = overall organisation health ──────────
function RadarNode() {
  return (
    <div className="cc-rf-radar">
      <CentrepieceRings size={200} />
      <span className="cc-ping" />
      <span className="cc-ping" style={{ animationDelay: "1.1s" }} />
      <div className="cc-rf-radar-core">
        <Image src={LOGO} alt="Blue Nest" width={104} height={57} priority className="cc-logo-glow" style={{ width: 104, height: 57 }} />
        <p className="cc-heading" style={{ fontSize: 26, color: "var(--cc-success)", lineHeight: 1, marginTop: 2 }}>{AI_COMMAND.health}</p>
        <p className="cc-label" style={{ fontSize: 7.5, color: "var(--cc-success)", letterSpacing: "0.2em" }}>ORG HEALTH</p>
      </div>
      {(["t", "l", "r", "b", "bl"] as const).map((id) => (
        <Handle key={id} id={id} type="target" position={Position.Top} style={{ opacity: 0 }} isConnectable={false} />
      ))}
    </div>
  );
}

// ── Branch node: floating card; hover expands live statistics ───────────────
function BranchNode({ data }: NodeProps) {
  const m = data.metric as BranchMetric;
  const handlePos = data.handle as Position;
  const popUp = data.popUp as boolean;
  return (
    <div className="cc-rf-branch">
      <Handle type="source" position={handlePos} style={{ opacity: 0 }} isConnectable={false} />
      <div className="cc-rf-branch-head">
        <span className="cc-dot" style={{ color: statusColor(m.status), width: 7, height: 7 }} />
        <span className="cc-heading" style={{ fontSize: 10.5, color: "var(--cc-accent)", flex: 1 }}>{m.name.toUpperCase()}</span>
        {m.alerts > 0 && <span className="cc-rf-alert" style={{ color: statusColor(m.status) }}>{m.alerts}</span>}
      </div>
      <div className="cc-rf-branch-sub">{m.children} · {m.occupancy}%</div>
      {/* Hover: live statistics — opens upward for the bottom row so it isn't clipped */}
      <div className={`cc-rf-pop ${popUp ? "cc-rf-pop--up" : ""}`}>
        <p className="cc-heading" style={{ fontSize: 10, color: "var(--cc-accent)", marginBottom: 3 }}>{m.name.toUpperCase()}</p>
        {[
          ["Attendance", `${m.attendanceToday}%`],
          ["Occupancy", `${m.occupancy}%`],
          ["Children", `${m.children}`],
          ["Staff", `${m.staff}`],
          ["Revenue", m.revenue],
          ["Alerts", `${m.alerts}`],
        ].map(([k, v]) => (
          <div key={k} className="cc-rf-pop-row"><span>{k}</span><span style={{ color: "var(--cc-text)", fontWeight: 600 }}>{v}</span></div>
        ))}
      </div>
    </div>
  );
}

const nodeTypes = { radar: RadarNode, branch: BranchNode };

// Radial placement + which centre handle each branch feeds into. `popUp` opens
// the hover popover upward for the bottom row so it isn't clipped by the canvas.
const LAYOUT: Record<string, { x: number; y: number; handle: Position; center: string; popUp?: boolean }> = {
  harrow: { x: 250, y: 0, handle: Position.Bottom, center: "t" },
  pinner: { x: 10, y: 120, handle: Position.Right, center: "l" },
  borehamwood: { x: 470, y: 120, handle: Position.Left, center: "r" },
  "pinner-green": { x: 90, y: 330, handle: Position.Top, center: "bl", popUp: true },
  northwood: { x: 330, y: 330, handle: Position.Top, center: "b", popUp: true },
};

export default function BranchRadar() {
  const { metrics } = useBranchMetrics();
  const nodes: Node[] = useMemo(() => {
    const list: Node[] = [
      { id: "radar", type: "radar", position: { x: 210, y: 150 }, data: {}, draggable: false, selectable: false },
    ];
    for (const m of metrics) {
      const l = LAYOUT[m.slug];
      list.push({ id: m.slug, type: "branch", position: { x: l.x, y: l.y }, data: { metric: m, handle: l.handle, popUp: !!l.popUp }, selectable: false });
    }
    return list;
  }, [metrics]);

  const edges: Edge[] = useMemo(
    () =>
      metrics.map((m) => ({
        id: `e-${m.slug}`,
        source: m.slug,
        target: "radar",
        targetHandle: LAYOUT[m.slug].center,
        animated: true,
        style: { stroke: "rgba(54,169,255,0.55)", strokeWidth: 1.4 },
      })),
    [metrics],
  );

  return (
    <div className="cc-rf-wrap">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.12 }}
        proOptions={{ hideAttribution: true }}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        preventScrolling={false}
        minZoom={0.4}
        maxZoom={1.4}
        nodesConnectable={false}
      />
    </div>
  );
}
