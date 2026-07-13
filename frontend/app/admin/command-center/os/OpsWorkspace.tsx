"use client";

import { useEffect, useRef, useState } from "react";
import { Reorder, AnimatePresence, motion } from "framer-motion";
import {
  Pencil, Check, Plus, RotateCcw, GripVertical, X, Scaling,
} from "lucide-react";
import {
  FINANCE_ANALYTICS, ENQUIRY_SOURCES, CALENDAR, type BranchMetric,
} from "../data";
import { LineChart, MiniCalendar, MiniDonut, SentimentLine } from "../widgets";
import { useEnquiryPipeline, useBranchMetrics, type LivePipeline } from "../live";
import TasksPanel from "./TasksPanel";

/* ── Panel registry ───────────────────────────────────────────────────────── */
type PanelId = "tasks" | "attendance" | "admissions" | "sentiment" | "revenue" | "occupancy" | "calendar" | "sources" | "finance";

const heatRows = (branches: BranchMetric[], get: (m: BranchMetric) => number) => (
  <div className="flex flex-col gap-1.5">
    {branches.map((m) => (
      <div key={m.slug} className="flex items-center gap-2">
        <span className="cc-label" style={{ width: 80, fontSize: 9, color: "var(--cc-muted)" }}>{m.name}</span>
        <div className="cc-heat-track"><div className="cc-heat-fill" style={{ width: `${get(m)}%` }} /></div>
        <span className="cc-heading" style={{ width: 32, textAlign: "right", fontSize: 11, color: "var(--cc-text)" }}>{get(m)}%</span>
      </div>
    ))}
  </div>
);

function renderPanel(id: PanelId, pipeline: LivePipeline, branches: BranchMetric[]) {
  switch (id) {
    case "tasks":
      return <TasksPanel />;
    case "attendance":
      return heatRows(branches, (m) => m.attendanceToday);
    case "occupancy":
      return heatRows(branches, (m) => m.occupancy);
    case "admissions":
      return (
        <div className="flex flex-col gap-1">
          {pipeline.funnel.map((f) => (
            <div key={f.label} className="flex items-baseline justify-between gap-2" style={{ fontSize: 11 }}>
              <span className="cc-label" style={{ color: f.highlight ? "var(--cc-accent)" : "var(--cc-muted)" }}>{f.label}</span>
              <span className="cc-heading" style={{ color: f.highlight ? "var(--cc-accent)" : "var(--cc-text)" }}>{f.value}</span>
            </div>
          ))}
          <div className="flex items-baseline justify-between gap-2 mt-1 pt-1" style={{ borderTop: "1px solid var(--cc-line)", fontSize: 11 }}>
            <span className="cc-label" style={{ color: "var(--cc-muted)" }}>Conversion</span>
            <span className="cc-heading" style={{ color: "var(--cc-accent)" }}>{pipeline.conversion}%</span>
          </div>
        </div>
      );
    case "sentiment":
      return (
        <div className="flex flex-col gap-1">
          {branches.map((m) => (
            <div key={m.slug} className="cc-brow">
              <div style={{ width: 84 }}>
                <p className="cc-heading" style={{ fontSize: 9.5, color: "var(--cc-accent)" }}>{m.name}</p>
                <p style={{ fontSize: 11, color: "var(--cc-text)" }}>{m.sentiment.score}★</p>
              </div>
              <div style={{ flex: 1 }}><SentimentLine points={m.sentiment.points} height={34} /></div>
            </div>
          ))}
        </div>
      );
    case "revenue":
      return <LineChart points={FINANCE_ANALYTICS.trend} budget={FINANCE_ANALYTICS.budget} height={130} />;
    case "calendar":
      return <MiniCalendar year={CALENDAR.year} month={CALENDAR.month} events={CALENDAR.events} legend={CALENDAR.legend} />;
    case "sources":
      return (
        <div className="flex items-center gap-3">
          <MiniDonut slices={ENQUIRY_SOURCES} size={110} center="134" sub="ENQ" />
          <div className="flex-1 flex flex-col gap-1">
            {ENQUIRY_SOURCES.map((s) => (
              <div key={s.label} className="flex items-center gap-1.5" style={{ fontSize: 9.5 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
                <span className="cc-label" style={{ flex: 1, color: "var(--cc-muted)" }}>{s.label}</span>
                <span style={{ color: "var(--cc-text)", fontWeight: 600 }}>{s.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      );
    case "finance":
      return (
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          {FINANCE_ANALYTICS.stats.map((s) => (
            <div key={s.label} className="flex items-baseline justify-between gap-2" style={{ fontSize: 10.5 }}>
              <span className="cc-label" style={{ color: "var(--cc-muted)" }}>{s.label}</span>
              <span className="cc-heading" style={{ color: s.tone === "bad" ? "var(--cc-error)" : s.tone === "ok" ? "var(--cc-success)" : s.tone === "accent" ? "var(--cc-accent)" : "var(--cc-text)" }}>{s.value}</span>
            </div>
          ))}
        </div>
      );
  }
}

const PANEL_TITLES: Record<PanelId, string> = {
  tasks: "Tasks", attendance: "Child Attendance", admissions: "Admissions", sentiment: "Parent Sentiment",
  revenue: "Revenue Trend", occupancy: "Occupancy", calendar: "Calendar",
  sources: "Enquiry Sources", finance: "Finance Snapshot",
};

type Item = { id: PanelId; span: 1 | 2 | 3 };
const DEFAULT_ITEMS: Item[] = [
  { id: "tasks", span: 1 },
  { id: "attendance", span: 1 },
  { id: "admissions", span: 1 },
  { id: "sentiment", span: 1 },
];
const ALL_IDS: PanelId[] = ["tasks", "attendance", "admissions", "sentiment", "revenue", "occupancy", "calendar", "sources", "finance"];
const LS_KEY = "cc-ops-layout-v2";

/* ── Modular operational workspace ────────────────────────────────────────── */
export default function OpsWorkspace() {
  const pipeline = useEnquiryPipeline();
  const { metrics: branches } = useBranchMetrics();
  const [items, setItems] = useState<Item[]>(DEFAULT_ITEMS);
  const [height, setHeight] = useState(232);
  const [edit, setEdit] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load saved layout after mount (avoids SSR/hydration mismatch).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const p = JSON.parse(raw) as { items: Item[]; height: number };
        if (Array.isArray(p.items) && p.items.length) setItems(p.items.filter((i) => ALL_IDS.includes(i.id)));
        if (typeof p.height === "number") setHeight(Math.min(Math.max(p.height, 150), 520));
      }
    } catch { /* ignore malformed */ }
  }, []);

  const hidden = ALL_IDS.filter((id) => !items.some((i) => i.id === id));
  const cycleSpan = (id: PanelId) =>
    setItems((xs) => xs.map((i) => (i.id === id ? { ...i, span: ((i.span % 3) + 1) as 1 | 2 | 3 } : i)));
  const hide = (id: PanelId) => setItems((xs) => xs.filter((i) => i.id !== id));
  const add = (id: PanelId) => { setItems((xs) => [...xs, { id, span: 1 }]); setAddOpen(false); };
  const save = () => {
    localStorage.setItem(LS_KEY, JSON.stringify({ items, height }));
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };
  const reset = () => { setItems(DEFAULT_ITEMS); setHeight(232); localStorage.removeItem(LS_KEY); };

  // Resizable strip height (drag the top handle).
  const dragging = useRef(false);
  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!dragging.current) return;
      setHeight((h) => Math.min(Math.max(h - e.movementY, 150), 520));
    };
    const up = () => { dragging.current = false; document.body.style.cursor = ""; };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, []);

  return (
    <div className="cc-ops" style={{ height }}>
      <div
        className="cc-ops-resize"
        onPointerDown={() => { dragging.current = true; document.body.style.cursor = "ns-resize"; }}
        title="Drag to resize"
      />
      <div className="cc-ops-head">
        <p className="cc-heading" style={{ fontSize: 10.5, letterSpacing: "0.14em", color: "var(--cc-text)" }}>OPERATIONAL WORKSPACE</p>
        <div className="cc-ops-toolbar">
          {edit && (
            <div className="cc-ops-addwrap">
              <button className="cc-ops-tbtn" onClick={() => setAddOpen((o) => !o)} disabled={hidden.length === 0}>
                <Plus size={12} /> Add
              </button>
              <AnimatePresence>
                {addOpen && hidden.length > 0 && (
                  <motion.div className="cc-ops-menu" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                    {hidden.map((id) => (
                      <button key={id} className="cc-ops-menu-item" onClick={() => add(id)}>{PANEL_TITLES[id]}</button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
          {edit && <button className="cc-ops-tbtn" onClick={reset}><RotateCcw size={12} /> Reset</button>}
          {edit && <button className="cc-ops-tbtn cc-ops-tbtn--save" onClick={save}><Check size={12} /> {saved ? "Saved" : "Save layout"}</button>}
          <button className={`cc-ops-tbtn ${edit ? "cc-ops-tbtn--on" : ""}`} onClick={() => { setEdit((e) => !e); setAddOpen(false); }}>
            {edit ? <Check size={12} /> : <Pencil size={12} />} {edit ? "Done" : "Edit layout"}
          </button>
        </div>
      </div>

      <Reorder.Group as="div" axis="y" values={items} onReorder={setItems} className="cc-ops-grid cc-col-scroll">
        {items.map((it) => (
          <Reorder.Item
            key={it.id}
            value={it}
            drag={edit}
            dragListener={edit}
            layout
            className={`cc-ops-item ${edit ? "cc-ops-item--edit" : ""}`}
            style={{ gridColumn: `span ${it.span}` }}
            whileDrag={{ scale: 1.02, zIndex: 5, boxShadow: "0 18px 40px rgba(0,0,0,0.5)" }}
          >
            <div className="cc-ops-item-head">
              {edit && <GripVertical size={13} className="cc-ops-grip" />}
              <span className="cc-ops-title" style={{ flex: 1 }}>
                {PANEL_TITLES[it.id].toUpperCase()}
                {it.id === "admissions" && pipeline.live && <span style={{ color: "var(--cc-success)", fontSize: 8, marginLeft: 6 }}>● LIVE</span>}
              </span>
              {edit && (
                <div className="flex items-center gap-1">
                  <button className="cc-ops-ictl" onClick={() => cycleSpan(it.id)} title="Resize"><Scaling size={12} /><span style={{ fontSize: 8 }}>{["S", "M", "L"][it.span - 1]}</span></button>
                  <button className="cc-ops-ictl" onClick={() => hide(it.id)} title="Remove"><X size={12} /></button>
                </div>
              )}
            </div>
            <div className="cc-ops-item-body cc-col-scroll">{renderPanel(it.id, pipeline, branches)}</div>
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </div>
  );
}
