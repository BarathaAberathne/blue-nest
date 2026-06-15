"use client";

/**
 * Renders the plant at its current growth stage, tweening smoothly between
 * stages. The whole plant scales up from the soil (transform origin at its
 * base) while the flower/fruit "crown" blooms in during the later stages.
 */
import { motion, AnimatePresence } from "framer-motion";
import { PlantStem, PlantCrown, Seed } from "./icons";
import { STAGE_SCALE } from "./data";
import type { GrowthStage, PlantId } from "./types";

interface GrowthAnimationProps {
  plantId: PlantId;
  stage: GrowthStage;
  reduce: boolean;
}

export function GrowthAnimation({ plantId, stage, reduce }: GrowthAnimationProps) {
  const scale = STAGE_SCALE[stage];
  const showCrown = stage === "growing" || stage === "grown";
  const crownScale = stage === "growing" ? 0.7 : 1;
  const spring = reduce
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 90, damping: 16 };

  return (
    <svg viewBox="0 0 100 130" fill="none" className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
      {/* Seed resting in the soil before it sprouts */}
      <AnimatePresence>
        {stage === "seed" && (
          <motion.g
            key="seed"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5 }}
          >
            <g transform="translate(38 104)">
              <Seed width={24} height={24} />
            </g>
          </motion.g>
        )}
      </AnimatePresence>

      {/* The growing plant */}
      <motion.g
        style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
        initial={false}
        animate={{ scale }}
        transition={spring}
      >
        <PlantStem />
        <motion.g
          style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
          initial={false}
          animate={{ opacity: showCrown ? 1 : 0, scale: showCrown ? crownScale : 0.2 }}
          transition={reduce ? { duration: 0 } : { duration: 0.6, ease: "easeOut" }}
        >
          <g transform="translate(50 46)">
            <PlantCrown id={plantId} />
          </g>
        </motion.g>
      </motion.g>
    </svg>
  );
}
