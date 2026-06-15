/**
 * Game data: the six treasures (with their hiding spots) and the seasonal
 * theme palette. Positions are tuned so each item nestles naturally against a
 * scene feature (a log, a bush, the bridge) while staying findable for ages 2–6.
 */
import type { CollectibleDef, Season, SeasonTheme } from "./types";

export const COLLECTIBLES: CollectibleDef[] = [
  { id: "bird",     label: "Blue Nest Bird", hint: "Look up in the trees.",      pos: { x: 26, y: 26 }, size: 64, rotate: -6 },
  { id: "leaf",     label: "Oak Leaf",       hint: "Resting on a bush.",         pos: { x: 87, y: 33 }, size: 56, rotate: 18 },
  { id: "ladybird", label: "Ladybird",       hint: "On a bright wild flower.",   pos: { x: 60, y: 52 }, size: 48, rotate: 0 },
  { id: "acorn",    label: "Acorn",          hint: "By the fallen log.",         pos: { x: 16, y: 73 }, size: 52, rotate: 8 },
  { id: "feather",  label: "Feather",        hint: "Near the woodland path.",    pos: { x: 47, y: 82 }, size: 56, rotate: -22 },
  { id: "pinecone", label: "Pinecone",       hint: "Under the tall pine.",       pos: { x: 80, y: 70 }, size: 52, rotate: 6 },
];

export const TOTAL_TREASURES = COLLECTIBLES.length;

/**
 * Seasonal palettes. The scene reads colours from the active theme, so adding a
 * full autumn/winter mode later is a data change, not a rewrite.
 */
export const SEASON_THEMES: Record<Season, SeasonTheme> = {
  spring: {
    sky: ["#FAF8F4", "#EAF3EC"],
    canopy: "#6F8E6C",
    canopyAlt: "#A9C5B0",
    ground: "#A9C5B0",
    groundAlt: "#93B89C",
    bush: "#6F8E6C",
    flower: "#E8A0B8",
  },
  summer: {
    sky: ["#FAF8F4", "#E6F0EA"],
    canopy: "#5F8160",
    canopyAlt: "#8FB597",
    ground: "#9CC0A4",
    groundAlt: "#82AC8C",
    bush: "#6F8E6C",
    flower: "#F0B040",
  },
  autumn: {
    sky: ["#FAF8F4", "#F3E7D6"],
    canopy: "#B07A3C",
    canopyAlt: "#D9A85C",
    ground: "#CDB59A",
    groundAlt: "#BBA081",
    bush: "#A98B57",
    flower: "#D9743B",
  },
  winter: {
    sky: ["#FAF8F4", "#E8EEF3"],
    canopy: "#7E948A",
    canopyAlt: "#B6C7C0",
    ground: "#E4E9EC",
    groundAlt: "#D2DBDF",
    bush: "#9DB0A8",
    flower: "#9FB8D4",
  },
};

/** Pick a sensible default season from the current month (Northern Hemisphere). */
export function seasonForDate(d = new Date()): Season {
  const m = d.getMonth(); // 0 = Jan
  if (m <= 1 || m === 11) return "winter";
  if (m <= 4) return "spring";
  if (m <= 7) return "summer";
  return "autumn";
}
