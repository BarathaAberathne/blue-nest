/**
 * Shared types for "Grow Your Own Blue Nest Garden".
 * Kept framework-agnostic so the data and storage layers stay decoupled.
 */

export type PlantId = "sunflower" | "strawberry" | "carrot" | "wildflower";

/** The five care steps, in order. Drives the progress indicator. */
export type Step = "choose" | "plant" | "water" | "sunshine" | "grow";

/** Growth stages the plant moves through during the final step. */
export type GrowthStage = "seed" | "sprout" | "small" | "growing" | "grown";

export interface PlantDef {
  id: PlantId;
  name: string;
  emoji: string;
  /** Accent colour used on the selector card + fact icon. */
  accent: string;
  /** "Did you know?" facts, revealed as the plant grows. */
  facts: string[];
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

/** Persisted achievements + resume state (localStorage). */
export interface GardenSave {
  /** Total gardens grown to completion. */
  gardensGrown: number;
  /** Unique plant ids the child has grown. */
  plantsGrown: PlantId[];
  /** Earned badge ids. */
  badges: string[];
  /** In-progress game so a refresh can resume. */
  progress: {
    plant: PlantId | null;
    step: Step;
    stage: GrowthStage | null;
    watered: boolean;
    sunny: boolean;
  } | null;
}
