"use client";

/**
 * Forest School Treasure Hunt — main orchestrator.
 *
 * Owns game state (found set, timer, score, sound, season) and composes the
 * presentational pieces: header, ForestScene, the CollectibleItem overlay,
 * CollectionBar and CompletionModal. Pure React + Framer Motion; no canvas,
 * no game engine.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Volume2, VolumeX, RotateCcw } from "lucide-react";
import { COLLECTIBLES, TOTAL_TREASURES, SEASON_THEMES, seasonForDate } from "./data";
import { ForestScene } from "./ForestScene";
import { CollectibleItem } from "./CollectibleItem";
import { CollectionBar } from "./CollectionBar";
import { CompletionModal } from "./CompletionModal";
import { TreasureIcon } from "./icons";
import { useChime } from "./useChime";
import type { GameResult, ItemId, Season } from "./types";

export default function TreasureHuntGame() {
  const reduce = useReducedMotion() ?? false;
  const [found, setFound] = useState<Set<ItemId>>(new Set());
  const [muted, setMuted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [announce, setAnnounce] = useState("");

  // Seasonal mode — auto-selected by month, easy to override later.
  const [season] = useState<Season>(() => seasonForDate());
  const theme = SEASON_THEMES[season];

  const { found: playFound, celebrate } = useChime(muted);

  const startRef = useRef<number | null>(null);
  const complete = found.size === TOTAL_TREASURES;

  // Live timer: runs from the first find until everything is collected.
  useEffect(() => {
    if (startRef.current === null || complete) return;
    const id = window.setInterval(() => {
      if (startRef.current !== null) {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [complete, found.size]);

  const handleFind = useCallback(
    (id: ItemId) => {
      setFound((prev) => {
        if (prev.has(id)) return prev;
        if (startRef.current === null) startRef.current = Date.now();
        const next = new Set(prev);
        next.add(id);
        const label = COLLECTIBLES.find((c) => c.id === id)?.label ?? "Treasure";
        setAnnounce(`${label} found! ${next.size} of ${TOTAL_TREASURES}.`);
        if (next.size === TOTAL_TREASURES) {
          setElapsed(startRef.current ? Math.floor((Date.now() - startRef.current) / 1000) : 0);
          celebrate();
        } else {
          playFound();
        }
        return next;
      });
    },
    [celebrate, playFound],
  );

  const reset = useCallback(() => {
    setFound(new Set());
    setElapsed(0);
    setAnnounce("");
    startRef.current = null;
  }, []);

  const result: GameResult = useMemo(
    () => ({ seconds: elapsed, found: found.size, total: TOTAL_TREASURES }),
    [elapsed, found.size],
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="mb-4 flex flex-col gap-4 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
            <TreasureIcon id="bird" className="h-9 w-9" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6F8E6C]">
              Blue Nest · Forest School
            </p>
            <h1 className="font-display text-2xl leading-tight text-[#2F5D9F] sm:text-3xl">
              Forest School Treasure Hunt
            </h1>
            <p className="mt-0.5 text-sm text-[#6B5B52]">
              Can you find all the treasures hidden in the woodland?
            </p>
          </div>
        </div>

        {/* Progress + controls */}
        <div className="flex items-center gap-3">
          <div className="rounded-[24px] bg-white px-4 py-2 text-center shadow-sm">
            <p className="font-display text-xl leading-none text-[#4A90E2]">
              {found.size} / {TOTAL_TREASURES}
            </p>
            <p className="text-[0.65rem] font-bold uppercase tracking-wide text-[#A99E8C]">Found</p>
          </div>
          <button
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? "Turn sound on" : "Turn sound off"}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#6B5B52] shadow-sm transition-all hover:-translate-y-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#A9C5B0]/60"
          >
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
          <button
            onClick={reset}
            aria-label="Start again"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#6B5B52] shadow-sm transition-all hover:-translate-y-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#A9C5B0]/60"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* slim progress bar */}
      <div className="mb-4 h-2.5 w-full overflow-hidden rounded-full bg-[#ECE3D6]">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-[#A9C5B0] to-[#4A90E2]"
          initial={false}
          animate={{ width: `${(found.size / TOTAL_TREASURES) * 100}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </div>

      {/* ── Scene + overlay ────────────────────────────────────── */}
      <div
        role="group"
        aria-label="Woodland scene. Find the hidden treasures."
        className="relative mx-auto aspect-[1000/620] h-[min(64vh,calc((100vw-2rem)*0.62))] max-w-full overflow-hidden rounded-[24px] border border-[#ECE3D6] shadow-[0_18px_48px_-24px_rgba(90,74,66,0.5)]"
      >
        <ForestScene theme={theme} />

        {COLLECTIBLES.map((def) => (
          <CollectibleItem
            key={def.id}
            def={def}
            found={found.has(def.id)}
            reduce={reduce}
            onFind={handleFind}
          />
        ))}

        <AnimatePresence>
          {complete && (
            <CompletionModal result={result} reduce={reduce} onPlayAgain={reset} />
          )}
        </AnimatePresence>
      </div>

      {/* ── Collection tray ────────────────────────────────────── */}
      <CollectionBar collectibles={COLLECTIBLES} found={found} reduce={reduce} />

      {/* screen-reader live announcements */}
      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>
    </div>
  );
}
