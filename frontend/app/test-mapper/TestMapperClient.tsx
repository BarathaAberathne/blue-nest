"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./classic.css";
import TitleBar from "./components/classic/TitleBar";
import MenuBar from "./components/classic/MenuBar";
import Toolbar from "./components/classic/Toolbar";
import StatusBar from "./components/classic/StatusBar";
import ClassicPanel from "./components/classic/ClassicPanel";
import Explorer from "./components/Explorer";
import Inspector from "./components/Inspector";
import Workspace from "./components/Workspace";
import RunsScreen from "./components/RunsScreen";
import { buildHierarchyTree, execStatus } from "./lib/graphUtils";
import type { ExecStatus, GraphNodeData, GraphPayload, RunDetail, RunSummary } from "./lib/types";

export default function TestMapperClient() {
  const [graph, setGraph] = useState<GraphPayload | null>(null);
  const [graphError, setGraphError] = useState<string | null>(null);

  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [runsLoading, setRunsLoading] = useState(true);
  const [runDetailCache, setRunDetailCache] = useState<Record<string, RunDetail>>({});
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const [selected, setSelected] = useState<GraphNodeData | null>(null);
  const [view, setView] = useState<"explorer" | "runs">("explorer");
  const [activeTab, setActiveTab] = useState("overview");
  const [search, setSearch] = useState("");
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [sourceModal, setSourceModal] = useState<string | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  const sourceCacheRef = useRef<Record<string, string>>({});
  const searchInputRef = useRef<HTMLInputElement>(null);

  const fetchGraph = useCallback(() => {
    fetch("/test-platform-graph.json")
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.json();
      })
      .then((g: GraphPayload) => {
        setGraph(g);
        setSelected((prev) => prev ?? g.nodes.find((n) => n.type === "TEST_COLLECTION") ?? null);
      })
      .catch((e) => setGraphError(String(e)));
  }, []);

  const fetchRuns = useCallback(() => {
    setRunsLoading(true);
    fetch("/test-mapper/api/runs?limit=30")
      .then((r) => r.json())
      .then((data: { runs: RunSummary[] }) => {
        setRuns(data.runs ?? []);
        if (data.runs?.[0]) setSelectedRunId(data.runs[0].runId);
      })
      .finally(() => setRunsLoading(false));
  }, []);

  useEffect(() => {
    fetchGraph();
    fetchRuns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedRunId || runDetailCache[selectedRunId]) return;
    fetch(`/test-mapper/api/runs?runId=${selectedRunId}`)
      .then((r) => r.json())
      .then((detail: RunDetail) => setRunDetailCache((c) => ({ ...c, [selectedRunId]: detail })));
  }, [selectedRunId, runDetailCache]);

  function refreshAll() {
    fetchGraph();
    fetchRuns();
    setRunDetailCache({});
  }

  const latestRun = runs[0] ?? null;
  const latestRunDetail = selectedRunId === runs[0]?.runId ? runDetailCache[selectedRunId ?? ""] ?? null : null;
  const selectedRunDetail = selectedRunId ? runDetailCache[selectedRunId] ?? null : null;

  const tree = useMemo(() => (graph ? buildHierarchyTree(graph) : []), [graph]);
  const utilNodes = useMemo(() => (graph ? graph.nodes.filter((n) => n.type === "TEST_UTIL") : []), [graph]);

  const runStatusByCaseId = useMemo(() => {
    const m = new Map<string, ExecStatus>();
    if (latestRunDetail) {
      for (const c of latestRunDetail.cases) m.set(c.caseId, c.status);
    }
    return m;
  }, [latestRunDetail]);

  const statusOf = useCallback(
    (n: GraphNodeData): ExecStatus => runStatusByCaseId.get(n.id) ?? execStatus(n),
    [runStatusByCaseId]
  );

  const loadSource = useCallback(async (path: string): Promise<string> => {
    if (sourceCacheRef.current[path]) return sourceCacheRef.current[path];
    const res = await fetch(`/test-mapper/api/source?file=${encodeURIComponent(path)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "failed to load source");
    sourceCacheRef.current[path] = data.content;
    return data.content;
  }, []);

  function handleSelect(n: GraphNodeData) {
    setSelected(n);
    setView("explorer");
  }

  function handleJumpToCase(caseId: string) {
    const n = graph?.nodes.find((x) => x.id === caseId);
    if (n) {
      setSelected(n);
      setActiveTab("scenario");
    }
    setView("explorer");
  }

  function copyCommand(cmd: string) {
    navigator.clipboard?.writeText(cmd).catch(() => {});
  }

  if (graphError) {
    return (
      <main className="tf-classic flex min-h-screen items-center justify-center p-8">
        <div className="tf-panel" style={{ maxWidth: 560 }}>
          <div className="tf-panel-title">BlueNest TestFlow</div>
          <div className="tf-panel-body" style={{ padding: 16, fontSize: 13 }}>
            <p style={{ color: "var(--tf-fail)" }}>Could not load the graph ({graphError}).</p>
            <p style={{ marginTop: 8 }}>
              Run <code className="font-mono">make test-map</code> — it generates{" "}
              <code className="font-mono">test-results/graphs/graph.json</code> and copies it to{" "}
              <code className="font-mono">frontend/public/test-platform-graph.json</code>.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!graph) {
    return (
      <main className="tf-classic flex min-h-screen items-center justify-center">
        <p style={{ fontSize: 13 }}>Loading graph…</p>
      </main>
    );
  }

  return (
    <div className="tf-classic flex h-screen flex-col overflow-hidden">
      <TitleBar title="BlueNest TestFlow" minimized={minimized} onToggleMinimize={() => setMinimized((m) => !m)} />
      {!minimized && (
        <>
          <MenuBar
            onRefresh={refreshAll}
            onSetView={setView}
            density={density}
            onSetDensity={setDensity}
            onFocusSearch={() => {
              setView("explorer");
              searchInputRef.current?.focus();
            }}
            onCopyCommand={copyCommand}
            onShowAbout={() => setAboutOpen(true)}
          />
          <Toolbar
            onRefresh={refreshAll}
            onFocusSearch={() => {
              setView("explorer");
              searchInputRef.current?.focus();
            }}
            onShowAbout={() => setAboutOpen(true)}
            onCopyCommand={copyCommand}
          />

          {view === "explorer" ? (
            <div
              className={`grid min-h-0 flex-1 gap-1 p-1 ${density === "compact" ? "text-[12px]" : ""}`}
              style={{ gridTemplateColumns: "260px 1fr 300px", background: "var(--tf-chrome-bg)" }}
            >
              <ClassicPanel title="Test Explorer" icon="📁">
                <Explorer
                  ref={searchInputRef}
                  tree={tree}
                  utilNodes={utilNodes}
                  selected={selected}
                  onSelect={handleSelect}
                  statusOf={statusOf}
                  search={search}
                  onSearchChange={setSearch}
                />
              </ClassicPanel>
              <ClassicPanel title={selected ? `${selected.title ?? selected.id}` : "Process Map Overview"} icon="🗺️" collapsible={false}>
                <Workspace
                  selected={selected}
                  graph={graph}
                  latestRun={latestRunDetail}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  onSelect={handleSelect}
                  loadSource={loadSource}
                />
              </ClassicPanel>
              <ClassicPanel title="Node Details" icon="🔎">
                <Inspector
                  selected={selected}
                  graph={graph}
                  runCase={selected && latestRunDetail ? latestRunDetail.cases.find((c) => c.caseId === selected.id) ?? null : null}
                  onOpenSource={() => selected?.sourceFile && setSourceModal(selected.sourceFile)}
                  onGoToTab={setActiveTab}
                />
              </ClassicPanel>
            </div>
          ) : (
            <div className="min-h-0 flex-1 p-1" style={{ background: "var(--tf-chrome-bg)" }}>
              <ClassicPanel title="Run History &amp; Reports" icon="📊" collapsible={false} className="h-full">
                <RunsScreen
                  runs={runs}
                  runsLoading={runsLoading}
                  selectedRunId={selectedRunId}
                  onSelectRun={setSelectedRunId}
                  runDetail={selectedRunDetail}
                  graph={graph}
                  onJumpToCase={handleJumpToCase}
                />
              </ClassicPanel>
            </div>
          )}

          <StatusBar latestRun={latestRun} onViewReport={() => setView("runs")} />
        </>
      )}

      {sourceModal && <SourceModal path={sourceModal} loadSource={loadSource} onClose={() => setSourceModal(null)} />}
      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
    </div>
  );
}

function SourceModal({ path, loadSource, onClose }: { path: string; loadSource: (p: string) => Promise<string>; onClose: () => void }) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSource(path).then(setContent).catch((e) => setError(String(e)));
  }, [path, loadSource]);

  return (
    <div className="tf-classic fixed inset-0 z-50 flex items-center justify-center p-8" style={{ background: "rgba(0,0,0,0.4)" }} onClick={onClose}>
      <div className="tf-panel" style={{ maxWidth: 760, width: "100%", maxHeight: "80vh" }} onClick={(e) => e.stopPropagation()}>
        <div className="tf-panel-title">
          <span className="font-mono" style={{ fontWeight: "normal" }}>
            {path.replace(/^.*test-platform\//, "test-platform/")}
          </span>
          <div className="tf-panel-title-actions">
            <button onClick={onClose}>✕</button>
          </div>
        </div>
        <pre className="font-mono" style={{ maxHeight: "70vh", overflow: "auto", padding: 14, fontSize: 12, background: "#fff" }}>
          {error ? `Error: ${error}` : content ?? "Loading…"}
        </pre>
      </div>
    </div>
  );
}

function AboutModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="tf-classic fixed inset-0 z-50 flex items-center justify-center p-8" style={{ background: "rgba(0,0,0,0.4)" }} onClick={onClose}>
      <div className="tf-panel" style={{ maxWidth: 420, width: "100%" }} onClick={(e) => e.stopPropagation()}>
        <div className="tf-panel-title">
          <span>About BlueNest TestFlow</span>
          <div className="tf-panel-title-actions">
            <button onClick={onClose}>✕</button>
          </div>
        </div>
        <div style={{ padding: 16, fontSize: 12 }}>
          <p style={{ fontWeight: "bold", marginBottom: 6 }}>BlueNest TestFlow v1</p>
          <p style={{ marginBottom: 6 }}>
            A read-only explorer/inspector for the `.bnrest.md` API test platform — browse the functional test tree,
            inspect a case&apos;s real Given/When/Then flow and HTTP steps, walk its dependency graph, and review
            run history. Test execution itself happens via the <code className="font-mono">make</code> targets shown
            under Run/Tools — this UI never runs tests itself.
          </p>
          <p style={{ color: "#777" }}>Local development tool. Not part of the tenant admin shell.</p>
        </div>
      </div>
    </div>
  );
}
