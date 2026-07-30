"use client";

import { useState } from "react";
import type { CaseResult, GraphNodeData, GraphPayload } from "../lib/types";
import { execStatus } from "../lib/graphUtils";
import StatusChip from "./classic/StatusChip";
import { ChartIcon, ClipboardIcon, DocumentIcon, GlobeIcon, LinkIcon } from "./classic/icons";

interface InspectorProps {
  selected: GraphNodeData | null;
  graph: GraphPayload | null;
  runCase: CaseResult | null;
  onOpenSource: () => void;
  onGoToTab: (tab: string) => void;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="tf-propgrid-section-title">{children}</div>;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <dl className="tf-propgrid-row">
      <dt>{label}:</dt>
      <dd>{children}</dd>
    </dl>
  );
}

export default function Inspector({ selected, graph, runCase, onOpenSource, onGoToTab }: InspectorProps) {
  const [copied, setCopied] = useState(false);

  if (!selected) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm" style={{ color: "#888" }}>
        Select an item in the explorer to see its details.
      </div>
    );
  }

  const usesCount = (graph?.edges ?? []).filter((e) => e.from === selected.id && e.type === "USES").length;
  const usedByCount = (graph?.edges ?? []).filter((e) => e.to === selected.id && e.type === "USES").length;
  const endpointCount = (graph?.edges ?? []).filter((e) => e.from === selected.id && e.type === "CALLS_ENDPOINT").length;
  const status = runCase?.status ?? execStatus(selected);
  const isCase = selected.type === "TEST_CASE";

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <SectionTitle>Selected Node</SectionTitle>
      <Row label="ID">
        <span className="font-mono">{selected.id}</span>
      </Row>
      <Row label="Title">{selected.title ?? "—"}</Row>
      <Row label="Type">{selected.type.replace("_", " ")}</Row>
      <Row label="Status">
        <StatusChip status={status} />
      </Row>
      <Row label="Owner">{selected.owner ?? "—"}</Row>
      <Row label="Tags">{(selected.tags ?? []).join(", ") || "—"}</Row>
      <Row label="Duration">{runCase ? `${runCase.durationMs} ms` : selected.durationMs ? `${selected.durationMs} ms` : "—"}</Row>

      <SectionTitle>Reuse</SectionTitle>
      <Row label="Utilities">{usesCount} used</Row>
      <Row label="Used By">
        {usedByCount} test case{usedByCount === 1 ? "" : "s"}
      </Row>
      <Row label="Endpoints">{endpointCount} called</Row>

      {runCase && (
        <>
          <SectionTitle>Last Run</SectionTitle>
          {runCase.status === "FAILED" ? (
            <div style={{ margin: 8, padding: 6, background: "var(--tf-fail-bg)", border: "1px solid var(--tf-fail)", fontSize: 12 }}>
              {runCase.failedAssertion && <p className="font-mono" style={{ marginBottom: 4 }}>{runCase.failedAssertion}</p>}
              {runCase.errorMessage && <p>{runCase.errorMessage}</p>}
            </div>
          ) : runCase.status === "BLOCKED" ? (
            <Row label="Reason">{runCase.skippedReason ?? "Blocked."}</Row>
          ) : (
            <Row label="Requests">{runCase.steps.length} HTTP request(s) made</Row>
          )}
        </>
      )}

      <SectionTitle>Quick Actions</SectionTitle>
      <div style={{ padding: "6px 8px", display: "flex", flexDirection: "column", gap: 4 }}>
        {isCase && (
          <button className="tf-link-btn" onClick={() => onGoToTab("scenario")}>
            <DocumentIcon /> View Scenario Flow
          </button>
        )}
        <button className="tf-link-btn" onClick={() => onGoToTab("dependencies")}>
          <LinkIcon /> View Dependencies
        </button>
        <button className="tf-link-btn" onClick={() => onGoToTab("endpoints")}>
          <GlobeIcon /> View Endpoints
        </button>
        {!isCase && (
          <button className="tf-link-btn" onClick={() => onGoToTab("overview")}>
            <ChartIcon /> View Overview
          </button>
        )}
        {selected.sourceFile && (
          <>
            <button
              className="tf-link-btn"
              onClick={() => {
                navigator.clipboard?.writeText(selected.sourceFile ?? "").catch(() => {});
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
              }}
            >
              <ClipboardIcon /> {copied ? "Copied ✓" : "Copy Source Path"}
            </button>
            <button className="tf-link-btn" onClick={onOpenSource}>
              <DocumentIcon /> View Source
            </button>
          </>
        )}
      </div>

      {selected.sourceFile && (
        <>
          <SectionTitle>Source</SectionTitle>
          <p style={{ padding: "6px 8px", fontSize: 11, color: "#777", wordBreak: "break-all" }} className="font-mono">
            {selected.sourceFile.replace(/^.*test-platform\//, "test-platform/")}
          </p>
        </>
      )}
    </div>
  );
}
