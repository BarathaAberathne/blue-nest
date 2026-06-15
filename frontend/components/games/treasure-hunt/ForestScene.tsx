"use client";

/**
 * The illustrated woodland backdrop: trees, a pine, bushes, logs, wild flowers,
 * a pond, a woodland path, a wooden bridge and a Forest School play area
 * (teepee + log seating + bunting). Built entirely from inline SVG — no images,
 * no canvas — so it scales crisply and lazy-loads as part of the JS bundle.
 *
 * Ambient life (floating leaves, butterflies, a gently wandering bird) is
 * layered on top with Framer Motion and disabled when the user prefers reduced
 * motion.
 */
import { memo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { SeasonTheme } from "./types";

interface ForestSceneProps {
  theme: SeasonTheme;
}

function ForestSceneBase({ theme }: ForestSceneProps) {
  const reduce = useReducedMotion();

  return (
    <div className="absolute inset-0 overflow-hidden rounded-[24px]" aria-hidden="true">
      {/* ── Static scene ─────────────────────────────────────────── */}
      <svg viewBox="0 0 1000 620" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
        <defs>
          <linearGradient id="th-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={theme.sky[0]} />
            <stop offset="100%" stopColor={theme.sky[1]} />
          </linearGradient>
          <linearGradient id="th-pond" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9FC3E8" />
            <stop offset="100%" stopColor="#4A90E2" />
          </linearGradient>
        </defs>

        {/* sky + soft sun glow */}
        <rect width="1000" height="620" fill="url(#th-sky)" />
        <circle cx="170" cy="120" r="70" fill="#FBE9C6" opacity="0.5" />
        <circle cx="170" cy="120" r="44" fill="#FCEFD4" opacity="0.7" />

        {/* rolling hills */}
        <path d="M0 360c160-50 320-50 520 0s320 40 480-10v280H0Z" fill={theme.canopyAlt} opacity="0.45" />
        <path d="M0 410c200-40 360-30 560 10s300 20 440-20v210H0Z" fill={theme.groundAlt} opacity="0.7" />

        {/* ground */}
        <rect y="430" width="1000" height="190" fill={theme.ground} />

        {/* pond with wooden bridge */}
        <ellipse cx="500" cy="540" rx="190" ry="48" fill="url(#th-pond)" opacity="0.9" />
        <ellipse cx="500" cy="534" rx="190" ry="44" fill="#BFE0F5" opacity="0.35" />
        <g>
          {/* bridge deck */}
          <path d="M360 520q140 -40 280 0l0 16q-140 -40 -280 0Z" fill="#A9824E" />
          {[...Array(7)].map((_, i) => (
            <line key={i} x1={372 + i * 38} y1="514" x2={372 + i * 38} y2="532" stroke="#8B6B4A" strokeWidth="3" />
          ))}
          {/* rails */}
          <path d="M360 506q140 -40 280 0" stroke="#8B6B4A" strokeWidth="6" fill="none" strokeLinecap="round" />
          <line x1="372" y1="500" x2="372" y2="514" stroke="#8B6B4A" strokeWidth="5" />
          <line x1="628" y1="500" x2="628" y2="514" stroke="#8B6B4A" strokeWidth="5" />
        </g>

        {/* winding woodland path */}
        <path d="M470 620c-10-60 40-90 30-150s-40-60-20-110" stroke={theme.groundAlt} strokeWidth="56" fill="none" strokeLinecap="round" opacity="0.55" />
        <path d="M470 620c-10-60 40-90 30-150s-40-60-20-110" stroke={theme.ground} strokeWidth="40" fill="none" strokeLinecap="round" opacity="0.7" />

        {/* tall pine (right) */}
        <g>
          <rect x="800" y="420" width="22" height="70" rx="6" fill="#8B6B4A" />
          <path d="M811 250l60 90H751Z" fill={theme.canopy} />
          <path d="M811 300l66 100H745Z" fill={theme.canopyAlt} />
          <path d="M811 350l72 110H739Z" fill={theme.canopy} />
        </g>

        {/* round leafy trees (left + centre) */}
        <Tree x={150} y={470} canopy={theme.canopy} alt={theme.canopyAlt} scale={1.15} />
        <Tree x={620} y={460} canopy={theme.canopyAlt} alt={theme.canopy} scale={0.9} />

        {/* fallen log (left foreground) */}
        <g>
          <rect x="60" y="540" width="170" height="34" rx="17" fill="#9A7A57" />
          <ellipse cx="60" cy="557" rx="14" ry="17" fill="#B89A78" />
          <circle cx="60" cy="557" r="7" fill="#8B6B4A" />
        </g>

        {/* bushes */}
        <Bush x={870} y={470} fill={theme.bush} />
        <Bush x={300} y={560} fill={theme.bush} scale={0.8} />

        {/* Forest School play area — teepee, log seats, bunting */}
        <g transform="translate(150 360)">
          {/* bunting */}
          <path d="M-30 6q60 26 130 0" stroke="#C9B79C" strokeWidth="2" fill="none" />
          {[0, 1, 2, 3].map((i) => (
            <path key={i} d={`M${-18 + i * 38} 8l10 0l-5 9Z`} fill={i % 2 ? "#4A90E2" : "#E8A0B8"} />
          ))}
          {/* teepee */}
          <path d="M50 110L18 30L82 110Z" fill="#DCCDBA" />
          <path d="M50 110L18 30L34 110Z" fill="#CDBBA2" />
          <line x1="18" y1="30" x2="18" y2="18" stroke="#8B6B4A" strokeWidth="3" />
          <line x1="34" y1="22" x2="46" y2="14" stroke="#8B6B4A" strokeWidth="2" />
          {/* log seats */}
          <ellipse cx="120" cy="118" rx="20" ry="8" fill="#A9824E" />
          <ellipse cx="120" cy="113" rx="20" ry="8" fill="#C2A079" />
        </g>

        {/* wild flowers dotted along the ground */}
        {[
          [220, 600],
          [410, 590],
          [560, 595],
          [690, 600],
          [930, 560],
        ].map(([fx, fy], i) => (
          <Flower key={i} x={fx} y={fy} fill={theme.flower} />
        ))}
      </svg>

      {/* ── Ambient life (motion) ────────────────────────────────── */}
      {!reduce && (
        <>
          {/* floating leaves */}
          {[
            { left: "20%", delay: 0, dur: 11, color: theme.canopy },
            { left: "55%", delay: 3, dur: 14, color: theme.canopyAlt },
            { left: "82%", delay: 6, dur: 12, color: theme.canopy },
          ].map((l, i) => (
            <motion.svg
              key={i}
              viewBox="0 0 24 24"
              className="absolute h-5 w-5"
              style={{ left: l.left, top: "-6%" }}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: ["-6%", "108%"], x: [0, 26, -10, 18, 0], rotate: [0, 90, 180, 300, 360], opacity: [0, 0.85, 0.85, 0] }}
              transition={{ duration: l.dur, delay: l.delay, repeat: Infinity, ease: "linear" }}
            >
              <path d="M12 2c4 4 6 8 6 12s-4 8-6 8-6-4-6-8 2-8 6-12Z" fill={l.color} />
            </motion.svg>
          ))}

          {/* butterflies */}
          {[
            { top: "44%", left: "40%", delay: 0, color: "#E8A0B8" },
            { top: "58%", left: "70%", delay: 2.5, color: "#F0B040" },
          ].map((b, i) => (
            <motion.div
              key={i}
              className="absolute"
              style={{ top: b.top, left: b.left }}
              animate={{ x: [0, 40, 10, 50, 0], y: [0, -24, -8, -30, 0] }}
              transition={{ duration: 9 + i * 2, delay: b.delay, repeat: Infinity, ease: "easeInOut" }}
            >
              <Butterfly color={b.color} />
            </motion.div>
          ))}

          {/* a small bird that wanders across the canopy */}
          <motion.svg
            viewBox="0 0 24 16"
            className="absolute h-4 w-6"
            style={{ top: "16%" }}
            initial={{ left: "-8%" }}
            animate={{ left: ["-8%", "108%"], top: ["16%", "12%", "20%", "14%", "16%"] }}
            transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
          >
            <motion.path
              d="M2 8c3-4 5-4 8 0 3-4 5-4 8 0"
              stroke="#2F5D9F"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              animate={{ d: ["M2 8c3-4 5-4 8 0 3-4 5-4 8 0", "M2 6c3 4 5 4 8 0 3 4 5 4 8 0"] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
            />
          </motion.svg>
        </>
      )}
    </div>
  );
}

/* ── Small scene primitives ─────────────────────────────────────── */
function Tree({ x, y, canopy, alt, scale = 1 }: { x: number; y: number; canopy: string; alt: string; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <rect x="-12" y="0" width="24" height="80" rx="8" fill="#8B6B4A" />
      <circle cx="0" cy="-30" r="58" fill={canopy} />
      <circle cx="-40" cy="-6" r="40" fill={alt} />
      <circle cx="40" cy="-6" r="40" fill={alt} />
      <circle cx="0" cy="-56" r="40" fill={alt} />
    </g>
  );
}

function Bush({ x, y, fill, scale = 1 }: { x: number; y: number; fill: string; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <circle cx="-26" cy="10" r="26" fill={fill} />
      <circle cx="0" cy="0" r="32" fill={fill} />
      <circle cx="28" cy="12" r="24" fill={fill} />
    </g>
  );
}

function Flower({ x, y, fill }: { x: number; y: number; fill: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <line x1="0" y1="0" x2="0" y2="14" stroke="#6F8E6C" strokeWidth="3" strokeLinecap="round" />
      <g fill={fill}>
        <circle cx="0" cy="-6" r="4" />
        <circle cx="-5" cy="-1" r="4" />
        <circle cx="5" cy="-1" r="4" />
        <circle cx="-3" cy="4" r="4" />
        <circle cx="3" cy="4" r="4" />
      </g>
      <circle cx="0" cy="-1" r="3" fill="#FBF2DA" />
    </g>
  );
}

function Butterfly({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 28 24" className="h-5 w-6">
      <motion.g
        animate={{ scaleX: [1, 0.55, 1] }}
        transition={{ duration: 0.45, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: "14px 12px" }}
      >
        <ellipse cx="8" cy="8" rx="7" ry="6" fill={color} opacity="0.9" />
        <ellipse cx="20" cy="8" rx="7" ry="6" fill={color} opacity="0.9" />
        <ellipse cx="9" cy="17" rx="5" ry="5" fill={color} opacity="0.7" />
        <ellipse cx="19" cy="17" rx="5" ry="5" fill={color} opacity="0.7" />
      </motion.g>
      <line x1="14" y1="6" x2="14" y2="20" stroke="#5A4A42" strokeWidth="2" />
    </svg>
  );
}

export const ForestScene = memo(ForestSceneBase);
