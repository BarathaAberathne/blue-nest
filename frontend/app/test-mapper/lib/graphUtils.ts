import type { ExecStatus, GraphNodeData, GraphPayload, RunDetail } from "./types";

// ── Status presentation (kept separate from node-type colour, per design) ──

export const STATUS_ICON: Record<ExecStatus, string> = {
  PASSED: "✓",
  FAILED: "✕",
  SKIPPED: "–",
  BLOCKED: "–",
  NOT_RUN: "○",
  QUEUED: "○",
  RUNNING: "●",
  INVALID: "!",
};

export const STATUS_LABEL: Record<ExecStatus, string> = {
  PASSED: "Passed",
  FAILED: "Failed",
  SKIPPED: "Skipped",
  BLOCKED: "Blocked",
  NOT_RUN: "Not run",
  QUEUED: "Queued",
  RUNNING: "Running",
  INVALID: "Invalid",
};

export const STATUS_TEXT_CLASS: Record<ExecStatus, string> = {
  PASSED: "text-emerald-600",
  FAILED: "text-rose-600",
  SKIPPED: "text-slate-400",
  BLOCKED: "text-slate-400",
  NOT_RUN: "text-slate-300",
  QUEUED: "text-sky-500",
  RUNNING: "text-sky-500 animate-pulse",
  INVALID: "text-rose-600",
};

export const STATUS_BG_CLASS: Record<ExecStatus, string> = {
  PASSED: "bg-emerald-50 text-emerald-700",
  FAILED: "bg-rose-50 text-rose-700",
  SKIPPED: "bg-slate-100 text-slate-500",
  BLOCKED: "bg-slate-100 text-slate-500",
  NOT_RUN: "bg-slate-50 text-slate-400",
  QUEUED: "bg-sky-50 text-sky-600",
  RUNNING: "bg-sky-50 text-sky-600",
  INVALID: "bg-rose-50 text-rose-700",
};

export function execStatus(n: GraphNodeData | undefined | null): ExecStatus {
  return (n?.lastExecutionStatus as ExecStatus) ?? "NOT_RUN";
}

/**
 * Overlays a freshly-fetched run's per-case status/duration onto graph
 * nodes — `graph.json` is a static export (`make test-map`) that goes stale
 * the moment a suite is run again without regenerating it, so every screen
 * that shows "live" status must merge in the latest run rather than trust
 * the node's own `lastExecutionStatus` directly.
 */
export function mergeRunData(nodes: GraphNodeData[], run: RunDetail | null): GraphNodeData[] {
  if (!run) return nodes;
  const byId = new Map(run.cases.map((c) => [c.caseId, c]));
  return nodes.map((n) => {
    const c = byId.get(n.id);
    if (!c) return n;
    return { ...n, lastExecutionStatus: c.status, durationMs: c.durationMs };
  });
}

// ── Node-type presentation (deliberately separate colour axis from status) ──

export const TYPE_LABEL: Record<string, string> = {
  TEST_COLLECTION: "Collection",
  TEST_SUITE: "Suite",
  TEST_CASE: "Case",
  TEST_UTIL: "Utility",
  TEST_DATA: "Data",
  API_ENDPOINT: "Endpoint",
  FIXTURE: "Fixture",
};

export const TYPE_CHIP_CLASS: Record<string, string> = {
  TEST_COLLECTION: "bg-slate-900 text-white",
  TEST_SUITE: "bg-slate-200 text-slate-700",
  TEST_CASE: "bg-white text-slate-700 border border-slate-200",
  TEST_UTIL: "bg-violet-50 text-violet-700",
  TEST_DATA: "bg-violet-50 text-violet-700",
  API_ENDPOINT: "bg-gray-100 text-gray-600",
  FIXTURE: "bg-amber-50 text-amber-700",
};

// ── Hierarchy tree (Collection → Suite → Case) ──────────────────────────────

export interface TreeNode {
  node: GraphNodeData;
  children: TreeNode[];
}

export function buildHierarchyTree(graph: GraphPayload): TreeNode[] {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const childIds = new Map<string, string[]>();
  const hasParent = new Set<string>();

  for (const e of graph.edges) {
    if (e.type !== "CONTAINS") continue;
    const child = byId.get(e.to);
    if (!child || (child.type !== "TEST_SUITE" && child.type !== "TEST_CASE")) continue;
    if (!childIds.has(e.from)) childIds.set(e.from, []);
    childIds.get(e.from)!.push(e.to);
    hasParent.add(e.to);
  }

  function build(id: string): TreeNode | null {
    const node = byId.get(id);
    if (!node) return null;
    const kids = (childIds.get(id) ?? [])
      .map(build)
      .filter((t): t is TreeNode => t !== null);
    return { node, children: kids };
  }

  const roots = graph.nodes.filter(
    (n) => (n.type === "TEST_COLLECTION" || n.type === "TEST_SUITE" || n.type === "TEST_CASE") && !hasParent.has(n.id)
  );
  return roots.map((r) => build(r.id)).filter((t): t is TreeNode => t !== null);
}

export function flattenCases(tree: TreeNode[]): GraphNodeData[] {
  const out: GraphNodeData[] = [];
  function walk(t: TreeNode) {
    if (t.node.type === "TEST_CASE") out.push(t.node);
    t.children.forEach(walk);
  }
  tree.forEach(walk);
  return out;
}

export function descendantCases(graph: GraphPayload, rootId: string): GraphNodeData[] {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const kidsOf = new Map<string, string[]>();
  for (const e of graph.edges) {
    if (e.type !== "CONTAINS") continue;
    if (!kidsOf.has(e.from)) kidsOf.set(e.from, []);
    kidsOf.get(e.from)!.push(e.to);
  }
  const out: GraphNodeData[] = [];
  const seen = new Set<string>();
  function walk(id: string) {
    if (seen.has(id)) return;
    seen.add(id);
    const n = byId.get(id);
    if (n?.type === "TEST_CASE") out.push(n);
    (kidsOf.get(id) ?? []).forEach(walk);
  }
  walk(rootId);
  return out;
}

// ── Focused dependency neighbourhood (reuse graph, CONTAINS excluded) ──────

const REUSE_EDGE_TYPES = new Set(["CALLS", "USES", "CONSUMES", "DEPENDS_ON", "CALLS_ENDPOINT"]);

export interface CombinedEdge {
  from: string;
  to: string;
  types: string[];
}

export function neighborhood(
  graph: GraphPayload,
  rootId: string,
  depth: number
): { nodeIds: Set<string>; edges: CombinedEdge[] } {
  const adjacency = new Map<string, { to: string; type: string }[]>();
  for (const e of graph.edges) {
    if (!REUSE_EDGE_TYPES.has(e.type)) continue;
    if (!adjacency.has(e.from)) adjacency.set(e.from, []);
    adjacency.get(e.from)!.push({ to: e.to, type: e.type });
    if (!adjacency.has(e.to)) adjacency.set(e.to, []);
    adjacency.get(e.to)!.push({ to: e.from, type: e.type });
  }

  const nodeIds = new Set<string>([rootId]);
  let frontier = new Set<string>([rootId]);
  for (let d = 0; d < depth && frontier.size > 0; d++) {
    const next = new Set<string>();
    for (const id of frontier) {
      for (const { to } of adjacency.get(id) ?? []) {
        if (!nodeIds.has(to)) {
          nodeIds.add(to);
          next.add(to);
        }
      }
    }
    frontier = next;
  }

  const seenPairs = new Map<string, CombinedEdge>();
  for (const e of graph.edges) {
    if (!REUSE_EDGE_TYPES.has(e.type)) continue;
    if (!nodeIds.has(e.from) || !nodeIds.has(e.to)) continue;
    const key = `${e.from}=>${e.to}`;
    if (!seenPairs.has(key)) seenPairs.set(key, { from: e.from, to: e.to, types: [] });
    const combined = seenPairs.get(key)!;
    if (!combined.types.includes(e.type)) combined.types.push(e.type);
  }

  return { nodeIds, edges: Array.from(seenPairs.values()) };
}

// ── Endpoint coverage matrix ─────────────────────────────────────────────────

export interface EndpointRow {
  endpointId: string;
  method: string;
  path: string;
  cases: GraphNodeData[];
  worstStatus: ExecStatus;
}

export function buildEndpointMatrix(graph: GraphPayload): EndpointRow[] {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const callersByEndpoint = new Map<string, Set<string>>();

  for (const e of graph.edges) {
    if (e.type !== "CALLS_ENDPOINT") continue;
    if (!callersByEndpoint.has(e.to)) callersByEndpoint.set(e.to, new Set());
    callersByEndpoint.get(e.to)!.add(e.from);
  }

  const rows: EndpointRow[] = [];
  for (const [endpointId, callerIds] of callersByEndpoint) {
    const raw = endpointId.replace(/^ENDPOINT:/, "");
    const [method, ...rest] = raw.split(" ");
    const cases = Array.from(callerIds)
      .map((id) => byId.get(id))
      .filter((n): n is GraphNodeData => !!n && n.type === "TEST_CASE");

    let worst: ExecStatus = "NOT_RUN";
    const priority: ExecStatus[] = ["FAILED", "INVALID", "BLOCKED", "SKIPPED", "RUNNING", "QUEUED", "PASSED", "NOT_RUN"];
    for (const c of cases) {
      const s = execStatus(c);
      if (priority.indexOf(s) < priority.indexOf(worst)) worst = s;
    }

    rows.push({ endpointId, method: method ?? "", path: rest.join(" "), cases, worstStatus: worst });
  }

  rows.sort((a, b) => (a.path + a.method).localeCompare(b.path + b.method));
  return rows;
}
