/**
 * Inline SVG illustrations for the garden game — pure, scalable React
 * components (no images, no canvas). Brand palette:
 * Blue #4A90E2 · Deep #2F5D9F · Sage #A9C5B0 · Green #6F8E6C · Sand #DCCDBA
 * · Brown #8B6B4A · Soil #6E4E32.
 */
import type { SVGProps } from "react";
import type { PlantId } from "./types";

type S = SVGProps<SVGSVGElement>;
type G = SVGProps<SVGGElement>;

/**
 * Round trig results to a fixed precision. Node and the browser can stringify
 * the same float's final digit differently, which would otherwise cause React
 * hydration mismatches on these computed SVG coordinates.
 */
const rnd = (n: number) => Math.round(n * 1000) / 1000;

/* ── Plant crowns ──────────────────────────────────────────────────────────
   Drawn so the attachment point (where the stem meets the crown) is the local
   origin (0,0). Crowns extend upward (negative y). Carrot also extends down
   (its edible root). Reused by both the selector and the growth animation. */
export function PlantCrown({ id, ...props }: G & { id: PlantId }) {
  switch (id) {
    case "sunflower":
      return (
        <g {...props}>
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i / 12) * Math.PI * 2;
            const cx = rnd(Math.cos(a) * 22);
            const cy = rnd(-28 + Math.sin(a) * 22);
            return (
              <ellipse
                key={i}
                cx={cx}
                cy={cy}
                rx="11"
                ry="6"
                fill="#F4B62E"
                transform={`rotate(${rnd((a * 180) / Math.PI)} ${cx} ${cy})`}
              />
            );
          })}
          <circle cx="0" cy="-28" r="14" fill="#7A5230" />
          <circle cx="0" cy="-28" r="10" fill="#5E3F24" />
        </g>
      );
    case "strawberry":
      return (
        <g {...props}>
          <g fill="#6F8E6C">
            <ellipse cx="-12" cy="-30" rx="13" ry="8" transform="rotate(-25 -12 -30)" />
            <ellipse cx="12" cy="-30" rx="13" ry="8" transform="rotate(25 12 -30)" />
            <ellipse cx="0" cy="-40" rx="12" ry="8" />
          </g>
          {/* berries */}
          <g>
            <path d="M-14 -16c0 7-5 12-9 12s-9-5-9-12 5-9 9-9 9 2 9 9Z" fill="#D9544D" />
            <path d="M16 -12c0 7-5 12-9 12s-9-5-9-12 5-9 9-9 9 2 9 9Z" fill="#D9544D" />
          </g>
          <g fill="#FBE3DE">
            <circle cx="-21" cy="-12" r="1.1" /><circle cx="-16" cy="-8" r="1.1" /><circle cx="-25" cy="-7" r="1.1" />
            <circle cx="9" cy="-8" r="1.1" /><circle cx="14" cy="-4" r="1.1" /><circle cx="5" cy="-3" r="1.1" />
          </g>
          {/* little white flower */}
          <g transform="translate(2 -32)">
            {Array.from({ length: 5 }).map((_, i) => {
              const a = (i / 5) * Math.PI * 2;
              return <circle key={i} cx={rnd(Math.cos(a) * 5)} cy={rnd(Math.sin(a) * 5)} r="3.2" fill="#FFFDF8" />;
            })}
            <circle cx="0" cy="0" r="2.6" fill="#F4C84B" />
          </g>
        </g>
      );
    case "carrot":
      return (
        <g {...props}>
          {/* frilly green top */}
          <g stroke="#6F8E6C" strokeWidth="3" strokeLinecap="round" fill="none">
            <path d="M0 0C-6 -16 -12 -24 -16 -34" />
            <path d="M0 0C0 -18 0 -30 0 -40" />
            <path d="M0 0C6 -16 12 -24 16 -34" />
            <path d="M0 0C-3 -14 -6 -24 -8 -36" />
            <path d="M0 0C3 -14 6 -24 8 -36" />
          </g>
          {/* edible root (below soil line) */}
          <path d="M-8 2C-8 16 -3 34 0 40 3 34 8 16 8 2 4 0 -4 0 -8 2Z" fill="#E0813C" />
          <g stroke="#C56A2A" strokeWidth="1.4">
            <path d="M-5 10h10M-4 18h8M-3 26h6" />
          </g>
        </g>
      );
    case "wildflower":
    default:
      return (
        <g {...props}>
          {[
            { x: -14, y: -26, c: "#E8A0B8" },
            { x: 14, y: -24, c: "#F4C84B" },
            { x: 0, y: -38, c: "#B49BD6" },
          ].map((f, i) => (
            <g key={i} transform={`translate(${f.x} ${f.y})`}>
              {Array.from({ length: 5 }).map((_, j) => {
                const a = (j / 5) * Math.PI * 2;
                const cx = rnd(Math.cos(a) * 6);
                const cy = rnd(Math.sin(a) * 6);
                return <ellipse key={j} cx={cx} cy={cy} rx="4.5" ry="3" fill={f.c} transform={`rotate(${rnd((a * 180) / Math.PI)} ${cx} ${cy})`} />;
              })}
              <circle cx="0" cy="0" r="3.4" fill="#FBF2DA" />
            </g>
          ))}
        </g>
      );
  }
}

/** Stem + two leaves, base at local (50,118), top near y=44. */
export function PlantStem(props: G) {
  return (
    <g {...props}>
      <path d="M50 118C49 92 50 70 50 46" stroke="#6F8E6C" strokeWidth="7" strokeLinecap="round" fill="none" />
      <path d="M50 88c-14-6-24-2-30 6 10 8 22 6 30-6Z" fill="#7FA37C" />
      <path d="M50 70c14-6 24-2 30 6-10 8-22 6-30-6Z" fill="#6F8E6C" />
    </g>
  );
}

/** A full, blooming plant for the selector + preview (viewBox 0 0 100 120). */
export function PlantFull({ id, ...props }: S & { id: PlantId }) {
  return (
    <svg viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <PlantStem />
      <g transform="translate(50 46)">
        <PlantCrown id={id} />
      </g>
    </svg>
  );
}

/* ── Care tools ──────────────────────────────────────────────────────────── */
export function Seed(props: S) {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M20 6c8 4 11 12 9 20-2 7-7 9-9 9s-7-2-9-9c-2-8 1-16 9-20Z" fill="#8B6B4A" />
      <path d="M20 10c4 4 6 10 4 18" stroke="#6E4E32" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

export function WateringCan(props: S) {
  return (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M22 34h34l-4 30a6 6 0 0 1-6 5H32a6 6 0 0 1-6-5Z" fill="#4A90E2" />
      <rect x="18" y="28" width="42" height="9" rx="4.5" fill="#2F5D9F" />
      <path d="M56 40l18-10-2 8-14 8Z" fill="#2F5D9F" />
      <path d="M22 36c-10 0-14 6-14 12" stroke="#2F5D9F" strokeWidth="6" fill="none" strokeLinecap="round" />
      <ellipse cx="74" cy="30" rx="5" ry="3" fill="#6FA3DC" />
    </svg>
  );
}

export function SunIcon(props: S) {
  return (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <g stroke="#F4B62E" strokeWidth="4" strokeLinecap="round">
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return <line key={i} x1={rnd(40 + Math.cos(a) * 26)} y1={rnd(40 + Math.sin(a) * 26)} x2={rnd(40 + Math.cos(a) * 36)} y2={rnd(40 + Math.sin(a) * 36)} />;
        })}
      </g>
      <circle cx="40" cy="40" r="20" fill="#FBD24E" />
      <circle cx="40" cy="40" r="13" fill="#F4B62E" opacity="0.55" />
    </svg>
  );
}

export function BirdIcon(props: S) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M14 40c-6-2-10 0-10 0s4 4 9 5 7-2 7-2-2-2-6-3Z" fill="#2F5D9F" />
      <ellipse cx="34" cy="38" rx="20" ry="18" fill="#4A90E2" />
      <ellipse cx="38" cy="44" rx="13" ry="12" fill="#FBF7F0" />
      <path d="M26 32c8-3 16 0 19 6 2 5-1 11-7 12-8 2-15-3-17-9-1-4 1-7 5-9Z" fill="#2F5D9F" />
      <circle cx="42" cy="24" r="13" fill="#4A90E2" />
      <circle cx="36" cy="29" r="3" fill="#F2B8C6" opacity="0.85" />
      <circle cx="46" cy="22" r="4" fill="#FBF7F0" />
      <circle cx="47" cy="22" r="2.2" fill="#2A2320" />
      <path d="M54 24l8 2-7 4-1-6Z" fill="#F0A93D" />
    </svg>
  );
}

export function Butterfly({ color = "#E8A0B8", ...props }: S & { color?: string }) {
  return (
    <svg viewBox="0 0 28 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <ellipse cx="8" cy="8" rx="7" ry="6" fill={color} opacity="0.9" />
      <ellipse cx="20" cy="8" rx="7" ry="6" fill={color} opacity="0.9" />
      <ellipse cx="9" cy="17" rx="5" ry="5" fill={color} opacity="0.7" />
      <ellipse cx="19" cy="17" rx="5" ry="5" fill={color} opacity="0.7" />
      <line x1="14" y1="6" x2="14" y2="20" stroke="#5A4A42" strokeWidth="2" />
    </svg>
  );
}

export function Bee(props: S) {
  return (
    <svg viewBox="0 0 28 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <ellipse cx="13" cy="11" rx="9" ry="7" fill="#F4C84B" />
      <path d="M10 5v12M15 5v12" stroke="#3A2E20" strokeWidth="2.4" />
      <ellipse cx="9" cy="6" rx="6" ry="4" fill="#fff" opacity="0.8" />
      <ellipse cx="17" cy="6" rx="6" ry="4" fill="#fff" opacity="0.8" />
      <circle cx="22" cy="11" r="2" fill="#3A2E20" />
    </svg>
  );
}

export function Cloud(props: S) {
  return (
    <svg viewBox="0 0 100 50" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <g fill="#FFFFFF">
        <circle cx="28" cy="30" r="18" />
        <circle cx="50" cy="22" r="22" />
        <circle cx="72" cy="30" r="18" />
        <rect x="20" y="30" width="60" height="18" rx="9" />
      </g>
    </svg>
  );
}

export function Tree({ foliage = "#6F8E6C", alt = "#A9C5B0", ...props }: S & { foliage?: string; alt?: string }) {
  return (
    <svg viewBox="0 0 120 140" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x="52" y="78" width="16" height="58" rx="6" fill="#8B6B4A" />
      <circle cx="60" cy="52" r="40" fill={foliage} />
      <circle cx="30" cy="66" r="28" fill={alt} />
      <circle cx="90" cy="66" r="28" fill={alt} />
      <circle cx="60" cy="34" r="26" fill={alt} />
    </svg>
  );
}

export function Birdhouse(props: S) {
  return (
    <svg viewBox="0 0 60 80" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x="28" y="42" width="4" height="36" fill="#8B6B4A" />
      <rect x="14" y="26" width="32" height="28" rx="5" fill="#C2A079" />
      <path d="M30 8l20 20H10Z" fill="#8B6B4A" />
      <circle cx="30" cy="40" r="6" fill="#5E3F24" />
      <rect x="28" y="48" width="4" height="8" rx="2" fill="#8B6B4A" />
    </svg>
  );
}

/** "Garden Explorer" rosette badge. */
export function BadgeIcon(props: S) {
  return (
    <svg viewBox="0 0 80 96" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M30 50l-8 36 18-10 18 10-8-36Z" fill="#4A90E2" />
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return <circle key={i} cx={rnd(40 + Math.cos(a) * 30)} cy={rnd(36 + Math.sin(a) * 30)} r="7" fill="#6FA3DC" />;
      })}
      <circle cx="40" cy="36" r="28" fill="#4A90E2" />
      <circle cx="40" cy="36" r="22" fill="#FAF8F4" />
      <path d="M40 24c8 4 11 10 9 18-2-1-4-2-9-2s-7 1-9 2c-2-8 1-14 9-18Z" fill="#6F8E6C" />
      <path d="M40 28v14" stroke="#52704F" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
