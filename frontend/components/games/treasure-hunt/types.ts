/**
 * Shared types for the Forest School Treasure Hunt game.
 * Kept framework-agnostic so the data layer and components stay decoupled.
 */

export type ItemId =
  | "acorn"
  | "pinecone"
  | "feather"
  | "ladybird"
  | "bird"
  | "leaf";

/** A treasure hidden in the woodland scene. */
export interface CollectibleDef {
  id: ItemId;
  /** Human-readable name used in ARIA labels and the collection bar. */
  label: string;
  /** A short, encouraging hint shown to parents/children if needed. */
  hint: string;
  /** Resting position within the scene, as percentages of width/height. */
  pos: { x: number; y: number };
  /** Touch-target diameter in px at the base (desktop) scale. Min 44 for a11y. */
  size: number;
  /** Optional resting tilt, purely decorative. */
  rotate?: number;
}

/** Seasonal theming — architecture for future spring/autumn/winter variants. */
export type Season = "spring" | "summer" | "autumn" | "winter";

export interface SeasonTheme {
  /** Sky gradient stops, top → bottom. */
  sky: [string, string];
  /** Tree canopy fills (two tones for depth). */
  canopy: string;
  canopyAlt: string;
  /** Grassy ground. */
  ground: string;
  groundAlt: string;
  /** Bush / shrub fill. */
  bush: string;
  /** Accent wild-flower colour. */
  flower: string;
}

/** Snapshot of a finished playthrough — used for score/time tracking. */
export interface GameResult {
  /** Total seconds taken to find everything. */
  seconds: number;
  /** Number of treasures (always all, on completion). */
  found: number;
  total: number;
}
