"use client";

/**
 * A draggable animal in the tray. A real <button>, so it is keyboard focusable
 * and activatable — clicking/Enter "picks it up" (selects), then a habitat can
 * be chosen; or it can be dragged straight onto a habitat. Large touch target.
 */
import { memo } from "react";
import { motion } from "framer-motion";
import { AnimalIcon } from "./icons";
import type { AnimalDef } from "./types";

interface AnimalCardProps {
  def: AnimalDef;
  selected: boolean;
  dragging: boolean;
  reduce: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onSelect: () => void;
}

function AnimalCardBase({ def, selected, dragging, reduce, onPointerDown, onSelect }: AnimalCardProps) {
  return (
    <motion.button
      type="button"
      onPointerDown={onPointerDown}
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${def.name}. ${selected ? "Selected — now choose its home." : "Pick up, then choose its home."}`}
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: dragging ? 0.3 : 1, scale: selected ? 1.06 : 1, y: selected && !reduce ? -6 : 0 }}
      exit={{ opacity: 0, scale: 0.3, y: -30 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      whileHover={reduce ? undefined : { y: -4 }}
      whileTap={{ scale: 0.94 }}
      style={{ touchAction: "none" }}
      className={`flex shrink-0 flex-col items-center gap-1 rounded-[24px] border-2 bg-white p-2 shadow-sm sm:p-3 ${
        selected ? "border-[#4A90E2] ring-2 ring-[#4A90E2]/40" : "border-[#ECE3D6] hover:border-[#A9C5B0]"
      } cursor-grab focus:outline-none focus-visible:ring-4 focus-visible:ring-[#4A90E2]/50`}
    >
      <span className="flex h-12 w-12 items-center justify-center sm:h-16 sm:w-16">
        <AnimalIcon id={def.id} className="h-full w-full pointer-events-none" />
      </span>
      <span className="text-[0.7rem] font-bold text-[#2F5D9F] sm:text-sm">{def.name}</span>
    </motion.button>
  );
}

export const AnimalCard = memo(AnimalCardBase);
