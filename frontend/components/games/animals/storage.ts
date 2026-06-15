"use client";

/**
 * Local score/achievement persistence + parent-dashboard hooks.
 *
 * Persistence is guarded for SSR / blocked storage. Parent-dashboard hooks are
 * exposed two ways so an embedding page can integrate however it likes:
 *   1. a `window` CustomEvent ("bn-parent-dashboard") on every match/completion;
 *   2. the persisted `AnimalsSave` object a dashboard can read at any time.
 */
import type { AnimalsSave, Mode, ParentEvent } from "./types";

const KEY = "bn-animals-save-v1";

const EMPTY: AnimalsSave = { gamesWon: 0, totalMatches: 0, badges: [], bestTimes: {} };

export function loadSave(): AnimalsSave {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<AnimalsSave>;
    return { ...EMPTY, ...parsed, badges: parsed.badges ?? [], bestTimes: parsed.bestTimes ?? {} };
  } catch {
    return EMPTY;
  }
}

function write(save: AnimalsSave): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    /* storage unavailable — game continues without persistence */
  }
}

/** Emit a parent-dashboard hook event. */
export function emitParentEvent(detail: ParentEvent): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ParentEvent>("bn-parent-dashboard", { detail }));
}

/** Bump the running match counter. */
export function recordMatch(prev: AnimalsSave): AnimalsSave {
  const next = { ...prev, totalMatches: prev.totalMatches + 1 };
  write(next);
  return next;
}

/** Record a completed game, awarding the Animal Explorer badge + best time. */
export function recordCompletion(prev: AnimalsSave, mode: Mode, seconds: number): AnimalsSave {
  const badges = prev.badges.includes("animal-explorer") ? prev.badges : [...prev.badges, "animal-explorer"];
  const prevBest = prev.bestTimes[mode];
  const next: AnimalsSave = {
    gamesWon: prev.gamesWon + 1,
    totalMatches: prev.totalMatches,
    badges,
    bestTimes: { ...prev.bestTimes, [mode]: prevBest ? Math.min(prevBest, seconds) : seconds },
  };
  write(next);
  return next;
}
