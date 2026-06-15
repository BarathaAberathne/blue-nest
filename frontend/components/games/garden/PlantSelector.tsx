"use client";

/**
 * Step 1 — choose a plant. Large, illustrated cards with clear selected state.
 * Each card is a real button (keyboard + screen-reader friendly).
 */
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { PlantFull } from "./icons";
import { PLANTS } from "./data";
import type { PlantId } from "./types";

interface PlantSelectorProps {
  selected: PlantId | null;
  reduce: boolean;
  onSelect: (id: PlantId) => void;
}

export function PlantSelector({ selected, reduce, onSelect }: PlantSelectorProps) {
  return (
    <ul role="list" className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
      {PLANTS.map((p) => {
        const active = selected === p.id;
        return (
          <li key={p.id}>
            <motion.button
              type="button"
              onClick={() => onSelect(p.id)}
              aria-pressed={active}
              aria-label={`Choose ${p.name}`}
              whileHover={reduce ? undefined : { y: -4 }}
              whileTap={{ scale: 0.96 }}
              className={`relative flex w-full flex-col items-center gap-2 rounded-[24px] border-2 bg-white p-3 shadow-sm transition-colors sm:p-4 ${
                active ? "border-[#6F8E6C] ring-2 ring-[#A9C5B0]" : "border-[#ECE3D6] hover:border-[#A9C5B0]"
              } focus:outline-none focus-visible:ring-4 focus-visible:ring-[#A9C5B0]`}
            >
              {active && (
                <span className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#6F8E6C] text-white">
                  <Check className="h-4 w-4" />
                </span>
              )}
              <span className="flex h-20 w-20 items-end justify-center sm:h-24 sm:w-24">
                <PlantFull id={p.id} className="h-full w-full" />
              </span>
              <span className="font-display text-base text-[#2F5D9F] sm:text-lg">{p.name}</span>
            </motion.button>
          </li>
        );
      })}
    </ul>
  );
}
