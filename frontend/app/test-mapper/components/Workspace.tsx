"use client";

import { useMemo } from "react";
import clsx from "clsx";
import type { CaseResult, GraphNodeData, GraphPayload, RunDetail } from "../lib/types";
import { descendantCases, mergeRunData } from "../lib/graphUtils";
import OverviewTab from "./tabs/OverviewTab";
import TestCasesTab from "./tabs/TestCasesTab";
import ScenarioTab from "./tabs/ScenarioTab";
import DependenciesTab from "./tabs/DependenciesTab";
import EndpointsTab from "./tabs/EndpointsTab";

interface WorkspaceProps {
  selected: GraphNodeData | null;
  graph: GraphPayload;
  latestRun: RunDetail | null;
  activeTab: string;
  onTabChange: (t: string) => void;
  onSelect: (n: GraphNodeData) => void;
  loadSource: (path: string) => Promise<string>;
}

const TAB_ORDER = ["overview", "cases", "scenario", "dependencies", "endpoints"];
const TAB_LABEL: Record<string, string> = {
  overview: "Overview",
  cases: "Test Cases",
  scenario: "Scenario",
  dependencies: "Dependencies",
  endpoints: "Endpoints",
};

export default function Workspace({ selected, graph, latestRun, activeTab, onTabChange, onSelect, loadSource }: WorkspaceProps) {
  // graph.json is a static export that goes stale between runs — merge the
  // freshly-fetched latest run's per-case status/duration onto it once here
  // so every tab below just reads plain node fields, no separate overlay
  // plumbing needed per tab.
  const mergedGraph: GraphPayload = useMemo(
    () => ({ ...graph, nodes: mergeRunData(graph.nodes, latestRun) }),
    [graph, latestRun]
  );

  const cases = useMemo(() => (selected ? descendantCases(mergedGraph, selected.id) : []), [mergedGraph, selected]);
  const caseIds = useMemo(() => new Set(cases.map((c) => c.id)), [cases]);

  const runCase: CaseResult | null = useMemo(() => {
    if (!latestRun || !selected || selected.type !== "TEST_CASE") return null;
    return latestRun.cases.find((c) => c.caseId === selected.id) ?? null;
  }, [latestRun, selected]);

  if (!selected) {
    return (
      <div className="flex h-full items-center justify-center text-sm" style={{ color: "#888" }}>
        Select a collection, suite, or test case from the explorer to get started.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div style={{ display: "flex", gap: 2, padding: "4px 6px 0", background: "#e4e0cd", borderBottom: "1px solid #8e8e8e" }}>
        {TAB_ORDER.map((key) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => onTabChange(key)}
              style={{
                fontSize: 12,
                padding: "5px 14px",
                border: "1px solid #8e8e8e",
                borderBottom: active ? "1px solid #fff" : "1px solid #8e8e8e",
                borderTopLeftRadius: 3,
                borderTopRightRadius: 3,
                background: active ? "#fff" : "linear-gradient(180deg,#f3f1e6,#e4e0cd)",
                fontWeight: active ? "bold" : "normal",
                position: "relative",
                top: 1,
              }}
              className={clsx(active && "z-10")}
            >
              {TAB_LABEL[key]}
            </button>
          );
        })}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto" style={{ background: "#fff" }}>
        {activeTab === "overview" && (
          <OverviewTab selected={selected} cases={cases} graph={mergedGraph} latestRun={latestRun} onSelectCase={onSelect} />
        )}
        {activeTab === "cases" && <TestCasesTab cases={cases} graph={mergedGraph} onSelect={onSelect} />}
        {activeTab === "scenario" && <ScenarioTab selected={selected} runCase={runCase} loadSource={loadSource} />}
        {activeTab === "dependencies" && (
          <div className="h-full">
            <DependenciesTab selected={selected} graph={mergedGraph} onSelect={onSelect} />
          </div>
        )}
        {activeTab === "endpoints" && (
          <EndpointsTab
            graph={mergedGraph}
            scopeCaseIds={selected.type === "TEST_CASE" ? new Set([selected.id]) : caseIds}
            onSelectCase={onSelect}
          />
        )}
      </div>
    </div>
  );
}
