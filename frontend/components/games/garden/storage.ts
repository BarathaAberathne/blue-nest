"use client";

/**
 * Local-storage persistence for achievements and in-progress games. All access
 * is guarded so it is safe during SSR and when storage is unavailable
 * (e.g. private mode).
 */
import type { GardenSave, PlantId } from "./types";

const KEY = "bn-garden-save-v1";

const EMPTY: GardenSave = {
  gardensGrown: 0,
  plantsGrown: [],
  badges: [],
  progress: null,
};

export function loadSave(): GardenSave {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<GardenSave>;
    return { ...EMPTY, ...parsed, plantsGrown: parsed.plantsGrown ?? [], badges: parsed.badges ?? [] };
  } catch {
    return EMPTY;
  }
}

export function writeSave(save: GardenSave): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    /* storage full or blocked — game continues, just without persistence */
  }
}

/** Record a completed garden, returning the updated save. */
export function recordCompletion(prev: GardenSave, plant: PlantId): GardenSave {
  const plantsGrown = prev.plantsGrown.includes(plant) ? prev.plantsGrown : [...prev.plantsGrown, plant];
  const badges = prev.badges.includes("garden-explorer") ? prev.badges : [...prev.badges, "garden-explorer"];
  const next: GardenSave = {
    gardensGrown: prev.gardensGrown + 1,
    plantsGrown,
    badges,
    progress: null,
  };
  writeSave(next);
  return next;
}
