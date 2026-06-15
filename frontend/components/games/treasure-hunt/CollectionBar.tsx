"use client";

/**
 * Sticky collection tray. Each treasure starts greyed-out and springs into
 * full colour the moment it's discovered. Presentational only — it reflects the
 * found set passed down from the game.
 */
import { motion } from "framer-motion";
import { TreasureIcon } from "./icons";
import type { CollectibleDef, ItemId } from "./types";

interface CollectionBarProps {
  collectibles: CollectibleDef[];
  found: Set<ItemId>;
  reduce: boolean;
}

export function CollectionBar({ collectibles, found, reduce }: CollectionBarProps) {
  return (
    <div className="mt-4 rounded-[24px] border border-[#ECE3D6] bg-white/85 px-3 py-3 shadow-[0_8px_24px_-12px_rgba(90,74,66,0.35)] backdrop-blur-sm sm:px-5 sm:py-4">
      <ul role="list" className="grid grid-cols-6 gap-1.5 sm:gap-3">
        {collectibles.map((c) => {
          const got = found.has(c.id);
          return (
            <li key={c.id} className="flex flex-col items-center gap-1">
              <motion.div
                aria-label={`${c.label}: ${got ? "found" : "not yet found"}`}
                className={`flex aspect-square w-full max-w-[64px] items-center justify-center rounded-[18px] border p-1.5 sm:p-2.5 ${
                  got ? "border-[#A9C5B0] bg-[#EEF4EF]" : "border-[#E7DECF] bg-[#F4EFE7]"
                }`}
                animate={got && !reduce ? { scale: [1, 1.18, 1] } : { scale: 1 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
              >
                <TreasureIcon
                  id={c.id}
                  className="h-full w-full transition-all duration-500"
                  style={{
                    filter: got ? "none" : "grayscale(1)",
                    opacity: got ? 1 : 0.3,
                  }}
                />
              </motion.div>
              <span
                className={`text-center text-[0.6rem] font-semibold leading-tight sm:text-xs ${
                  got ? "text-[#2F5D9F]" : "text-[#A99E8C]"
                }`}
              >
                {c.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
