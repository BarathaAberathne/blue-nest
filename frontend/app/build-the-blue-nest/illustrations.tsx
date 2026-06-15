/**
 * Hand-drawn, brand-coloured SVG illustrations for the "Build the Blue Nest"
 * game. Kept inline (no external image engine) so the whole game ships as a
 * couple of self-contained components. All shapes use the Blue Nest palette:
 *   soft blue · warm cream · sage green · woodland brown · pastel accents.
 */
import type { SVGProps } from "react";

/* ── The friendly blue bird ─────────────────────────────────────────────── */
export function Bird({ happy = false, ...props }: SVGProps<SVGSVGElement> & { happy?: boolean }) {
  return (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      {/* tail */}
      <path d="M38 118c-18-6-30-2-30-2s14 10 28 12 22-4 22-4-2-2-20-6Z" fill="#5aa9d4" />
      {/* body */}
      <ellipse cx="104" cy="112" rx="62" ry="58" fill="#79c9ea" />
      {/* belly */}
      <ellipse cx="112" cy="128" rx="40" ry="40" fill="#fdf8f0" />
      {/* wing */}
      <path d="M80 96c26-10 50-2 58 14 6 12 0 28-16 32-22 6-44-6-50-22-4-12 0-20 8-24Z" fill="#5aa9d4" />
      <path d="M86 104c18-6 34 0 40 12" stroke="#4a92ba" strokeWidth="3" strokeLinecap="round" />
      {/* head */}
      <circle cx="118" cy="70" r="40" fill="#79c9ea" />
      {/* cheek */}
      <circle cx="100" cy="82" r="9" fill="#f6c0cf" opacity="0.85" />
      {/* eye */}
      <circle cx="124" cy="64" r="11" fill="#fdf8f0" />
      <circle cx={happy ? 126 : 127} cy="65" r="6.5" fill="#3a3330" />
      <circle cx="129" cy="62" r="2.2" fill="#fff" />
      {happy && <path d="M116 64c3 3 9 3 12 0" stroke="#3a3330" strokeWidth="2.4" strokeLinecap="round" fill="none" />}
      {/* beak */}
      <path d="M150 70l22 6-20 12-4-10Z" fill="#f4a64b" />
      <path d="M150 76l22 0" stroke="#d98a31" strokeWidth="2" strokeLinecap="round" />
      {/* feet */}
      <path d="M96 168v14M112 168v14" stroke="#f4a64b" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

/* ── Draggable natural items ─────────────────────────────────────────────── */
export function Twigs(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <g stroke="#9c7a4d" strokeWidth="5" strokeLinecap="round">
        <path d="M18 78L78 26" />
        <path d="M52 48L68 30" />
        <path d="M44 56L30 38" />
        <path d="M30 66L20 50" />
      </g>
      <g stroke="#b59262" strokeWidth="4.5" strokeLinecap="round">
        <path d="M24 86L82 42" />
        <path d="M60 58L74 46" />
      </g>
    </svg>
  );
}

export function Leaf(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M50 14C26 28 22 62 40 84c24-8 40-34 36-66-10-2-18-3-26-4Z" fill="#8ecb9b" />
      <path d="M50 18C40 40 40 64 42 82" stroke="#5e9c6b" strokeWidth="3" strokeLinecap="round" />
      <path d="M46 40l-12-4M48 56l-14-2M50 70l-12 2" stroke="#5e9c6b" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function Feather(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M74 18C44 22 26 50 22 78l8 6c30-10 48-36 52-64-2-1-5-2-8-2Z" fill="#9bd4ec" />
      <path d="M70 24C50 30 36 52 30 76" stroke="#5aa9d4" strokeWidth="3" strokeLinecap="round" />
      <g stroke="#5aa9d4" strokeWidth="2.2" strokeLinecap="round">
        <path d="M52 38l16-8M46 52l16-9M40 66l14-9" />
      </g>
      <path d="M30 76l-8 12" stroke="#c9a06a" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

export function Grass(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <g stroke="#7cbf8a" strokeWidth="5" strokeLinecap="round" fill="none">
        <path d="M30 86C28 60 22 44 14 34" />
        <path d="M42 86C42 58 40 40 36 28" />
        <path d="M54 86C56 58 60 40 66 30" />
        <path d="M66 86C70 60 78 46 86 38" />
        <path d="M48 86C48 64 50 50 52 40" />
      </g>
      <path d="M16 86h70" stroke="#5e9c6b" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

export function Flower(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M50 56V90" stroke="#7cbf8a" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M50 74c-8-2-14-8-16-14 8 0 14 4 16 10Z" fill="#7cbf8a" />
      <g fill="#f4aac8">
        <circle cx="50" cy="26" r="11" />
        <circle cx="32" cy="38" r="11" />
        <circle cx="68" cy="38" r="11" />
        <circle cx="39" cy="56" r="11" />
        <circle cx="61" cy="56" r="11" />
      </g>
      <circle cx="50" cy="44" r="10" fill="#f7d774" />
    </svg>
  );
}

/* Map an item id to its illustration, used by both the tray and the nest. */
export const ITEM_ART = {
  twigs: Twigs,
  leaves: Leaf,
  feathers: Feather,
  grass: Grass,
  flowers: Flower,
} as const;
