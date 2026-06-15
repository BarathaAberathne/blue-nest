"use client";

/**
 * "Grow Your Own Blue Nest Garden" — main orchestrator.
 *
 * A calm, step-by-step Montessori activity: choose a plant, drag a seed into
 * the soil, water it, give it sunshine, then watch it grow — with a gentle
 * "Did you know?" fact at each stage and a Garden Explorer badge at the end.
 *
 * Pure React + Framer Motion (no canvas / game engine). Pointer events power a
 * drag that works identically with mouse and touch, with a tap-to-place
 * fallback for the youngest players. Progress + achievements persist in
 * localStorage.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Volume2, VolumeX, RotateCcw } from "lucide-react";
import { GardenPlot } from "./GardenPlot";
import { PlantSelector } from "./PlantSelector";
import { FactCard } from "./FactCard";
import { CompletionModal } from "./CompletionModal";
import { Seed, SunIcon, BirdIcon } from "./icons";
import { STEPS, SEASON_THEMES, seasonForDate, plantById } from "./data";
import { loadSave, writeSave, recordCompletion } from "./storage";
import { useChime } from "./useChime";
import type { GardenSave, GrowthStage, PlantId, Step } from "./types";

type DragToken = "seed" | "sun";

export default function GardenGame() {
  const reduce = useReducedMotion() ?? false;
  const season = useMemo(() => seasonForDate(), []);
  const theme = SEASON_THEMES[season];

  const [plant, setPlant] = useState<PlantId | null>(null);
  const [step, setStep] = useState<Step>("choose");
  const [stage, setStage] = useState<GrowthStage | null>(null);
  const [sunny, setSunny] = useState(false);
  const [muted, setMuted] = useState(false);
  const [done, setDone] = useState(false);
  const [save, setSave] = useState<GardenSave>(() => ({ gardensGrown: 0, plantsGrown: [], badges: [], progress: null }));

  const { plant: playPlant, water: playWater, sun: playSun, grow: playGrow, celebrate } = useChime(muted);

  const soilRef = useRef<HTMLDivElement>(null);
  const skyRef = useRef<HTMLDivElement>(null);

  // Drag state
  const [dragging, setDragging] = useState<DragToken | null>(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [overTarget, setOverTarget] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, moved: false });

  const plantDef = plantById(plant);

  /* Load achievements once on mount. */
  useEffect(() => {
    setSave(loadSave());
  }, []);

  /* ── Step actions ─────────────────────────────────────────── */
  const choosePlant = useCallback(
    (id: PlantId) => {
      setPlant(id);
      setStep("plant");
      setStage(null);
      playPlant();
    },
    [playPlant],
  );

  const handlePlanted = useCallback(() => {
    setStage("seed");
    setStep("water");
    playPlant();
  }, [playPlant]);

  const handleWater = useCallback(() => {
    playWater();
    setStage("sprout");
    setStep("sunshine");
  }, [playWater]);

  const handleSun = useCallback(() => {
    setSunny(true);
    setStage("small");
    setStep("grow");
    playSun();
  }, [playSun]);

  /* ── Auto growth during the final step ────────────────────── */
  useEffect(() => {
    if (step !== "grow" || !stage) return;
    if (stage === "small") {
      const t = setTimeout(() => {
        setStage("growing");
        playGrow();
      }, 1800);
      return () => clearTimeout(t);
    }
    if (stage === "growing") {
      const t = setTimeout(() => {
        setStage("grown");
        playGrow();
      }, 1800);
      return () => clearTimeout(t);
    }
    if (stage === "grown") {
      const t = setTimeout(() => setDone(true), 1300);
      return () => clearTimeout(t);
    }
  }, [step, stage, playGrow]);

  /* Record completion + persist achievements once. */
  useEffect(() => {
    if (!done || !plant) return;
    celebrate();
    setSave((prev) => recordCompletion(prev, plant));
  }, [done, plant, celebrate]);

  /* Persist in-progress state so a refresh can resume. */
  useEffect(() => {
    if (done) return;
    setSave((prev) => {
      const next: GardenSave = { ...prev, progress: { plant, step, stage, watered: step === "sunshine" || step === "grow", sunny } };
      writeSave(next);
      return next;
    });
  }, [plant, step, stage, sunny, done]);

  /* ── Drag handling (pointer = mouse + touch) ──────────────── */
  const isOver = (ref: React.RefObject<HTMLDivElement>, x: number, y: number) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return false;
    const pad = 28;
    return x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;
  };

  useEffect(() => {
    if (!dragging) return;
    const target = dragging === "seed" ? soilRef : skyRef;
    const move = (e: PointerEvent) => {
      setPointer({ x: e.clientX, y: e.clientY });
      if (Math.hypot(e.clientX - dragStart.current.x, e.clientY - dragStart.current.y) > 6) dragStart.current.moved = true;
      setOverTarget(isOver(target, e.clientX, e.clientY));
    };
    const end = (e: PointerEvent) => {
      const placed = isOver(target, e.clientX, e.clientY) || !dragStart.current.moved;
      const token = dragging;
      setDragging(null);
      setOverTarget(false);
      if (placed) {
        if (token === "seed") handlePlanted();
        else handleSun();
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
  }, [dragging, handlePlanted, handleSun]);

  const startDrag = (e: React.PointerEvent, token: DragToken) => {
    dragStart.current = { x: e.clientX, y: e.clientY, moved: false };
    setPointer({ x: e.clientX, y: e.clientY });
    setDragging(token);
  };

  /* ── Reset ────────────────────────────────────────────────── */
  const reset = useCallback(() => {
    setPlant(null);
    setStep("choose");
    setStage(null);
    setSunny(false);
    setDone(false);
    setDragging(null);
  }, []);

  /* ── Current fact / instruction ───────────────────────────── */
  const fact = useMemo<{ eyebrow: string; message: string }>(() => {
    const name = plantDef?.name.toLowerCase() ?? "plant";
    switch (step) {
      case "choose":
        return { eyebrow: "Did you know?", message: "Plants need water, sunlight and care to grow." };
      case "plant":
        return { eyebrow: "Step 2 · Plant", message: "Drag the seed into the soil." };
      case "water":
        return { eyebrow: "Step 3 · Water", message: "Tap the watering can to water your plant." };
      case "sunshine":
        return { eyebrow: "Step 4 · Sunshine", message: "Drag the sun into the sky." };
      case "grow":
        if (stage === "small") return { eyebrow: "Did you know?", message: "Plants use sunlight to make their food." };
        if (stage === "growing") return { eyebrow: "Did you know?", message: plantDef?.facts[0] ?? `Look how tall your ${name} is getting!` };
        return { eyebrow: "Amazing!", message: `Your ${name} is all grown up!` };
    }
  }, [step, stage, plantDef]);

  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const DragPreview = dragging === "seed" ? Seed : SunIcon;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8" style={{ touchAction: dragging ? "none" : undefined }}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
            <BirdIcon className="h-9 w-9" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6F8E6C]">Blue Nest · Garden</p>
            <h1 className="font-display text-2xl leading-tight text-[#2F5D9F] sm:text-3xl">
              Grow Your Own Garden
            </h1>
            <p className="mt-0.5 text-sm text-[#6B5B52]">Help your plant grow strong and healthy.</p>
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

      {/* ── Progress indicator ─────────────────────────────────── */}
      <ol className="mb-5 flex items-center justify-between gap-1" aria-label="Garden progress">
        {STEPS.map((s, i) => {
          const state = i < stepIndex ? "done" : i === stepIndex ? "current" : "todo";
          return (
            <li key={s.id} className="flex flex-1 items-center gap-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <span
                  aria-current={state === "current" ? "step" : undefined}
                  className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${
                    state === "done"
                      ? "border-[#6F8E6C] bg-[#6F8E6C] text-white"
                      : state === "current"
                        ? "border-[#4A90E2] bg-[#4A90E2] text-white"
                        : "border-[#D8CBB8] bg-white text-[#B6A78F]"
                  }`}
                >
                  {state === "done" ? "✓" : i + 1}
                </span>
                <span className={`text-[0.6rem] font-semibold sm:text-xs ${state === "todo" ? "text-[#B6A78F]" : "text-[#2F5D9F]"}`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <span className={`mx-1 hidden h-0.5 flex-1 rounded sm:block ${i < stepIndex ? "bg-[#6F8E6C]" : "bg-[#E4D9C7]"}`} />
              )}
            </li>
          );
        })}
      </ol>

      {/* ── Step 1: plant selector ─────────────────────────────── */}
      <AnimatePresence>
        {step === "choose" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-5 rounded-[24px] border border-[#ECE3D6] bg-white/90 p-4 shadow-sm sm:p-6"
          >
            <p className="text-center text-sm font-bold text-[#6F8E6C]">Step 1 · Choose a plant</p>
            <p className="mb-4 text-center font-display text-xl text-[#2F5D9F]">Which one would you like to grow?</p>
            <PlantSelector selected={plant} reduce={reduce} onSelect={choosePlant} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Garden area ────────────────────────────────────────── */}
      <div
        role="group"
        aria-label="Your garden"
        className="relative mx-auto aspect-[5/3] h-[min(54vh,calc((100vw-2rem)*0.6))] max-w-full overflow-hidden rounded-[24px] border border-[#ECE3D6] shadow-[0_18px_48px_-24px_rgba(90,74,66,0.5)]"
      >
        <GardenPlot
          plantId={plant}
          stage={stage}
          step={step}
          sunny={sunny}
          reduce={reduce}
          theme={theme}
          soilRef={soilRef}
          skyRef={skyRef}
          highlightSoil={dragging === "seed" && overTarget}
          highlightSky={dragging === "sun" && overTarget}
          onWater={handleWater}
        />

        {/* draggable token for the current action */}
        <AnimatePresence>
          {(step === "plant" || step === "sunshine") && (
            <motion.button
              key={step}
              type="button"
              onPointerDown={(e) => startDrag(e, step === "plant" ? "seed" : "sun")}
              aria-label={step === "plant" ? "Drag the seed into the soil" : "Drag the sun into the sky"}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: dragging ? 0.3 : 1, scale: 1, y: reduce || dragging ? 0 : [0, -6, 0] }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ y: { duration: 2, repeat: Infinity, ease: "easeInOut" } }}
              style={{ touchAction: "none" }}
              className="absolute bottom-4 left-4 z-20 flex flex-col items-center gap-1 rounded-[24px] bg-white/90 p-3 shadow-md focus:outline-none focus-visible:ring-4 focus-visible:ring-[#4A90E2]/60"
            >
              <span className="h-12 w-12">
                {step === "plant" ? <Seed className="h-full w-full" /> : <SunIcon className="h-full w-full" />}
              </span>
              <span className="text-[0.65rem] font-bold text-[#2F5D9F]">
                {step === "plant" ? "Drag me" : "Drag me"}
              </span>
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {done && plantDef && (
            <CompletionModal plant={plantDef} save={save} reduce={reduce} onPlayAgain={reset} />
          )}
        </AnimatePresence>
      </div>

      {/* ── Fact / instruction card ────────────────────────────── */}
      <div className="mt-4">
        <FactCard eyebrow={fact.eyebrow} message={fact.message} reduce={reduce} />
      </div>

      {/* Floating drag preview */}
      {dragging && (
        <div
          className="pointer-events-none fixed z-50 drop-shadow-lg"
          style={{ left: pointer.x, top: pointer.y, transform: "translate(-50%,-50%)" }}
        >
          <DragPreview className="h-16 w-16" />
        </div>
      )}
    </div>
  );
}
