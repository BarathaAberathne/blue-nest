"use client";

/**
 * "Build the Blue Nest" — a calm, Montessori-style drag-and-drop game for
 * 2–6 year olds. Children drag five natural items (twigs, leaves, feathers,
 * soft grass, flowers) into a cosy nest. Each correct drop stays put, plays a
 * gentle chime, and nudges the progress along; placing all five reveals a warm
 * "Well done!" finish.
 *
 * Implementation notes:
 *  - Pointer events (not HTML5 drag) so it works identically with a mouse and
 *    with touch on iPad/tablet. `touch-action: none` on items stops the page
 *    scrolling mid-drag.
 *  - A small movement also counts as a tap-to-place, so the very youngest
 *    children can simply touch an item to add it.
 *  - Optional WebAudio chime — no audio files, and fully mutable.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Home, Volume2, VolumeX, Heart, ArrowRight, Sparkles } from "lucide-react";
import { Bird, Flower, ITEM_ART } from "./illustrations";

/* ── Item catalogue ──────────────────────────────────────────────────────── */
type ItemId = "twigs" | "leaves" | "feathers" | "grass" | "flowers";

type ItemDef = {
  id: ItemId;
  label: string;
  praise: string;
  /** Resting place inside the nest (percent of the nest box) + a little tilt. */
  spot: { left: string; top: string; rotate: number; scale: number; z: number };
};

const ITEMS: ItemDef[] = [
  { id: "twigs",    label: "Twigs",     praise: "Great! You added twigs!",  spot: { left: "30%", top: "44%", rotate: -8,  scale: 1,    z: 1 } },
  { id: "leaves",   label: "Leaves",    praise: "Nice! Leaves are perfect!", spot: { left: "54%", top: "40%", rotate: 12,  scale: 0.9,  z: 2 } },
  { id: "feathers", label: "Feathers",  praise: "Lovely! A soft feather!",  spot: { left: "68%", top: "48%", rotate: 24,  scale: 0.95, z: 3 } },
  { id: "grass",    label: "Soft Grass", praise: "Great! Soft grass!",      spot: { left: "44%", top: "34%", rotate: -4,  scale: 0.85, z: 1 } },
  { id: "flowers",  label: "Flowers",   praise: "Beautiful! Flowers!",      spot: { left: "40%", top: "58%", rotate: 6,   scale: 0.9,  z: 4 } },
];

const TOTAL = ITEMS.length;

/* ── Gentle sound (WebAudio, no files) ───────────────────────────────────── */
function useChime(muted: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);

  const play = useCallback(
    (notes: number[], gap = 0.09) => {
      if (muted) return;
      try {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = ctxRef.current ?? new AC();
        ctxRef.current = ctx;
        if (ctx.state === "suspended") void ctx.resume();
        const now = ctx.currentTime;
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = freq;
          osc.connect(gain);
          gain.connect(ctx.destination);
          const t = now + i * gap;
          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.14, t + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.5);
          osc.start(t);
          osc.stop(t + 0.55);
        });
      } catch {
        /* audio unsupported — game stays fully playable without it */
      }
    },
    [muted],
  );

  const placeSound = useCallback(() => play([523.25, 659.25, 783.99]), [play]); // C–E–G
  const winSound = useCallback(() => play([523.25, 659.25, 783.99, 1046.5, 1318.5], 0.12), [play]);
  return { placeSound, winSound };
}

/* ── Screens ─────────────────────────────────────────────────────────────── */
type Screen = "welcome" | "play" | "done";

export default function BuildTheBlueNest() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [placed, setPlaced] = useState<ItemId[]>([]);
  const [muted, setMuted] = useState(false);

  // Drag state
  const [draggingId, setDraggingId] = useState<ItemId | null>(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [overNest, setOverNest] = useState(false);
  const [justPlaced, setJustPlaced] = useState<ItemId | null>(null);
  const dragStart = useRef({ x: 0, y: 0, moved: false });
  const nestRef = useRef<HTMLDivElement>(null);

  const { placeSound, winSound } = useChime(muted);

  const isPlaced = useCallback((id: ItemId) => placed.includes(id), [placed]);
  const lastPraise = useMemo(
    () => (justPlaced ? ITEMS.find((i) => i.id === justPlaced)?.praise : null),
    [justPlaced],
  );

  const place = useCallback(
    (id: ItemId) => {
      setPlaced((prev) => (prev.includes(id) ? prev : [...prev, id]));
      setJustPlaced(id);
      placeSound();
    },
    [placeSound],
  );

  /* Reveal the finish screen once the nest is full. */
  useEffect(() => {
    if (placed.length === TOTAL && screen === "play") {
      winSound();
      const t = setTimeout(() => setScreen("done"), 1400);
      return () => clearTimeout(t);
    }
  }, [placed.length, screen, winSound]);

  /* Clear the praise bubble a moment after each placement. */
  useEffect(() => {
    if (!justPlaced) return;
    const t = setTimeout(() => setJustPlaced(null), 1800);
    return () => clearTimeout(t);
  }, [justPlaced]);

  /* Global pointer listeners while dragging (mouse + touch). */
  useEffect(() => {
    if (!draggingId) return;

    const isInsideNest = (x: number, y: number) => {
      const r = nestRef.current?.getBoundingClientRect();
      if (!r) return false;
      // generous hit area so little fingers don't have to be precise
      const pad = 24;
      return x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;
    };

    const move = (e: PointerEvent) => {
      setPointer({ x: e.clientX, y: e.clientY });
      if (Math.hypot(e.clientX - dragStart.current.x, e.clientY - dragStart.current.y) > 6) {
        dragStart.current.moved = true;
      }
      setOverNest(isInsideNest(e.clientX, e.clientY));
    };

    const end = (e: PointerEvent) => {
      const id = draggingId;
      const inside = isInsideNest(e.clientX, e.clientY);
      // Place when dropped on the nest, or on a simple tap (no real drag) —
      // the latter keeps it effortless for the very youngest players.
      if (id && (inside || !dragStart.current.moved)) place(id);
      setDraggingId(null);
      setOverNest(false);
    };

    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, [draggingId, place]);

  const startDrag = (e: React.PointerEvent, id: ItemId) => {
    if (isPlaced(id)) return;
    dragStart.current = { x: e.clientX, y: e.clientY, moved: false };
    setPointer({ x: e.clientX, y: e.clientY });
    setDraggingId(id);
  };

  const reset = () => {
    setPlaced([]);
    setJustPlaced(null);
    setDraggingId(null);
    setScreen("play");
  };

  const DragArt = draggingId ? ITEM_ART[draggingId] : null;

  return (
    <div
      className="relative mx-auto w-full max-w-5xl select-none px-4 py-8 sm:py-12"
      style={{ touchAction: draggingId ? "none" : "auto" }}
    >
      {/* Soft woodland panel */}
      <div className="relative overflow-hidden rounded-[2rem] border border-[#e3dccf] bg-gradient-to-b from-[#eef6f0] via-[#f6f1e8] to-[#f1e9da] shadow-[0_20px_60px_-30px_rgba(90,74,66,0.5)]">
        <Foliage />

        <AnimatePresence mode="wait">
          {screen === "welcome" && (
            <Welcome key="welcome" onStart={() => setScreen("play")} />
          )}

          {screen === "play" && (
            <Play
              key="play"
              placed={placed}
              isPlaced={isPlaced}
              overNest={overNest}
              draggingId={draggingId}
              justPlaced={justPlaced}
              lastPraise={lastPraise ?? null}
              nestRef={nestRef}
              startDrag={startDrag}
              onReset={reset}
              muted={muted}
              onToggleMute={() => setMuted((m) => !m)}
            />
          )}

          {screen === "done" && (
            <Done key="done" onReplay={reset} />
          )}
        </AnimatePresence>
      </div>

      {/* Floating drag preview follows the finger/cursor */}
      {DragArt && (
        <div
          className="pointer-events-none fixed z-50 drop-shadow-lg"
          style={{ left: pointer.x, top: pointer.y, transform: "translate(-50%, -50%) scale(1.05)" }}
        >
          <DragArt className="h-20 w-20 sm:h-24 sm:w-24" />
        </div>
      )}
    </div>
  );
}

/* ── Welcome / start screen ──────────────────────────────────────────────── */
function Welcome({ onStart }: { onStart: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative grid items-center gap-6 px-6 py-12 sm:px-12 sm:py-16 md:grid-cols-2"
    >
      <div className="relative z-10 text-center md:text-left">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-1 text-sm font-medium text-[#5e9c6b] shadow-sm">
          <Sparkles className="h-4 w-4" /> For little nature explorers
        </p>
        <h1 className="font-display text-4xl leading-tight text-[#4a92ba] sm:text-5xl">
          Build the<br />Blue Nest
        </h1>
        <div className="my-4 flex items-center justify-center gap-2 text-[#cf7d9c] md:justify-start">
          <span className="h-px w-10 bg-[#d8cbbb]" />
          <Heart className="h-4 w-4 fill-current" />
          <span className="h-px w-10 bg-[#d8cbbb]" />
        </div>
        <p className="mx-auto max-w-sm text-lg text-[#6b5b52] md:mx-0">
          Can you help Blue Bird build a cosy nest?
        </p>
        <button
          onClick={onStart}
          className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#5aa9d4] px-8 py-4 font-display text-2xl text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-[#4a92ba] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#9bd4ec]"
        >
          Let’s Build! <ArrowRight className="h-6 w-6" />
        </button>
      </div>

      <div className="relative z-10 flex items-end justify-center">
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="relative"
        >
          <Bird className="h-44 w-44 sm:h-56 sm:w-56" />
        </motion.div>
        <EmptyNest className="absolute -bottom-2 left-1/2 h-28 w-44 -translate-x-1/2 sm:h-32 sm:w-56" />
      </div>
    </motion.div>
  );
}

/* ── In-game building screen ─────────────────────────────────────────────── */
function Play({
  placed,
  isPlaced,
  overNest,
  draggingId,
  justPlaced,
  lastPraise,
  nestRef,
  startDrag,
  onReset,
  muted,
  onToggleMute,
}: {
  placed: ItemId[];
  isPlaced: (id: ItemId) => boolean;
  overNest: boolean;
  draggingId: ItemId | null;
  justPlaced: ItemId | null;
  lastPraise: string | null;
  nestRef: React.RefObject<HTMLDivElement>;
  startDrag: (e: React.PointerEvent, id: ItemId) => void;
  onReset: () => void;
  muted: boolean;
  onToggleMute: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative px-4 py-6 sm:px-8 sm:py-8"
    >
      {/* Top bar: progress + controls */}
      <div className="relative z-10 mb-4 flex items-center justify-between gap-3">
        <Progress count={placed.length} />
        <div className="flex items-center gap-2">
          <IconButton onClick={onToggleMute} label={muted ? "Turn sound on" : "Turn sound off"}>
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </IconButton>
          <IconButton onClick={onReset} label="Start again">
            <RotateCcw className="h-5 w-5" />
            <span className="ml-1 hidden font-medium sm:inline">Reset</span>
          </IconButton>
        </div>
      </div>

      {/* Bird + nest */}
      <div className="relative z-10 flex items-end justify-center gap-1 sm:gap-4">
        <div className="relative shrink-0 self-center">
          <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
            <Bird happy={placed.length > 0} className="h-24 w-24 sm:h-36 sm:w-36" />
          </motion.div>
          <AnimatePresence>
            {justPlaced && (
              <motion.div
                initial={{ opacity: 0, scale: 0.4, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.4 }}
                className="absolute -right-1 -top-2 rounded-full bg-white px-2 py-2 shadow-md"
              >
                <Heart className="h-5 w-5 fill-[#f4aac8] text-[#f4aac8]" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* The nest — the drop target */}
        <div
          ref={nestRef}
          className={`relative h-44 w-72 transition-transform sm:h-56 sm:w-96 ${overNest ? "scale-[1.03]" : ""}`}
        >
          <NestBowl active={overNest} />

          {/* Placed items rest inside the bowl */}
          {ITEMS.map((item) => {
            if (!isPlaced(item.id)) return null;
            const Art = ITEM_ART[item.id];
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.2, y: -40, rotate: 0 }}
                animate={{ opacity: 1, scale: item.spot.scale, y: 0, rotate: item.spot.rotate }}
                transition={{ type: "spring", stiffness: 320, damping: 18 }}
                className="absolute h-16 w-16 sm:h-20 sm:w-20"
                style={{ left: item.spot.left, top: item.spot.top, zIndex: item.spot.z, transform: "translate(-50%, -50%)" }}
              >
                <Art className="h-full w-full drop-shadow-sm" />
              </motion.div>
            );
          })}

          {/* Sparkle pop on each placement */}
          <AnimatePresence>{justPlaced && <Sparkle key={justPlaced} />}</AnimatePresence>
        </div>
      </div>

      {/* Instruction / praise ribbon */}
      <div className="relative z-10 mx-auto mt-5 max-w-md">
        <AnimatePresence mode="wait">
          <motion.div
            key={lastPraise ?? "instruction"}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="rounded-full bg-white/85 px-5 py-2.5 text-center text-base font-medium text-[#6b5b52] shadow-sm sm:text-lg"
          >
            {lastPraise ?? "Drag the natural items into the nest"}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Draggable item tray */}
      <div className="relative z-10 mt-6 grid grid-cols-5 gap-2 sm:gap-4">
        {ITEMS.map((item) => {
          const Art = ITEM_ART[item.id];
          const done = isPlaced(item.id);
          const dragging = draggingId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              disabled={done}
              onPointerDown={(e) => startDrag(e, item.id)}
              aria-label={done ? `${item.label} placed` : `Add ${item.label} to the nest`}
              style={{ touchAction: "none" }}
              className={`group flex flex-col items-center gap-1.5 rounded-2xl border bg-white/85 p-2 shadow-sm transition-all sm:p-3
                ${done ? "border-[#cfe6d4] opacity-45" : "border-[#e6ddcd] hover:-translate-y-1 hover:border-[#bfe0c7] hover:shadow-md active:scale-95 cursor-grab"}
                ${dragging ? "opacity-30" : ""}
                focus:outline-none focus-visible:ring-4 focus-visible:ring-[#bfe0c7]`}
            >
              <span className="flex h-10 w-10 items-center justify-center sm:h-14 sm:w-14">
                <Art className="h-full w-full pointer-events-none" />
              </span>
              <span className="text-[0.62rem] font-semibold text-[#6b5b52] sm:text-sm">{item.label}</span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ── Completion screen ───────────────────────────────────────────────────── */
function Done({ onReplay }: { onReplay: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative grid items-center gap-6 px-6 py-12 sm:px-12 sm:py-16 md:grid-cols-2"
    >
      <Confetti />
      <div className="relative z-10 order-2 text-center md:order-1 md:text-left">
        <h2 className="font-display text-3xl leading-tight text-[#4a92ba] sm:text-4xl">
          Well done!<br />You built a beautiful Blue Nest!
        </h2>
        <div className="my-4 flex items-center justify-center gap-2 text-[#cf7d9c] md:justify-start">
          <span className="h-px w-10 bg-[#d8cbbb]" />
          <Heart className="h-4 w-4 fill-current" />
          <span className="h-px w-10 bg-[#d8cbbb]" />
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 md:justify-start">
          <button
            onClick={onReplay}
            className="inline-flex items-center gap-2 rounded-full bg-[#5aa9d4] px-6 py-3 font-display text-xl text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-[#4a92ba] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#9bd4ec]"
          >
            <RotateCcw className="h-5 w-5" /> Play Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border-2 border-[#cfe0d2] bg-white/80 px-6 py-3 font-display text-xl text-[#5e9c6b] transition-all hover:-translate-y-0.5 hover:bg-white focus:outline-none focus-visible:ring-4 focus-visible:ring-[#bfe0c7]"
          >
            <Home className="h-5 w-5" /> Back to Home
          </Link>
        </div>
      </div>

      <div className="relative z-10 order-1 flex items-end justify-center md:order-2">
        <motion.div
          animate={{ rotate: [-3, 3, -3] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <Bird happy className="h-36 w-36 sm:h-44 sm:w-44" />
        </motion.div>
        <FullNest className="absolute -bottom-2 left-1/2 h-28 w-48 -translate-x-1/2 sm:h-32 sm:w-60" />
      </div>
    </motion.div>
  );
}

/* ── Small UI pieces ─────────────────────────────────────────────────────── */
function Progress({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 shadow-sm">
      <span className="text-sm font-semibold text-[#6b5b52] sm:text-base">Progress</span>
      <div className="flex items-center gap-1.5">
        {ITEMS.map((_, i) => (
          <motion.span
            key={i}
            animate={{ scale: i < count ? [1, 1.4, 1] : 1 }}
            transition={{ duration: 0.4 }}
            className={`h-3.5 w-3.5 rounded-full border-2 sm:h-4 sm:w-4 ${
              i < count ? "border-[#4a92ba] bg-[#5aa9d4]" : "border-[#cdc0ad] bg-transparent"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function IconButton({ children, onClick, label }: { children: React.ReactNode; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex items-center rounded-full border border-[#e6ddcd] bg-white/80 px-3 py-2 text-[#6b5b52] shadow-sm transition-all hover:-translate-y-0.5 hover:bg-white focus:outline-none focus-visible:ring-4 focus-visible:ring-[#bfe0c7]"
    >
      {children}
    </button>
  );
}

function Sparkle() {
  const bits = Array.from({ length: 8 });
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
      {bits.map((_, i) => {
        const angle = (i / bits.length) * Math.PI * 2;
        return (
          <motion.span
            key={i}
            initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
            animate={{ opacity: [1, 0], x: Math.cos(angle) * 70, y: Math.sin(angle) * 50, scale: [0.4, 1] }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="absolute h-2.5 w-2.5 rounded-full"
            style={{ background: ["#f7d774", "#f4aac8", "#8ecb9b", "#9bd4ec"][i % 4] }}
          />
        );
      })}
    </div>
  );
}

function Confetti() {
  const bits = Array.from({ length: 24 });
  const colors = ["#f7d774", "#f4aac8", "#8ecb9b", "#9bd4ec", "#cf7d9c"];
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {bits.map((_, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: [0, 1, 0], y: 260 }}
          transition={{ duration: 2 + (i % 5) * 0.3, repeat: Infinity, delay: (i % 8) * 0.2, ease: "easeIn" }}
          className="absolute h-2.5 w-2.5 rounded-sm"
          style={{ left: `${(i * 37) % 100}%`, background: colors[i % colors.length], rotate: `${i * 30}deg` }}
        />
      ))}
    </div>
  );
}

/* ── Nest & foliage scenery (inline SVG) ─────────────────────────────────── */
function NestBowl({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 320 200" className="absolute inset-0 h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* branch */}
      <path d="M0 150C70 156 250 156 320 148" stroke="#a07a4f" strokeWidth="14" strokeLinecap="round" />
      <path d="M40 152c20 4 60 4 80 2" stroke="#8a6740" strokeWidth="4" strokeLinecap="round" opacity="0.5" />
      {/* bowl back */}
      <ellipse cx="160" cy="92" rx="120" ry="58" fill="#b98f5c" />
      <ellipse cx="160" cy="86" rx="96" ry="42" fill="#8f6d44" />
      {/* woven front */}
      <path d="M40 92c0 56 54 92 120 92s120-36 120-92c0 40-54 70-120 70S40 132 40 92Z" fill="#a87f50" />
      <g stroke="#7d5e3a" strokeWidth="3" strokeLinecap="round" opacity="0.55">
        <path d="M56 104c30 26 70 40 104 40s74-14 104-40" />
        <path d="M50 120c34 30 76 44 110 44s76-14 110-44" />
        <path d="M64 138c28 22 62 32 96 32s68-10 96-32" />
      </g>
      <g stroke="#c79c66" strokeWidth="2.5" strokeLinecap="round" opacity="0.7">
        <path d="M70 96l40 24M120 92l36 28M180 92l34 26M236 96l34 22" />
      </g>
      {active && <ellipse cx="160" cy="86" rx="100" ry="44" fill="#f7d774" opacity="0.18" />}
    </svg>
  );
}

function EmptyNest({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 140" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="120" cy="70" rx="100" ry="44" fill="#b98f5c" />
      <ellipse cx="120" cy="62" rx="78" ry="30" fill="#8f6d44" />
      <path d="M22 70c0 40 44 66 98 66s98-26 98-66c0 30-44 50-98 50S22 100 22 70Z" fill="#a87f50" />
      <g stroke="#7d5e3a" strokeWidth="3" strokeLinecap="round" opacity="0.5">
        <path d="M40 80c24 20 52 30 80 30s56-10 80-30" />
        <path d="M48 96c26 22 56 32 72 32" />
      </g>
    </svg>
  );
}

function FullNest({ className }: { className?: string }) {
  return (
    <div className={`relative ${className ?? ""}`}>
      <EmptyNest className="absolute inset-0 h-full w-full" />
      <span className="absolute left-[34%] top-[26%] h-7 w-7">{<ITEM_ART.leaves className="h-full w-full" />}</span>
      <span className="absolute left-[54%] top-[24%] h-8 w-8 rotate-12">{<ITEM_ART.feathers className="h-full w-full" />}</span>
      <span className="absolute left-[44%] top-[38%] h-7 w-7">{<ITEM_ART.flowers className="h-full w-full" />}</span>
      <span className="absolute left-[24%] top-[36%] h-7 w-7 -rotate-6">{<ITEM_ART.twigs className="h-full w-full" />}</span>
    </div>
  );
}

/** Decorative leafy corners — purely atmospheric, hidden from screen readers. */
function Foliage() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <svg className="absolute -left-6 -top-6 h-40 w-40 opacity-70" viewBox="0 0 160 160" fill="none">
        <path d="M0 0c40 6 70 30 86 70" stroke="#7d5e3a" strokeWidth="8" strokeLinecap="round" />
        <g fill="#8ecb9b">
          <ellipse cx="44" cy="30" rx="20" ry="11" transform="rotate(-20 44 30)" />
          <ellipse cx="76" cy="52" rx="20" ry="11" transform="rotate(10 76 52)" />
          <ellipse cx="30" cy="58" rx="18" ry="10" transform="rotate(40 30 58)" />
        </g>
      </svg>
      <svg className="absolute -right-6 -top-6 h-40 w-40 -scale-x-100 opacity-70" viewBox="0 0 160 160" fill="none">
        <path d="M0 0c40 6 70 30 86 70" stroke="#7d5e3a" strokeWidth="8" strokeLinecap="round" />
        <g fill="#9fc6a8">
          <ellipse cx="44" cy="30" rx="20" ry="11" transform="rotate(-20 44 30)" />
          <ellipse cx="76" cy="52" rx="20" ry="11" transform="rotate(10 76 52)" />
          <ellipse cx="30" cy="58" rx="18" ry="10" transform="rotate(40 30 58)" />
        </g>
      </svg>
      <Flower className="absolute bottom-4 left-4 h-10 w-10 opacity-80" />
      <Flower className="absolute bottom-6 right-6 h-8 w-8 opacity-70" />
    </div>
  );
}
