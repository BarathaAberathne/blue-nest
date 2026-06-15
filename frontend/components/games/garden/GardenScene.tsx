"use client";

/**
 * Decorative garden backdrop: sky, grass, wooden fence, trees, a birdhouse and
 * wild flowers, with subtle ambient life (drifting clouds, butterflies, a
 * visiting bee, a hopping bird). Purely atmospheric and hidden from screen
 * readers. Ambient motion is disabled under prefers-reduced-motion.
 */
import { memo } from "react";
import { motion } from "framer-motion";
import { Cloud, Tree, Birdhouse, Butterfly, Bee, BirdIcon } from "./icons";
import type { SeasonTheme } from "./types";

interface GardenSceneProps {
  theme: SeasonTheme;
  reduce: boolean;
}

function GardenSceneBase({ theme, reduce }: GardenSceneProps) {
  return (
    <div
      className="absolute inset-0 overflow-hidden rounded-[24px]"
      aria-hidden="true"
      style={{ background: `linear-gradient(to bottom, ${theme.sky[0]}, ${theme.sky[1]})` }}
    >
      {/* drifting clouds */}
      {!reduce &&
        [
          { top: "8%", w: 90, dur: 48, delay: 0 },
          { top: "18%", w: 64, dur: 64, delay: 8 },
        ].map((c, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{ top: c.top, width: c.w }}
            initial={{ left: "-15%" }}
            animate={{ left: "115%" }}
            transition={{ duration: c.dur, delay: c.delay, repeat: Infinity, ease: "linear" }}
          >
            <Cloud className="w-full opacity-80" />
          </motion.div>
        ))}

      {/* trees */}
      <Tree foliage={theme.foliage} alt={theme.foliageAlt} className="absolute -left-4 bottom-[26%] h-32 w-28 sm:h-40 sm:w-36" />
      <Tree foliage={theme.foliageAlt} alt={theme.foliage} className="absolute -right-3 bottom-[28%] h-28 w-24 sm:h-36 sm:w-32" />

      {/* birdhouse on a post */}
      <Birdhouse className="absolute right-[14%] bottom-[34%] h-16 w-12 sm:h-20 sm:w-14" />

      {/* grass band */}
      <div className="absolute inset-x-0 bottom-0 h-[34%]" style={{ background: theme.grass }} />
      <div className="absolute inset-x-0 bottom-0 h-[22%]" style={{ background: theme.grassAlt, opacity: 0.6 }} />

      {/* wooden picket fence */}
      <svg viewBox="0 0 400 60" preserveAspectRatio="none" className="absolute inset-x-0 bottom-[30%] h-10 w-full">
        <rect x="0" y="30" width="400" height="8" fill="#D8C3A4" />
        <rect x="0" y="44" width="400" height="8" fill="#D8C3A4" />
        {Array.from({ length: 16 }).map((_, i) => (
          <path key={i} d={`M${i * 26 + 6} 60 V18 l6 -8 6 8 V60 Z`} fill="#E4D3B6" />
        ))}
      </svg>

      {/* little wild flowers along the grass */}
      <svg viewBox="0 0 400 40" preserveAspectRatio="none" className="absolute inset-x-0 bottom-[6%] h-8 w-full">
        {[20, 70, 130, 300, 360].map((x, i) => (
          <g key={i} transform={`translate(${x} 20)`}>
            <line x1="0" y1="0" x2="0" y2="16" stroke="#6F8E6C" strokeWidth="2" />
            <circle cx="0" cy="-3" r="5" fill={i % 2 ? "#F4C84B" : "#E8A0B8"} />
            <circle cx="0" cy="-3" r="2" fill="#FBF2DA" />
          </g>
        ))}
      </svg>

      {/* ambient life */}
      {!reduce && (
        <>
          <motion.div
            className="absolute"
            style={{ top: "30%", left: "22%" }}
            animate={{ x: [0, 40, 12, 46, 0], y: [0, -22, -6, -28, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          >
            <Butterfly color="#E8A0B8" className="h-5 w-6" />
          </motion.div>
          <motion.div
            className="absolute"
            style={{ top: "44%", left: "64%" }}
            animate={{ x: [0, -36, -8, -42, 0], y: [0, -18, -4, -24, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          >
            <Butterfly color="#F4C84B" className="h-4 w-5" />
          </motion.div>
          <motion.div
            className="absolute"
            style={{ bottom: "10%", left: "12%" }}
            animate={{ x: [0, 60, 120, 60, 0], y: [0, -10, 0, -8, 0] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          >
            <Bee className="h-4 w-5" />
          </motion.div>
          <motion.div
            className="absolute"
            style={{ bottom: "32%", right: "26%" }}
            animate={{ y: [0, -8, 0], rotate: [0, -4, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          >
            <BirdIcon className="h-9 w-9" />
          </motion.div>
        </>
      )}
    </div>
  );
}

export const GardenScene = memo(GardenSceneBase);
