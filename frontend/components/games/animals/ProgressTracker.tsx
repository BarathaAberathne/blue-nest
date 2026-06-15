"use client";

/**
 * Progress display: an "X / N matched" chip plus a dot per animal that fills
 * with the animal's colour as it finds its home.
 */
import { motion } from "framer-motion";
import type { AnimalDef, AnimalId } from "./types";

interface ProgressTrackerProps {
  animals: AnimalDef[];
  matched: Set<AnimalId>;
  reduce: boolean;
}

export function ProgressTracker({ animals, matched, reduce }: ProgressTrackerProps) {
  return (
    <div className="flex items-center gap-3 rounded-[24px] bg-white px-4 py-2 shadow-sm">
      <div className="text-center">
        <p className="font-display text-xl leading-none text-[#4A90E2]">
          {matched.size} / {animals.length}
        </p>
        <p className="text-[0.6rem] font-bold uppercase tracking-wide text-[#A99E8C]">matched</p>
      </div>
      <div className="flex items-center gap-1.5">
        {animals.map((a) => {
          const got = matched.has(a.id);
          return (
            <motion.span
              key={a.id}
              aria-hidden="true"
              className="h-3.5 w-3.5 rounded-full border-2 sm:h-4 sm:w-4"
              style={{ borderColor: got ? a.accent : "#D8CBB8", background: got ? a.accent : "transparent" }}
              animate={got && !reduce ? { scale: [1, 1.4, 1] } : { scale: 1 }}
              transition={{ duration: 0.4 }}
            />
          );
        })}
      </div>
    </div>
  );
}
