/**
 * Game data: the four plants (with child-friendly facts), the ordered care
 * steps, growth-stage order, and seasonal palettes.
 */
import type { GrowthStage, PlantDef, Season, SeasonTheme, Step } from "./types";

export const PLANTS: PlantDef[] = [
  {
    id: "sunflower",
    name: "Sunflower",
    emoji: "🌻",
    accent: "#F0B040",
    facts: ["Sunflowers turn towards the sun.", "Sunflowers can grow taller than you!"],
  },
  {
    id: "strawberry",
    name: "Strawberry",
    emoji: "🍓",
    accent: "#D9544D",
    facts: ["Strawberries start as small white flowers.", "Strawberries grow from flowers."],
  },
  {
    id: "carrot",
    name: "Carrot",
    emoji: "🥕",
    accent: "#E0813C",
    facts: ["Carrots grow underground!", "We eat the root of the carrot plant."],
  },
  {
    id: "wildflower",
    name: "Wildflower",
    emoji: "🌼",
    accent: "#E8A0B8",
    facts: ["Wildflowers help bees and butterflies.", "Wildflowers grow in many colours."],
  },
];

export function plantById(id: string | null): PlantDef | null {
  return PLANTS.find((p) => p.id === id) ?? null;
}

/** Care steps in order — also the labels for the progress indicator. */
export const STEPS: { id: Step; label: string }[] = [
  { id: "choose", label: "Choose" },
  { id: "plant", label: "Plant" },
  { id: "water", label: "Water" },
  { id: "sunshine", label: "Sunshine" },
  { id: "grow", label: "Grow" },
];

export const STAGE_ORDER: GrowthStage[] = ["seed", "sprout", "small", "growing", "grown"];

/** Relative scale of the plant body at each growth stage (0 = nothing yet). */
export const STAGE_SCALE: Record<GrowthStage, number> = {
  seed: 0,
  sprout: 0.34,
  small: 0.6,
  growing: 0.82,
  grown: 1,
};

export const SEASON_THEMES: Record<Season, SeasonTheme> = {
  spring: { sky: ["#FAF8F4", "#EAF3EC"], grass: "#A9C5B0", grassAlt: "#93B89C", foliage: "#6F8E6C", foliageAlt: "#A9C5B0" },
  summer: { sky: ["#FAF8F4", "#E6F0EA"], grass: "#9CC0A4", grassAlt: "#82AC8C", foliage: "#5F8160", foliageAlt: "#8FB597" },
  autumn: { sky: ["#FAF8F4", "#F3E7D6"], grass: "#CDB59A", grassAlt: "#BBA081", foliage: "#B07A3C", foliageAlt: "#D9A85C" },
  winter: { sky: ["#FAF8F4", "#E8EEF3"], grass: "#E4E9EC", grassAlt: "#D2DBDF", foliage: "#7E948A", foliageAlt: "#B6C7C0" },
};

export function seasonForDate(d = new Date()): Season {
  const m = d.getMonth();
  if (m <= 1 || m === 11) return "winter";
  if (m <= 4) return "spring";
  if (m <= 7) return "summer";
  return "autumn";
}
