import { Bird, Cloud, Flower2, Heart, Leaf, Sparkles, Stars, Sun } from "lucide-react";
import { clsx } from "clsx";

// ── Custom SVG shapes not available in Lucide ─────────────────────────────────

function RainbowSVG() {
  return (
    <svg viewBox="0 0 100 58" className="h-full w-full" aria-hidden="true" fill="none">
      <path d="M5,54 C5,26 18,6 50,6 C82,6 95,26 95,54"
        stroke="#ef8cab" strokeWidth="7" strokeLinecap="round" />
      <path d="M13,54 C13,31 23,14 50,14 C77,14 87,31 87,54"
        stroke="#f7d774" strokeWidth="7" strokeLinecap="round" />
      <path d="M21,54 C21,36 28,22 50,22 C72,22 79,36 79,54"
        stroke="#7fd8d2" strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}

function StarSVG() {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
      <path
        d="M12 2L14.09 8.26L21 9.27L16 14.14L17.18 21.02L12 17.77L6.82 21.02L8 14.14L3 9.27L9.91 8.26Z"
        fill="currentColor"
      />
    </svg>
  );
}

// ── Doodle map ────────────────────────────────────────────────────────────────

const doodles = {
  heart:   Heart,
  star:    Sparkles,
  stars:   Stars,
  leaf:    Leaf,
  cloud:   Cloud,
  flower:  Flower2,
  bird:    Bird,
  sun:     Sun,
  // custom SVG kinds handled below
  rainbow: null,
  solidstar: null,
} as const;

type DoodleKind = keyof typeof doodles;

type DoodleProps = {
  kind: DoodleKind;
  className?: string;
  color?: string;
};

export default function Doodle({ kind, className, color }: DoodleProps) {
  const baseClass = clsx("pointer-events-none absolute opacity-80", className);

  if (kind === "rainbow") {
    return (
      <span aria-hidden="true" className={baseClass} style={{ color }}>
        <RainbowSVG />
      </span>
    );
  }

  if (kind === "solidstar") {
    return (
      <span aria-hidden="true" className={baseClass} style={{ color }}>
        <StarSVG />
      </span>
    );
  }

  const Icon = doodles[kind];
  if (!Icon) return null;

  return (
    <span aria-hidden="true" className={baseClass} style={{ color }}>
      <Icon className="h-full w-full" strokeWidth={1.7} />
    </span>
  );
}
