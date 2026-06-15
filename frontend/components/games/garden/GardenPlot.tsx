"use client";

/**
 * The interactive garden bed. Composes the ambient scene with:
 *  - a sky drop-zone (target for the dragged sun),
 *  - a wooden pot whose soil is the drop-zone for the dragged seed and holds
 *    the growing plant,
 *  - a tappable watering can that tilts and pours during the watering step.
 *
 * Drop-zone refs are owned by the game and attached here for hit-testing.
 */
import { useEffect, useRef, useState, type RefObject } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GardenScene } from "./GardenScene";
import { GrowthAnimation } from "./GrowthAnimation";
import { WateringCan, SunIcon } from "./icons";
import type { GrowthStage, PlantId, SeasonTheme, Step } from "./types";

interface GardenPlotProps {
  plantId: PlantId | null;
  stage: GrowthStage | null;
  step: Step;
  sunny: boolean;
  reduce: boolean;
  theme: SeasonTheme;
  soilRef: RefObject<HTMLDivElement>;
  skyRef: RefObject<HTMLDivElement>;
  highlightSoil: boolean;
  highlightSky: boolean;
  onWater: () => void;
}

export function GardenPlot({
  plantId,
  stage,
  step,
  sunny,
  reduce,
  theme,
  soilRef,
  skyRef,
  highlightSoil,
  highlightSky,
  onWater,
}: GardenPlotProps) {
  const [pouring, setPouring] = useState(false);
  const poured = useRef(false);
  const canActive = step === "water";

  const handleWaterTap = () => {
    if (!canActive || poured.current) return;
    poured.current = true;
    setPouring(true);
    onWater();
    window.setTimeout(() => setPouring(false), 1000);
  };

  // reset the pour guard whenever we leave the watering step
  useEffect(() => {
    if (step !== "water") poured.current = false;
  }, [step]);

  return (
    <div className="absolute inset-0">
      <GardenScene theme={theme} reduce={reduce} />

      {/* ── Sky drop-zone (for the sun) ─────────────────────────── */}
      <div ref={skyRef} className="absolute inset-x-0 top-0 h-[46%]">
        {highlightSky && (
          <motion.div
            className="absolute inset-3 rounded-[24px] border-4 border-dashed border-[#F4B62E]/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.4, 0.9, 0.4] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          />
        )}
        <AnimatePresence>
          {sunny && (
            <motion.div
              key="sun"
              className="absolute right-[14%] top-[12%] h-16 w-16 sm:h-20 sm:w-20"
              initial={{ scale: 0, opacity: 0, y: -10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 16 }}
            >
              <motion.div
                animate={reduce ? undefined : { rotate: 360 }}
                transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
              >
                <SunIcon className="h-full w-full" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* soft sunlight beam over the plant once the sun is up */}
      {sunny && !reduce && (
        <motion.div
          className="pointer-events-none absolute bottom-[10%] left-1/2 h-[60%] w-40 -translate-x-1/2"
          style={{ background: "radial-gradient(ellipse at top, rgba(251,210,78,0.28), rgba(251,210,78,0) 70%)" }}
          animate={{ opacity: [0.5, 0.85, 0.5] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* ── Pot + plant ─────────────────────────────────────────── */}
      <div className="absolute bottom-[6%] left-1/2 w-44 -translate-x-1/2 sm:w-52">
        <div ref={soilRef} className="relative">
          {highlightSoil && (
            <motion.div
              className="absolute -inset-2 -top-24 rounded-[24px] border-4 border-dashed border-[#8B6B4A]/70"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.4, 0.9, 0.4] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            />
          )}

          {/* the plant grows out of the soil */}
          {plantId && stage && (
            <div className="absolute bottom-[38%] left-1/2 h-40 w-40 -translate-x-1/2 sm:h-48 sm:w-48">
              <GrowthAnimation plantId={plantId} stage={stage} reduce={reduce} />
            </div>
          )}

          {/* pot */}
          <svg viewBox="0 0 200 120" className="relative w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="100" cy="36" rx="86" ry="20" fill="#6E4E32" />
            <ellipse cx="100" cy="34" rx="74" ry="15" fill="#5A3F28" />
            <path d="M16 36c6 44 18 70 84 70s78-26 84-70c-10 16-44 26-84 26S26 52 16 36Z" fill="#A9824E" />
            <path d="M14 34c0-9 38-16 86-16s86 7 86 16-38 16-86 16-86-7-86-16Z" fill="#C2935A" />
            <ellipse cx="100" cy="34" rx="72" ry="13" fill="#5A3F28" />
          </svg>

          {/* water droplets while pouring */}
          <AnimatePresence>
            {pouring &&
              Array.from({ length: 5 }).map((_, i) => (
                <motion.span
                  key={i}
                  className="absolute left-1/2 top-0 h-2.5 w-2.5 rounded-full bg-[#6FA3DC]"
                  initial={{ opacity: 0, y: -40, x: (i - 2) * 10 }}
                  animate={{ opacity: [0, 1, 0], y: 10 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.7, delay: i * 0.12, repeat: 1 }}
                />
              ))}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Watering can ────────────────────────────────────────── */}
      <motion.button
        type="button"
        onClick={handleWaterTap}
        disabled={!canActive}
        aria-label={canActive ? "Tap the watering can to water your plant" : "Watering can"}
        className={`absolute bottom-[12%] right-[8%] h-16 w-16 sm:h-20 sm:w-20 ${
          canActive ? "cursor-pointer" : "cursor-default"
        } rounded-2xl focus:outline-none focus-visible:ring-4 focus-visible:ring-[#4A90E2]/60`}
        animate={
          pouring
            ? { rotate: -28, x: -28, y: -8 }
            : canActive && !reduce
              ? { y: [0, -6, 0] }
              : { rotate: 0, x: 0, y: 0 }
        }
        transition={pouring ? { duration: 0.4 } : { duration: 1.6, repeat: canActive && !reduce ? Infinity : 0 }}
        whileHover={canActive ? { scale: 1.08 } : undefined}
        whileTap={canActive ? { scale: 0.92 } : undefined}
      >
        <WateringCan className="h-full w-full drop-shadow-[0_3px_5px_rgba(90,74,66,0.25)]" />
        {canActive && !pouring && (
          <motion.span
            className="absolute -inset-1 rounded-2xl border-2 border-[#4A90E2]/60"
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          />
        )}
      </motion.button>
    </div>
  );
}
