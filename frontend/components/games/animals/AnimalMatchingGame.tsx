"use client";

/**
 * "Match the Animals to Their Homes" — main orchestrator.
 *
 * A calm Montessori matching activity: drag (or select-then-tap) each animal to
 * its correct woodland home. Correct matches glow, settle in and reveal a fact;
 * wrong drops give a gentle shake and a friendly nudge — never a failure.
 *
 * Pure React + Framer Motion (no canvas / engine). Pointer events power a drag
 * that works with mouse and touch; click/Enter give a fully keyboard- and
 * tap-accessible select-then-place alternative. Scores, achievements and
 * parent-dashboard hooks persist via localStorage + a window event.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Volume2, VolumeX, RotateCcw, Leaf } from "lucide-react";
import { WoodlandScene } from "./WoodlandScene";
import { HabitatZone } from "./HabitatZone";
import { AnimalCard } from "./AnimalCard";
import { FactCard } from "./FactCard";
import { ProgressTracker } from "./ProgressTracker";
import { CompletionModal } from "./CompletionModal";
import { AnimalIcon, NestBird } from "./icons";
import {
  animalsForMode,
  habitatsForMode,
  animalById,
  hintFor,
  SEASON_THEMES,
  seasonForDate,
} from "./data";
import { loadSave, recordMatch, recordCompletion, emitParentEvent } from "./storage";
import { useChime } from "./useChime";
import type { AnimalId, AnimalsSave, HabitatId, Mode } from "./types";

interface Fact {
  eyebrow: string;
  message: string;
  animal: AnimalId | null;
}

const INTRO: Fact = { eyebrow: "How to play", message: "Drag each animal to its correct home.", animal: null };

export default function AnimalMatchingGame() {
  const reduce = useReducedMotion() ?? false;
  const season = useMemo(() => seasonForDate(), []);
  const theme = SEASON_THEMES[season];

  const [mode, setMode] = useState<Mode>("full");
  const animals = useMemo(() => animalsForMode(mode), [mode]);
  const habitats = useMemo(() => habitatsForMode(mode), [mode]);

  const [matched, setMatched] = useState<Set<AnimalId>>(new Set());
  const [selected, setSelected] = useState<AnimalId | null>(null);
  const [hovered, setHovered] = useState<HabitatId | null>(null);
  const [shaking, setShaking] = useState<HabitatId | null>(null);
  const [fact, setFact] = useState<Fact>(INTRO);
  const [muted, setMuted] = useState(false);
  const [done, setDone] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [announce, setAnnounce] = useState("");
  const [save, setSave] = useState<AnimalsSave>({ gamesWon: 0, totalMatches: 0, badges: [], bestTimes: {} });

  const { match: playMatch, nudge, celebrate } = useChime(muted);

  const startRef = useRef<number | null>(null);
  const total = animals.length;
  const complete = matched.size === total && total > 0;

  // Drag state
  const [dragging, setDragging] = useState<AnimalId | null>(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const dragData = useRef({ x: 0, y: 0, moved: false });
  const justDragged = useRef(false);

  useEffect(() => {
    setSave(loadSave());
  }, []);

  const startTimer = () => {
    if (startRef.current === null) startRef.current = Date.now();
  };

  /* ── Matching ─────────────────────────────────────────────── */
  const attemptMatch = useCallback(
    (animalId: AnimalId, habitatId: HabitatId) => {
      const animal = animalById(animalId);
      if (matched.has(animalId)) return;
      if (animal.home === habitatId) {
        startTimer();
        setMatched((prev) => {
          const next = new Set(prev);
          next.add(animalId);
          return next;
        });
        setSelected(null);
        setFact({ eyebrow: "Did you know?", message: animal.fact, animal: animalId });
        setAnnounce(`${animal.name} is home! ${animal.fact}`);
        playMatch();
        setSave((prev) => recordMatch(prev));
        emitParentEvent({ game: "match-the-animals", type: "match", animal: animalId, mode, matched: matched.size + 1, total });
      } else {
        setShaking(habitatId);
        window.setTimeout(() => setShaking(null), 500);
        setFact({ eyebrow: "Keep trying!", message: hintFor(animal.name), animal: animalId });
        setAnnounce(hintFor(animal.name));
        nudge();
      }
    },
    [matched, mode, total, playMatch, nudge],
  );

  /* ── Completion ───────────────────────────────────────────── */
  useEffect(() => {
    if (!complete || done) return;
    const seconds = startRef.current ? Math.floor((Date.now() - startRef.current) / 1000) : 0;
    setElapsed(seconds);
    const t = setTimeout(() => {
      setDone(true);
      celebrate();
      setSave((prev) => {
        const next = recordCompletion(prev, mode, seconds);
        return next;
      });
      emitParentEvent({ game: "match-the-animals", type: "complete", mode, matched: total, total, seconds });
    }, 900);
    return () => clearTimeout(t);
  }, [complete, done, mode, total, celebrate]);

  /* ── Drag handling (pointer = mouse + touch) ──────────────── */
  useEffect(() => {
    if (!dragging) return;
    const habitatUnder = (x: number, y: number): HabitatId | null => {
      const el = document.elementFromPoint(x, y)?.closest("[data-habitat]") as HTMLElement | null;
      return (el?.dataset.habitat as HabitatId) ?? null;
    };
    const move = (e: PointerEvent) => {
      setPointer({ x: e.clientX, y: e.clientY });
      if (Math.hypot(e.clientX - dragData.current.x, e.clientY - dragData.current.y) > 6) dragData.current.moved = true;
      setHovered(habitatUnder(e.clientX, e.clientY));
    };
    const end = (e: PointerEvent) => {
      const animalId = dragging;
      const hid = habitatUnder(e.clientX, e.clientY);
      setDragging(null);
      setHovered(null);
      if (dragData.current.moved) {
        justDragged.current = true;
        if (animalId && hid) attemptMatch(animalId, hid);
      }
    };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, [dragging, attemptMatch]);

  const startDrag = (e: React.PointerEvent, animalId: AnimalId) => {
    if (matched.has(animalId)) return;
    startTimer();
    dragData.current = { x: e.clientX, y: e.clientY, moved: false };
    setPointer({ x: e.clientX, y: e.clientY });
    setDragging(animalId);
  };

  const selectAnimal = (animalId: AnimalId) => {
    if (justDragged.current) {
      justDragged.current = false;
      return;
    }
    if (matched.has(animalId)) return;
    startTimer();
    setSelected(animalId);
    const a = animalById(animalId);
    setFact({ eyebrow: "Good choice!", message: `Now tap where the ${a.name.toLowerCase()} lives.`, animal: animalId });
  };

  const selectHabitat = (habitatId: HabitatId) => {
    if (selected) attemptMatch(selected, habitatId);
  };

  /* ── Reset / mode ─────────────────────────────────────────── */
  const reset = useCallback(() => {
    setMatched(new Set());
    setSelected(null);
    setHovered(null);
    setShaking(null);
    setDone(false);
    setElapsed(0);
    setFact(INTRO);
    setDragging(null);
    startRef.current = null;
  }, []);

  const changeMode = (m: Mode) => {
    setMode(m);
    reset();
  };

  const matchedByHabitat = (hid: HabitatId): AnimalId | null =>
    animals.find((a) => a.home === hid && matched.has(a.id))?.id ?? null;

  const trayAnimals = animals.filter((a) => !matched.has(a.id));
  const DragPreviewId = dragging;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8" style={{ touchAction: dragging ? "none" : undefined }}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
            <NestBird className="h-9 w-9" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6F8E6C]">Blue Nest · Nature</p>
            <h1 className="font-display text-2xl leading-tight text-[#2F5D9F] sm:text-3xl">Match the Animals</h1>
            <p className="mt-0.5 text-sm text-[#6B5B52]">Can you help each animal find its home?</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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

      {/* ── Progress + mode ────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <ProgressTracker animals={animals} matched={matched} reduce={reduce} />
        <div role="group" aria-label="Difficulty" className="inline-flex rounded-full bg-white p-1 shadow-sm">
          {(["easy", "full"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => changeMode(m)}
              aria-pressed={mode === m}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold transition-colors ${
                mode === m ? "bg-[#6F8E6C] text-white" : "text-[#6F8E6C] hover:bg-[#EEF4EF]"
              }`}
            >
              <Leaf className="h-3.5 w-3.5" />
              {m === "easy" ? "Easy · 3" : "Full · 6"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Woodland scene + habitats ──────────────────────────── */}
      <div
        role="group"
        aria-label="Woodland scene with animal homes"
        className="relative mx-auto aspect-[1000/560] h-[min(52vh,calc((100vw-2rem)*0.56))] max-w-full overflow-hidden rounded-[24px] border border-[#ECE3D6] shadow-[0_18px_48px_-24px_rgba(90,74,66,0.5)]"
      >
        <WoodlandScene theme={theme} reduce={reduce} />

        {habitats.map((h) => (
          <HabitatZone
            key={h.id}
            def={h}
            hovered={hovered === h.id}
            shaking={shaking === h.id}
            matched={matchedByHabitat(h.id)}
            selecting={selected !== null}
            reduce={reduce}
            onSelect={selectHabitat}
          />
        ))}

        <AnimatePresence>
          {done && <CompletionModal save={save} mode={mode} seconds={elapsed} reduce={reduce} onPlayAgain={reset} />}
        </AnimatePresence>
      </div>

      {/* ── Animal tray ────────────────────────────────────────── */}
      <p className="mt-4 text-center text-sm font-semibold text-[#6B5B52]">Drag each animal to its correct home.</p>
      <div className="mt-2 flex flex-wrap items-stretch justify-center gap-2 sm:gap-3">
        <AnimatePresence mode="popLayout">
          {trayAnimals.map((a) => (
            <AnimalCard
              key={a.id}
              def={a}
              selected={selected === a.id}
              dragging={dragging === a.id}
              reduce={reduce}
              onPointerDown={(e) => startDrag(e, a.id)}
              onSelect={() => selectAnimal(a.id)}
            />
          ))}
        </AnimatePresence>
        {trayAnimals.length === 0 && (
          <p className="py-4 font-display text-lg text-[#6F8E6C]">Every animal is home! 🎉</p>
        )}
      </div>

      {/* ── Fact / instruction ─────────────────────────────────── */}
      <div className="mt-4">
        <FactCard eyebrow={fact.eyebrow} message={fact.message} animal={fact.animal} reduce={reduce} />
      </div>

      {/* screen-reader live region */}
      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>

      {/* floating drag preview */}
      {DragPreviewId && (
        <div
          className="pointer-events-none fixed z-50 drop-shadow-lg"
          style={{ left: pointer.x, top: pointer.y, transform: "translate(-50%,-50%)" }}
        >
          <AnimalIcon id={DragPreviewId} className="h-16 w-16 sm:h-20 sm:w-20" />
        </div>
      )}
    </div>
  );
}
