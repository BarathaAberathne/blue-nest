"use client";

/**
 * A single hidden treasure. Rendered as a real <button> so it is keyboard
 * focusable, activatable with Enter/Space, and announced by screen readers.
 * Touch target is never smaller than the spec's `size` (min 44px elsewhere).
 *
 * Resting state shows a soft, slow glow to hint tappability without the harsh
 * flashing of an arcade game. On find: glow → sparkle burst → a gentle
 * "lift & fade" toward the collection tray below.
 */
import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TreasureIcon } from "./icons";
import type { CollectibleDef, ItemId } from "./types";

interface CollectibleItemProps {
  def: CollectibleDef;
  found: boolean;
  reduce: boolean;
  onFind: (id: ItemId) => void;
}

function CollectibleItemBase({ def, found, reduce, onFind }: CollectibleItemProps) {
  return (
    <motion.button
      type="button"
      onClick={() => !found && onFind(def.id)}
      disabled={found}
      aria-label={found ? `${def.label} found` : `Find the ${def.label}. Hint: ${def.hint}`}
      className="absolute flex items-center justify-center rounded-full outline-none focus-visible:ring-4 focus-visible:ring-[#4A90E2]/70 disabled:cursor-default"
      style={{
        left: `${def.pos.x}%`,
        top: `${def.pos.y}%`,
        width: def.size,
        height: def.size,
        marginLeft: -def.size / 2,
        marginTop: -def.size / 2,
        touchAction: "manipulation",
      }}
      initial={false}
      animate={
        found
          ? { scale: [1, 1.25, 0.35], opacity: [1, 1, 0], y: [0, -2, 26] }
          : reduce
            ? { rotate: def.rotate ?? 0 }
            : { y: [0, -4, 0], rotate: def.rotate ?? 0 }
      }
      transition={
        found
          ? { duration: 0.7, times: [0, 0.3, 1], ease: "easeInOut" }
          : { y: { duration: 3, repeat: Infinity, ease: "easeInOut" } }
      }
      whileHover={found ? undefined : { scale: 1.12 }}
      whileTap={found ? undefined : { scale: 0.9 }}
    >
      {/* soft hint glow — slow, calm pulse */}
      {!found && !reduce && (
        <motion.span
          className="pointer-events-none absolute inset-[-18%] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(74,144,226,0.35) 0%, rgba(74,144,226,0) 70%)" }}
          animate={{ opacity: [0.25, 0.6, 0.25], scale: [0.95, 1.08, 0.95] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      <TreasureIcon
        id={def.id}
        className="relative h-full w-full drop-shadow-[0_3px_5px_rgba(90,74,66,0.28)]"
      />

      <AnimatePresence>{found && !reduce && <SparkleBurst />}</AnimatePresence>
    </motion.button>
  );
}

/** A gentle ring of sparkles that fans out once, then fades. */
function SparkleBurst() {
  const colors = ["#F0B040", "#4A90E2", "#A9C5B0", "#E8A0B8"];
  return (
    <span className="pointer-events-none absolute inset-0">
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <motion.span
            key={i}
            className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full"
            style={{ background: colors[i % colors.length] }}
            initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
            animate={{ opacity: [1, 0], x: Math.cos(a) * 36, y: Math.sin(a) * 36, scale: [0.4, 1] }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />
        );
      })}
    </span>
  );
}

export const CollectibleItem = memo(CollectibleItemBase);
