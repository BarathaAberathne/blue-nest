"use client";

import { useRef } from "react";
import { motion, type PanInfo } from "framer-motion";
import { PIPELINE_COLUMNS } from "@/lib/enquiry";
import { STATUS_META } from "@/lib/enquiry";
import EnquiryCard from "./EnquiryCard";
import type { Enquiry, EnquiryStatus } from "@/types";

/**
 * Kanban pipeline. Cards can be dragged between columns (drop → status change)
 * or advanced via the quick-action buttons on each card. Drag uses a snap-back
 * animation; the actual move is reflected after the status mutation refetches.
 */
export default function PipelineBoard({
  enquiries,
  onStatus,
  onNote,
  onFollowUp,
}: {
  enquiries: Enquiry[];
  onStatus: (e: Enquiry, status: EnquiryStatus) => void;
  onNote: (e: Enquiry) => void;
  onFollowUp: (e: Enquiry) => void;
}) {
  const colRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const byColumn = (key: string) => {
    const col = PIPELINE_COLUMNS.find((c) => c.key === key);
    if (!col) return [];
    return enquiries.filter((e) => col.statuses.includes(e.status));
  };

  const handleDragEnd = (e: Enquiry, event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // Pointer position in viewport coords to match getBoundingClientRect.
    const x = "clientX" in event ? event.clientX : info.point.x;
    const y = "clientY" in event ? event.clientY : info.point.y;
    for (const col of PIPELINE_COLUMNS) {
      const el = colRefs.current[col.key];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        if (!col.statuses.includes(e.status)) onStatus(e, col.dropStatus);
        return;
      }
    }
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-3">
      {PIPELINE_COLUMNS.map((col) => {
        const items = byColumn(col.key);
        const dot = STATUS_META[col.dropStatus]?.dot ?? "bg-slate-400";
        return (
          <div
            key={col.key}
            ref={(el) => {
              colRefs.current[col.key] = el;
            }}
            className="flex w-72 shrink-0 flex-col rounded-2xl bg-slate-50/70 p-2"
          >
            <div className="mb-2 flex items-center gap-2 px-2 py-1">
              <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
              <h3 className="text-sm font-semibold text-slate-700">{col.label}</h3>
              <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500">
                {items.length}
              </span>
            </div>
            <div className="flex min-h-[4rem] flex-1 flex-col gap-2">
              {items.map((e) => (
                <motion.div
                  key={e.id}
                  layout
                  drag
                  dragSnapToOrigin
                  dragElastic={0.15}
                  whileDrag={{ scale: 1.03, zIndex: 50 }}
                  onDragEnd={(event, info) => handleDragEnd(e, event, info)}
                  className="cursor-grab touch-none active:cursor-grabbing"
                >
                  <EnquiryCard enquiry={e} onStatus={onStatus} onNote={onNote} onFollowUp={onFollowUp} />
                </motion.div>
              ))}
              {items.length === 0 && (
                <p className="px-2 py-6 text-center text-xs text-slate-300">Nothing here</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
