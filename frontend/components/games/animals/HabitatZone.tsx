"use client";

/**
 * An interactive habitat drop-zone overlaid on the scene art. It is a real
 * <button> (keyboard + screen-reader friendly) carrying a `data-habitat` id so
 * the game can hit-test drops with `elementFromPoint`. Shows a glow when an
 * animal hovers over it or has moved in, a gentle shake on a wrong drop, and
 * the matched animal happily sitting in its home.
 */
import { memo } from "react";
import { motion } from "framer-motion";
import { AnimalIcon } from "./icons";
import type { AnimalId, HabitatDef } from "./types";

interface HabitatZoneProps {
  def: HabitatDef;
  hovered: boolean;
  shaking: boolean;
  matched: AnimalId | null;
  selecting: boolean;
  reduce: boolean;
  onSelect: (id: HabitatDef["id"]) => void;
}

function HabitatZoneBase({ def, hovered, shaking, matched, selecting, reduce, onSelect }: HabitatZoneProps) {
  return (
    <motion.button
      type="button"
      data-habitat={def.id}
      onClick={() => !matched && onSelect(def.id)}
      disabled={!!matched}
      aria-label={matched ? `${def.name}: home complete` : `${def.name}. Drop an animal here, or select to place the chosen animal.`}
      className="absolute rounded-full outline-none focus-visible:ring-4 focus-visible:ring-[#4A90E2]/70 disabled:cursor-default"
      style={{
        left: `${def.pos.x}%`,
        top: `${def.pos.y}%`,
        width: def.size,
        height: def.size,
        marginLeft: -def.size / 2,
        marginTop: -def.size / 2,
        touchAction: "none",
      }}
      animate={shaking && !reduce ? { x: [0, -6, 6, -5, 5, 0] } : { x: 0 }}
      transition={{ duration: 0.45 }}
    >
      {/* glow ring (hover target while dragging/selecting, or matched) */}
      {(hovered || matched || (selecting && !matched)) && (
        <motion.span
          className="pointer-events-none absolute inset-[-12%] rounded-full"
          style={{
            background: matched
              ? "radial-gradient(circle, rgba(111,142,108,0.45) 0%, rgba(111,142,108,0) 70%)"
              : "radial-gradient(circle, rgba(74,144,226,0.45) 0%, rgba(74,144,226,0) 70%)",
          }}
          animate={reduce ? { opacity: 0.7 } : { opacity: [0.4, 0.85, 0.4], scale: [0.96, 1.06, 0.96] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        />
      )}

      {/* the matched animal moves into its home */}
      {matched && (
        <motion.span
          className="absolute inset-0 flex items-center justify-center"
          initial={{ scale: 0.2, y: -24, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 18 }}
        >
          <AnimalIcon id={matched} className="h-3/4 w-3/4 drop-shadow-[0_3px_5px_rgba(90,74,66,0.3)]" />
        </motion.span>
      )}

      {/* label chip */}
      <span
        className={`absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[0.6rem] font-bold shadow-sm sm:text-xs ${
          matched ? "bg-[#6F8E6C] text-white" : "bg-white/90 text-[#2F5D9F]"
        }`}
      >
        {def.name}
        {matched ? " ✓" : ""}
      </span>
    </motion.button>
  );
}

export const HabitatZone = memo(HabitatZoneBase);
