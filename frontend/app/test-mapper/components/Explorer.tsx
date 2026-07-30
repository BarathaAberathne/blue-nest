"use client";

import { forwardRef, useMemo, useState } from "react";
import clsx from "clsx";
import type { ExecStatus, GraphNodeData } from "../lib/types";
import { TreeNode } from "../lib/graphUtils";
import { DocumentIcon, FolderIcon, FolderOpenIcon, WrenchIcon } from "./classic/icons";

interface ExplorerProps {
  tree: TreeNode[];
  utilNodes: GraphNodeData[];
  selected: GraphNodeData | null;
  onSelect: (n: GraphNodeData) => void;
  statusOf: (n: GraphNodeData) => ExecStatus;
  search: string;
  onSearchChange: (s: string) => void;
}

const STATUS_DOT_COLOR: Record<ExecStatus, string> = {
  PASSED: "#3fae46",
  FAILED: "#d84343",
  SKIPPED: "#e0a530",
  BLOCKED: "#e0a530",
  NOT_RUN: "#c6c6c6",
  QUEUED: "#4a90d9",
  RUNNING: "#4a90d9",
  INVALID: "#d84343",
};

function matchesSearch(n: GraphNodeData, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return n.id.toLowerCase().includes(needle) || (n.title ?? "").toLowerCase().includes(needle);
}

function subtreeMatches(t: TreeNode, q: string): boolean {
  if (matchesSearch(t.node, q)) return true;
  return t.children.some((c) => subtreeMatches(c, q));
}

function StatusDot({ status }: { status: ExecStatus }) {
  return (
    <span
      title={status.replace("_", " ")}
      style={{
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: STATUS_DOT_COLOR[status],
        border: "1px solid rgba(0,0,0,0.3)",
        flexShrink: 0,
      }}
    />
  );
}

function NodeIcon({ type, open }: { type: GraphNodeData["type"]; open?: boolean }) {
  if (type === "TEST_COLLECTION" || type === "TEST_SUITE") return open ? <FolderOpenIcon /> : <FolderIcon />;
  if (type === "TEST_UTIL" || type === "TEST_DATA") return <WrenchIcon />;
  return <DocumentIcon />;
}

function TreeRow({
  t,
  depth,
  search,
  selected,
  onSelect,
  statusOf,
}: {
  t: TreeNode;
  depth: number;
  search: string;
  selected: GraphNodeData | null;
  onSelect: (n: GraphNodeData) => void;
  statusOf: (n: GraphNodeData) => ExecStatus;
}) {
  const [open, setOpen] = useState(depth < 2 || search.length > 0);
  if (!subtreeMatches(t, search)) return null;

  const hasChildren = t.children.length > 0;
  const isSelected = selected?.id === t.node.id;
  const isCase = t.node.type === "TEST_CASE";

  return (
    <div>
      <div
        onClick={() => {
          onSelect(t.node);
          if (hasChildren) setOpen((o) => !o);
        }}
        className={clsx("tf-tree-row", isSelected && "tf-selected")}
        style={{ paddingLeft: 4 + depth * 16 }}
      >
        {hasChildren ? (
          <span className="tf-tree-expander" onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}>
            {open ? "−" : "+"}
          </span>
        ) : (
          <span style={{ width: 12, flexShrink: 0 }} />
        )}
        <StatusDot status={statusOf(t.node)} />
        <NodeIcon type={t.node.type} open={open} />
        <span className={clsx("truncate", !isCase && "font-bold")} style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
          {t.node.title ?? t.node.id}
        </span>
        {isCase && (
          <span className="font-mono" style={{ marginLeft: "auto", fontSize: 10, color: "#999", flexShrink: 0 }}>
            {t.node.id}
          </span>
        )}
      </div>
      {open && hasChildren && (
        <div>
          {t.children.map((c) => (
            <TreeRow key={c.node.id} t={c} depth={depth + 1} search={search} selected={selected} onSelect={onSelect} statusOf={statusOf} />
          ))}
        </div>
      )}
    </div>
  );
}

const Explorer = forwardRef<HTMLInputElement, ExplorerProps>(function Explorer(
  { tree, utilNodes, selected, onSelect, statusOf, search, onSearchChange },
  searchInputRef
) {
  const [utilsOpen, setUtilsOpen] = useState(false);
  const filteredUtils = useMemo(() => utilNodes.filter((n) => matchesSearch(n, search)), [utilNodes, search]);

  return (
    <div className="flex h-full flex-col">
      <div style={{ flexShrink: 0, padding: 6, borderBottom: "1px solid var(--tf-chrome-border)", background: "var(--tf-chrome-bg)" }}>
        <input
          ref={searchInputRef}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search tests…"
          aria-label="Search tests"
          style={{
            width: "100%",
            fontSize: 12,
            padding: "3px 6px",
            border: "1px solid #8e8e8e",
            background: "#fff",
          }}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto" style={{ padding: 4 }}>
        <div
          className="tf-tree-row"
          style={{ cursor: "default", fontWeight: "bold" }}
        >
          <span style={{ width: 12, flexShrink: 0 }} />
          <span>🗄️</span>
          <span>BlueNest Test Repository</span>
        </div>
        {tree.map((t) => (
          <TreeRow key={t.node.id} t={t} depth={1} search={search} selected={selected} onSelect={onSelect} statusOf={statusOf} />
        ))}

        {filteredUtils.length > 0 && (
          <div>
            <div
              onClick={() => setUtilsOpen((o) => !o)}
              className="tf-tree-row"
              style={{ paddingLeft: 20 }}
            >
              <span className="tf-tree-expander">{utilsOpen ? "−" : "+"}</span>
              {utilsOpen ? <FolderOpenIcon /> : <FolderIcon />}
              <span className="font-bold">Utilities</span>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 10,
                  color: "#777",
                  background: "#e8e8e8",
                  border: "1px solid #ccc",
                  borderRadius: 8,
                  padding: "0 6px",
                }}
              >
                {filteredUtils.length}
              </span>
            </div>
            {utilsOpen &&
              filteredUtils.map((n) => (
                <div
                  key={n.id}
                  onClick={() => onSelect(n)}
                  className={clsx("tf-tree-row", selected?.id === n.id && "tf-selected")}
                  style={{ paddingLeft: 52 }}
                >
                  <WrenchIcon />
                  <span className="truncate">{n.title ?? n.id}</span>
                  <span className="font-mono" style={{ marginLeft: "auto", fontSize: 10, color: "#999" }}>
                    {n.id}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
});

export default Explorer;
