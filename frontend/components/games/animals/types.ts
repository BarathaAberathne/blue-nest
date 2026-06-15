/**
 * Shared types for "Match the Animals to Their Homes".
 * Framework-agnostic so the data/storage layers stay decoupled from the UI.
 */

export type AnimalId = "robin" | "hedgehog" | "squirrel" | "duck" | "bee" | "rabbit";

export type HabitatId = "treeNest" | "burrow" | "hollow" | "pond" | "garden" | "warren";

export type Mode = "easy" | "full";

export interface AnimalDef {
  id: AnimalId;
  name: string;
  emoji: string;
  /** The habitat this animal belongs in. */
  home: HabitatId;
  /** Short, positive Montessori fact shown after a correct match. */
  fact: string;
  /** Accent colour used on the card + fact icon. */
  accent: string;
}

export interface HabitatDef {
  id: HabitatId;
  name: string;
  emoji: string;
  /** Centre of the drop-zone within the scene, as percentages. */
  pos: { x: number; y: number };
  /** Touch-target diameter in px at the base (desktop) scale. */
  size: number;
}

/** Seasonal theming — architecture for future spring/autumn/winter looks. */
export type Season = "spring" | "summer" | "autumn" | "winter";

export interface SeasonTheme {
  sky: [string, string];
  grass: string;
  grassAlt: string;
  foliage: string;
  foliageAlt: string;
}

/** Persisted achievements + local score (localStorage). */
export interface AnimalsSave {
  /** Games completed (any mode). */
  gamesWon: number;
  /** Total correct matches across all games — feeds parent dashboards. */
  totalMatches: number;
  /** Earned badge ids. */
  badges: string[];
  /** Best completion time per mode, in seconds. */
  bestTimes: Partial<Record<Mode, number>>;
}

/** Payload emitted to parent-dashboard listeners. */
export interface ParentEvent {
  game: "match-the-animals";
  type: "match" | "complete";
  animal?: AnimalId;
  mode: Mode;
  matched: number;
  total: number;
  seconds?: number;
}
