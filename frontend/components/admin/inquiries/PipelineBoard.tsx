"use client";

import { useRef } from "react";
import { motion, type PanInfo } from "framer-motion";
import { COLUMN_THEME, PIPELINE_COLUMNS, avgStageDays } from "@/lib/enquiry";
import EnquiryCard from "./EnquiryCard";
import type { Enquiry, EnquiryStatus } from "@/types";

/**
 * Premium kanban pipeline. Each status is a soft-tinted, full-height lane with a
 * coloured header (count + description + average days-in-stage). Lanes scroll
 * independently; the page never becomes one giant scroll. Cards drag between
 * lanes (drop → status change) or advance via the card's primary button.
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

  const itemsFor = (statuses: EnquiryStatus[]) => enquiries.filter((e) => statuses.includes(e.status));

  const handleDragEnd = (e: Enquiry, event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
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
    <div className="flex h-[calc(100vh-21rem)] min-h-[26rem] gap-4 overflow-x-auto pb-2">
      {PIPELINE_COLUMNS.map((col) => {
        const items = itemsFor(col.statuses);
        const theme = COLUMN_THEME[col.key];
        const avg = avgStageDays(items);
        return (
          <div
            key={col.key}
            ref={(el) => { colRefs.current[col.key] = el; }}
            className="flex w-[19rem] shrink-0 flex-col overflow-hidden rounded-2xl shadow-sm ring-1 ring-black/[0.03]"
            style={{ background: theme.bg }}
          >
            {/* Header */}
            <div className="px-3.5 pb-2.5 pt-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-extrabold uppercase tracking-wide" style={{ color: theme.header }}>{col.label}</h3>
                  <p className="mt-0.5 text-xs text-slate-500">{theme.desc}</p>
                </div>
                <span
                  className="flex h-9 min-w-9 items-center justify-center rounded-xl px-2 text-lg font-extrabold leading-none text-white shadow-sm"
                  style={{ background: theme.header }}
                >
                  {items.length}
                </span>
              </div>
              {avg !== null && (
                <p className="mt-2 text-[0.65rem] font-semibold uppercase tracking-wider" style={{ color: theme.header }}>
                  Avg {avg} {avg === 1 ? "day" : "days"} in stage
                </p>
              )}
            </div>

            {/* Cards (independent scroll) */}
            <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-2.5 pb-3">
              {items.map((e) => (
                <motion.div
                  key={e.id}
                  layout
                  drag
                  dragSnapToOrigin
                  dragElastic={0.12}
                  whileDrag={{ scale: 1.04, zIndex: 50, boxShadow: "0 20px 40px rgba(15,23,42,0.22)" }}
                  onDragEnd={(event, info) => handleDragEnd(e, event, info)}
                  className="cursor-grab touch-none active:cursor-grabbing"
                >
                  <EnquiryCard enquiry={e} onStatus={onStatus} onNote={onNote} onFollowUp={onFollowUp} />
                </motion.div>
              ))}
              {items.length === 0 && (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 px-3 py-10 text-center">
                  <span className="text-3xl">{theme.emptyEmoji}</span>
                  <p className="text-xs font-medium text-slate-400">{theme.emptyText}</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
