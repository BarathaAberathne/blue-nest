"use client";

/**
 * The illustrated woodland landscape. Each habitat (tree nest, tree hollow,
 * grassy burrow, pond, flower garden, rabbit warren) is drawn here at the same
 * position its interactive HabitatZone overlay sits, so the art and the
 * drop-zones line up. Pure inline SVG; ambient life (clouds, butterflies, pond
 * ripples, drifting leaves) layers on top and pauses under reduced motion.
 */
import { memo } from "react";
import { motion } from "framer-motion";
import type { SeasonTheme } from "./types";

const rnd = (n: number) => Math.round(n * 1000) / 1000;

function Sunflower({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <line x1="0" y1="0" x2="0" y2="46" stroke="#6F8E6C" strokeWidth="5" strokeLinecap="round" />
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2;
        const cx = rnd(Math.cos(a) * 15);
        const cy = rnd(Math.sin(a) * 15);
        return <ellipse key={i} cx={cx} cy={cy} rx="8" ry="4.5" fill="#F4B62E" transform={`rotate(${rnd((a * 180) / Math.PI)} ${cx} ${cy})`} />;
      })}
      <circle cx="0" cy="0" r="9" fill="#7A5230" />
    </g>
  );
}

function WoodlandSceneBase({ theme, reduce }: { theme: SeasonTheme; reduce: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-[24px]" aria-hidden="true">
      <svg viewBox="0 0 1000 560" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
        <defs>
          <linearGradient id="anim-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={theme.sky[0]} />
            <stop offset="100%" stopColor={theme.sky[1]} />
          </linearGradient>
          <radialGradient id="anim-pond" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#BFE0F5" />
            <stop offset="100%" stopColor="#4A90E2" />
          </radialGradient>
        </defs>

        <rect width="1000" height="560" fill="url(#anim-sky)" />
        <circle cx="180" cy="90" r="60" fill="#FBE9C6" opacity="0.4" />

        {/* rolling hills */}
        <path d="M0 250c180-46 360-46 560 0s320 36 440-8v320H0Z" fill={theme.foliageAlt} opacity="0.4" />
        {/* ground */}
        <rect y="300" width="1000" height="260" fill={theme.grass} />
        <path d="M0 340c200-30 360-22 560 14s300 14 440-18v224H0Z" fill={theme.grassAlt} opacity="0.7" />

        {/* winding woodland path */}
        <path d="M470 560c-20-70 60-110 30-180s-30-60 0-120" stroke="#DCCDBA" strokeWidth="60" fill="none" strokeLinecap="round" opacity="0.8" />
        <path d="M470 560c-20-70 60-110 30-180s-30-60 0-120" stroke="#E7DAC6" strokeWidth="40" fill="none" strokeLinecap="round" />

        {/* ── Tree Nest (left) @ ~150,224 ── */}
        <g>
          <rect x="120" y="220" width="22" height="120" rx="8" fill="#8B6B4A" />
          <circle cx="130" cy="150" r="64" fill={theme.foliage} />
          <circle cx="90" cy="180" r="40" fill={theme.foliageAlt} />
          <circle cx="172" cy="178" r="40" fill={theme.foliageAlt} />
          {/* nest */}
          <ellipse cx="150" cy="224" rx="34" ry="16" fill="#A9824E" />
          <ellipse cx="150" cy="220" rx="26" ry="9" fill="#6E4E32" />
          <path d="M118 224c4 12 60 12 64 0" stroke="#8B6B4A" strokeWidth="3" fill="none" />
        </g>

        {/* ── Tree Hollow (centre) @ ~430,168 ── */}
        <g>
          <rect x="412" y="150" width="36" height="170" rx="10" fill="#9A7A57" />
          <circle cx="430" cy="92" r="70" fill={theme.foliage} />
          <circle cx="382" cy="120" r="44" fill={theme.foliageAlt} />
          <circle cx="478" cy="120" r="44" fill={theme.foliageAlt} />
          {/* hollow opening */}
          <ellipse cx="430" cy="190" rx="20" ry="26" fill="#5A3F28" />
          <ellipse cx="430" cy="186" rx="14" ry="19" fill="#3A2818" />
        </g>

        {/* ── Woodland Burrow (right) @ ~800,202 ── */}
        <g>
          <ellipse cx="800" cy="226" rx="100" ry="56" fill={theme.foliage} />
          <ellipse cx="800" cy="216" rx="84" ry="44" fill={theme.foliageAlt} opacity="0.8" />
          <ellipse cx="800" cy="236" rx="34" ry="40" fill="#5A3F28" />
          <ellipse cx="800" cy="240" rx="24" ry="30" fill="#3A2818" />
          <circle cx="745" cy="206" r="7" fill="#C98B98" opacity="0.7" />
          <circle cx="858" cy="210" r="6" fill="#E8A0B8" opacity="0.6" />
        </g>

        {/* ── Pond (bottom-left) @ ~140,414 ── */}
        <g>
          <ellipse cx="140" cy="420" rx="120" ry="58" fill="url(#anim-pond)" opacity="0.92" />
          <ellipse cx="140" cy="410" rx="118" ry="50" fill="#CDE8F8" opacity="0.3" />
          <ellipse cx="92" cy="404" rx="22" ry="11" fill="#6F9E5C" opacity="0.85" />
          <ellipse cx="186" cy="430" rx="20" ry="10" fill="#6F9E5C" opacity="0.85" />
        </g>

        {/* ── Flower Garden (centre) @ ~460,392 ── */}
        <g>
          <Sunflower x={430} y={360} s={1} />
          <Sunflower x={486} y={356} s={1.1} />
          <Sunflower x={462} y={392} s={0.8} />
          {[
            [410, 408, "#E8A0B8"],
            [512, 404, "#B49BD6"],
            [446, 420, "#F4C84B"],
          ].map(([fx, fy, c], i) => (
            <g key={i} transform={`translate(${fx} ${fy})`}>
              <line x1="0" y1="0" x2="0" y2="16" stroke="#6F8E6C" strokeWidth="3" strokeLinecap="round" />
              <circle cx="0" cy="-3" r="6" fill={c as string} />
              <circle cx="0" cy="-3" r="2.5" fill="#FBF2DA" />
            </g>
          ))}
        </g>

        {/* ── Rabbit Warren (bottom-right) @ ~820,414 ── */}
        <g>
          <ellipse cx="820" cy="436" rx="110" ry="48" fill={theme.foliage} />
          <ellipse cx="820" cy="428" rx="92" ry="38" fill={theme.grassAlt} opacity="0.6" />
          <ellipse cx="784" cy="446" rx="22" ry="20" fill="#5A3F28" />
          <ellipse cx="784" cy="448" rx="15" ry="13" fill="#3A2818" />
          <ellipse cx="862" cy="448" rx="18" ry="16" fill="#5A3F28" />
          <ellipse cx="862" cy="450" rx="12" ry="10" fill="#3A2818" />
        </g>

        {/* scattered grass tufts */}
        <g stroke={theme.foliage} strokeWidth="3" strokeLinecap="round" opacity="0.7">
          <path d="M300 470c-2-10-6-16-10-20M306 470c0-12 0-18 2-24M312 470c2-10 6-16 10-22" />
          <path d="M650 500c-2-10-6-16-10-20M656 500c0-12 0-18 2-24M662 500c2-10 6-16 10-22" />
        </g>
      </svg>

      {/* ── Ambient life ─────────────────────────────────────────── */}
      {!reduce && (
        <>
          {[
            { top: "6%", w: 90, dur: 52, delay: 0 },
            { top: "15%", w: 60, dur: 70, delay: 10 },
          ].map((c, i) => (
            <motion.svg
              key={i}
              viewBox="0 0 100 50"
              className="absolute"
              style={{ top: c.top, width: c.w }}
              initial={{ left: "-15%" }}
              animate={{ left: "115%" }}
              transition={{ duration: c.dur, delay: c.delay, repeat: Infinity, ease: "linear" }}
            >
              <g fill="#FFFFFF" opacity="0.85">
                <circle cx="28" cy="30" r="16" />
                <circle cx="50" cy="22" r="20" />
                <circle cx="72" cy="30" r="16" />
                <rect x="22" y="30" width="54" height="16" rx="8" />
              </g>
            </motion.svg>
          ))}

          {/* pond ripples */}
          {[0, 1].map((i) => (
            <motion.span
              key={`r${i}`}
              className="absolute rounded-full border-2 border-white/40"
              style={{ left: "14%", top: "74%", width: 40, height: 16, x: "-50%", y: "-50%" }}
              animate={{ scale: [0.4, 1.6], opacity: [0.5, 0] }}
              transition={{ duration: 3, delay: i * 1.5, repeat: Infinity, ease: "easeOut" }}
            />
          ))}

          {/* butterflies */}
          {[
            { top: "26%", left: "30%", c: "#4A90E2", delay: 0 },
            { top: "30%", left: "58%", c: "#E8A0B8", delay: 2.4 },
          ].map((b, i) => (
            <motion.div
              key={`b${i}`}
              className="absolute"
              style={{ top: b.top, left: b.left }}
              animate={{ x: [0, 36, 10, 44, 0], y: [0, -22, -6, -26, 0] }}
              transition={{ duration: 10 + i * 2, delay: b.delay, repeat: Infinity, ease: "easeInOut" }}
            >
              <svg viewBox="0 0 28 24" className="h-5 w-6">
                <motion.g
                  animate={{ scaleX: [1, 0.6, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut" }}
                  style={{ transformOrigin: "14px 12px" }}
                >
                  <ellipse cx="8" cy="8" rx="7" ry="6" fill={b.c} opacity="0.9" />
                  <ellipse cx="20" cy="8" rx="7" ry="6" fill={b.c} opacity="0.9" />
                  <ellipse cx="9" cy="17" rx="5" ry="5" fill={b.c} opacity="0.7" />
                  <ellipse cx="19" cy="17" rx="5" ry="5" fill={b.c} opacity="0.7" />
                </motion.g>
                <line x1="14" y1="6" x2="14" y2="20" stroke="#5A4A42" strokeWidth="2" />
              </svg>
            </motion.div>
          ))}

          {/* drifting leaf */}
          <motion.svg
            viewBox="0 0 24 24"
            className="absolute h-5 w-5"
            style={{ left: "48%", top: "-5%" }}
            animate={{ y: ["-5%", "560%"], x: [0, 24, -8, 16, 0], rotate: [0, 120, 240, 360] }}
            transition={{ duration: 13, repeat: Infinity, ease: "linear" }}
          >
            <path d="M12 2c4 4 6 8 6 12s-4 8-6 8-6-4-6-8 2-8 6-12Z" fill={theme.foliage} />
          </motion.svg>
        </>
      )}
    </div>
  );
}

export const WoodlandScene = memo(WoodlandSceneBase);
