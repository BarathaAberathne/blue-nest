"use client";

import { useRef, useState } from "react";
import { motion, type PanInfo } from "framer-motion";
import { ACCENT } from "@/lib/admin-theme";
import type { Lane } from "@/lib/admin-status";

/**
 * Generic, entity-agnostic Kanban board — the shared engine behind every admin
 * pipeline. Tinted full-height lanes with coloured headers + count badges,
 * independently scrolling card lists, friendly empty states, and framer-motion
 * drag-and-drop with viewport hit-testing (drop → onDrop with the lane's status).
 */
export default function KanbanBoard<T, S extends string>({
  columns,
  items,
  statusOf,
  idOf,
  renderCard,
  onDrop,
  columnFooter,
  height = "h-[calc(100vh-21rem)] min-h-[26rem]",
  columnWidth = "w-[19rem]",
}: {
  columns: Lane<S>[];
  items: T[];
  statusOf: (item: T) => S;
  idOf: (item: T) => string;
  renderCard: (item: T) => React.ReactNode;
  onDrop?: (item: T, dropStatus: S, lane: Lane<S>) => void;
  columnFooter?: (items: T[], lane: Lane<S>) => React.ReactNode;
  height?: string;
  columnWidth?: string;
}) {
  const colRefs = useRef<Record<string, HTMLDivElement | null>>({});
  // Key of the card currently being dragged, so we can lift it above everything
  // else (and stop its lane clipping it) while it's in flight.
  const [draggingKey, setDraggingKey] = useState<string | null>(null);

  const itemsFor = (lane: Lane<S>) => items.filter((it) => lane.statuses.includes(statusOf(it)));

  const handleDragEnd = (item: T, event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setDraggingKey(null);
    if (!onDrop) return;
    const x = "clientX" in event ? event.clientX : info.point.x;
    const y = "clientY" in event ? event.clientY : info.point.y;
    for (const lane of columns) {
      const el = colRefs.current[lane.key];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        if (!lane.statuses.includes(statusOf(item))) onDrop(item, lane.dropStatus, lane);
        return;
      }
    }
  };

  return (
    <div className={`flex ${height} gap-4 overflow-x-auto pb-2`}>
      {columns.map((lane) => {
        const laneItems = itemsFor(lane);
        const a = ACCENT[lane.accent] ?? ACCENT.slate;
        // The lane the dragged card started in must stop clipping and sit above
        // its neighbours so the card can float over them instead of being cut off.
        const isDragSource = draggingKey != null && laneItems.some((it) => idOf(it) === draggingKey);
        return (
          <div
            key={lane.key}
            ref={(el) => { colRefs.current[lane.key] = el; }}
            className={`flex ${columnWidth} shrink-0 flex-col rounded-2xl shadow-sm ring-1 ring-black/[0.03] ${isDragSource ? "" : "overflow-hidden"}`}
            style={{ background: a.soft, position: "relative", zIndex: isDragSource ? 40 : undefined }}
          >
            <div className="px-3.5 pb-2.5 pt-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-extrabold uppercase tracking-wide" style={{ color: a.solid }}>{lane.label}</h3>
                  <p className="mt-0.5 text-xs text-slate-500">{lane.desc}</p>
                </div>
                <span className="flex h-9 min-w-9 items-center justify-center rounded-xl px-2 text-lg font-extrabold leading-none text-white shadow-sm" style={{ background: a.solid }}>
                  {laneItems.length}
                </span>
              </div>
              {columnFooter?.(laneItems, lane)}
            </div>

            <div className={`flex flex-1 flex-col gap-2.5 px-2.5 pb-3 ${isDragSource ? "overflow-visible" : "overflow-y-auto"}`}>
              {laneItems.map((it) => {
                const isDragged = draggingKey === idOf(it);
                return (
                  <motion.div
                    key={idOf(it)}
                    layout
                    drag={!!onDrop}
                    dragSnapToOrigin
                    dragElastic={0.12}
                    whileDrag={{ scale: 1.04, boxShadow: "0 20px 40px rgba(15,23,42,0.22)" }}
                    onDragStart={() => setDraggingKey(idOf(it))}
                    onDragEnd={(event, info) => handleDragEnd(it, event, info)}
                    // Explicit stacking (relative + z-index) — reliable across the
                    // layout animation, so the in-flight card always rides on top
                    // instead of sinking behind its siblings.
                    style={{ position: "relative", zIndex: isDragged ? 60 : 1 }}
                    className={onDrop ? "cursor-grab touch-none active:cursor-grabbing" : ""}
                  >
                    {renderCard(it)}
                  </motion.div>
                );
              })}
              {laneItems.length === 0 && (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 px-3 py-10 text-center">
                  <span className="text-3xl">{lane.emptyEmoji}</span>
                  <p className="text-xs font-medium text-slate-400">{lane.emptyText}</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
