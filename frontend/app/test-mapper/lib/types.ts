export type GraphNodeType =
  | "TEST_COLLECTION"
  | "TEST_SUITE"
  | "TEST_CASE"
  | "TEST_UTIL"
  | "TEST_DATA"
  | "API_ENDPOINT"
  | "FIXTURE";

export type ExecStatus =
  | "PASSED"
  | "FAILED"
  | "SKIPPED"
  | "BLOCKED"
  | "NOT_RUN"
  | "QUEUED"
  | "RUNNING"
  | "INVALID";

export interface GraphNodeData {
  id: string;
  type: GraphNodeType;
  number?: string;
  title?: string;
  owner?: string;
  status?: string;
  tags?: string[];
  sourceFile?: string;
  lastExecutionStatus?: ExecStatus;
  durationMs?: number;
  callers?: number;
  endpointCalls?: number;
}

export type GraphEdgeType = "CONTAINS" | "CALLS" | "USES" | "CONSUMES" | "DEPENDS_ON" | "CALLS_ENDPOINT";

export interface GraphEdgeData {
  from: string;
  to: string;
  type: GraphEdgeType;
}

export interface GraphIssue {
  severity: "ERROR" | "WARNING" | "INFO";
  code: string;
  message: string;
}

export interface GraphPayload {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  issues: GraphIssue[];
}

// ── Run reports (test-results/json/run-*.json, served via /api/runs) ───────

export interface StepResult {
  stepNumber: number;
  utilId: string | null;
  httpMethod: string | null;
  normalizedUrl: string | null;
  endpointTemplate: string | null;
  responseStatus: number | null;
  responseTimeMs: number | null;
  correlationId: string | null;
  retryCount: number;
  result: string;
  duplicateWarning: boolean;
  duplicateOfStep: number | null;
}

export interface CaseResult {
  caseId: string;
  suiteId: string;
  title: string;
  status: ExecStatus;
  durationMs: number;
  skippedReason: string | null;
  failedAssertion: string | null;
  errorMessage: string | null;
  steps: StepResult[];
  dependencyChain: string[];
  sourceFile: string;
}

export interface RunSummary {
  runId: string;
  environment: string;
  baseUrl: string;
  gitCommit: string;
  startedAtEpochMs: number;
  finishedAtEpochMs: number;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  suiteIds: string[];
}

export interface RunDetail {
  runId: string;
  environment: string;
  baseUrl: string;
  gitCommit: string;
  startedAtEpochMs: number;
  finishedAtEpochMs: number;
  cases: CaseResult[];
}

// ── Scenario parsing (Given/When/Then, parsed client-side from raw source) ──

export type ScenarioPhase = "given" | "when" | "then" | "setup" | "teardown";

export interface ScenarioStep {
  phase: ScenarioPhase;
  keyword: string; // Given | When | Then | And | (raw command for setup/teardown)
  text: string; // the full statement line, keyword stripped
  isRest: boolean; // true for Get/Post/Put/Patch/Delete/Query/Batch/Create/Modify
  isAssertion: boolean; // Assert/AssertJson/AssertStatus/AssertHeader/ExpectFail/...
  steps?: StepResult[]; // matched runtime step(s) — a direct REST line gets one, a Call to a
  // multi-request util can carry several — when a run is loaded and this line issued request(s)
}
