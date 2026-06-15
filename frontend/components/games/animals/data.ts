/**
 * Game data: the six animals (with their correct homes + facts), the six
 * habitats (with positions in the scene), the Easy-mode subset, and seasonal
 * palettes. Also the friendly "try again" hints — there are no failure
 * messages, only gentle encouragement.
 */
import type { AnimalDef, AnimalId, HabitatDef, Mode, Season, SeasonTheme } from "./types";

export const ANIMALS: AnimalDef[] = [
  { id: "robin",    name: "Robin",    emoji: "🐦", home: "treeNest", accent: "#C9603F", fact: "Robins build nests in trees using twigs, leaves and grass." },
  { id: "hedgehog", name: "Hedgehog", emoji: "🦔", home: "burrow",   accent: "#8B6B4A", fact: "Hedgehogs sleep in cosy woodland burrows." },
  { id: "squirrel", name: "Squirrel", emoji: "🐿️", home: "hollow",  accent: "#B5732E", fact: "Squirrels store nuts inside cosy tree hollows." },
  { id: "duck",     name: "Duck",     emoji: "🦆", home: "pond",     accent: "#4A7A3F", fact: "Ducks love living in ponds where they can swim and play." },
  { id: "bee",      name: "Bee",      emoji: "🐝", home: "garden",   accent: "#E0A92E", fact: "Bees visit flowers and help them grow." },
  { id: "rabbit",   name: "Rabbit",   emoji: "🐇", home: "warren",   accent: "#9A8E80", fact: "Rabbits dig warrens with lots of cosy tunnels." },
];

export const HABITATS: HabitatDef[] = [
  { id: "treeNest", name: "Tree Nest",       emoji: "🌳", pos: { x: 15, y: 40 }, size: 92 },
  { id: "hollow",   name: "Tree Hollow",     emoji: "🌰", pos: { x: 43, y: 30 }, size: 92 },
  { id: "burrow",   name: "Woodland Burrow", emoji: "🪵", pos: { x: 80, y: 36 }, size: 96 },
  { id: "pond",     name: "Pond",            emoji: "🦆", pos: { x: 14, y: 74 }, size: 100 },
  { id: "garden",   name: "Flower Garden",   emoji: "🌻", pos: { x: 46, y: 70 }, size: 100 },
  { id: "warren",   name: "Rabbit Warren",   emoji: "🐇", pos: { x: 82, y: 74 }, size: 96 },
];

/** Easy mode uses three clearly-distinct animals (and their homes). */
export const EASY_ANIMAL_IDS: AnimalId[] = ["robin", "duck", "rabbit"];

export function animalsForMode(mode: Mode): AnimalDef[] {
  return mode === "easy" ? ANIMALS.filter((a) => EASY_ANIMAL_IDS.includes(a.id)) : ANIMALS;
}

export function habitatsForMode(mode: Mode): HabitatDef[] {
  if (mode === "full") return HABITATS;
  const homes = new Set(animalsForMode("easy").map((a) => a.home));
  return HABITATS.filter((h) => homes.has(h.id));
}

export function animalById(id: AnimalId): AnimalDef {
  return ANIMALS.find((a) => a.id === id)!;
}

/** A gentle, never-negative nudge when the wrong home is chosen. */
export function hintFor(animalName: string): string {
  return `Hmm, that's not quite home. Let's find where the ${animalName.toLowerCase()} lives!`;
}

export const SEASON_THEMES: Record<Season, SeasonTheme> = {
  spring: { sky: ["#EAF3FB", "#FAF8F4"], grass: "#A9C5B0", grassAlt: "#93B89C", foliage: "#6F8E6C", foliageAlt: "#A9C5B0" },
  summer: { sky: ["#E6F0FB", "#FAF8F4"], grass: "#9CC0A4", grassAlt: "#82AC8C", foliage: "#5F8160", foliageAlt: "#8FB597" },
  autumn: { sky: ["#F3ECDB", "#FAF8F4"], grass: "#CDB59A", grassAlt: "#BBA081", foliage: "#B07A3C", foliageAlt: "#D9A85C" },
  winter: { sky: ["#E8EEF3", "#FAF8F4"], grass: "#E4E9EC", grassAlt: "#D2DBDF", foliage: "#7E948A", foliageAlt: "#B6C7C0" },
};

export function seasonForDate(d = new Date()): Season {
  const m = d.getMonth();
  if (m <= 1 || m === 11) return "winter";
  if (m <= 4) return "spring";
  if (m <= 7) return "summer";
  return "autumn";
}
