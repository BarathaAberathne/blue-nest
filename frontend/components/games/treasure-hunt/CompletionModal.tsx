"use client";

/**
 * Celebration screen shown when every treasure is found. Accessible modal
 * dialog (focus moved in on open, Escape replays), gentle confetti, plus the
 * parent-friendly score: time taken and a small star rating.
 */
import { useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { RotateCcw, Home } from "lucide-react";
import { TreasureIcon } from "./icons";
import type { GameResult } from "./types";

interface CompletionModalProps {
  result: GameResult;
  reduce: boolean;
  onPlayAgain: () => void;
}

function formatTime(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** A gentle 3-star rating from completion time (premium, encouraging). */
function starsFor(seconds: number): number {
  if (seconds <= 45) return 3;
  if (seconds <= 90) return 2;
  return 1;
}

export function CompletionModal({ result, reduce, onPlayAgain }: CompletionModalProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const stars = starsFor(result.seconds);

  useEffect(() => {
    headingRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onPlayAgain();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onPlayAgain]);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="th-complete-title"
      className="absolute inset-0 z-30 flex items-center justify-center rounded-[24px] bg-[#2F5D9F]/30 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {!reduce && <Confetti />}

      <motion.div
        className="relative w-full max-w-md rounded-[24px] border border-white/70 bg-[#FAF8F4] p-7 text-center shadow-[0_24px_60px_-24px_rgba(47,93,159,0.6)] sm:p-9"
        initial={{ scale: 0.85, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
      >
        <motion.div
          className="mx-auto mb-3 h-24 w-24"
          animate={reduce ? undefined : { rotate: [-4, 4, -4] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <TreasureIcon id="bird" className="h-full w-full" />
        </motion.div>

        <h2
          id="th-complete-title"
          ref={headingRef}
          tabIndex={-1}
          className="font-display text-3xl text-[#2F5D9F] outline-none sm:text-4xl"
        >
          🎉 Well Done!
        </h2>
        <p className="mx-auto mt-2 max-w-xs text-[#6B5B52]">
          You found all the Forest School treasures!
        </p>

        {/* Score: stars + time */}
        <div className="mt-4 flex items-center justify-center gap-1" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="text-2xl"
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.25 + i * 0.15, type: "spring", stiffness: 300 }}
              style={{ opacity: i < stars ? 1 : 0.25 }}
            >
              ⭐
            </motion.span>
          ))}
        </div>
        <p className="mt-2 text-sm font-semibold text-[#6F8E6C]">
          Found all {result.total} in {formatTime(result.seconds)}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={onPlayAgain}
            className="inline-flex items-center gap-2 rounded-[24px] bg-[#4A90E2] px-6 py-3 font-display text-lg text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-[#3A7BC8] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#4A90E2]/50"
          >
            <RotateCcw className="h-5 w-5" /> Play Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-[24px] border-2 border-[#A9C5B0] bg-white px-6 py-3 font-display text-lg text-[#6F8E6C] transition-all hover:-translate-y-0.5 hover:bg-[#EEF4EF] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#A9C5B0]/60"
          >
            <Home className="h-5 w-5" /> Return Home
          </Link>
        </div>
      </motion.div>
    </motion.div>
  );
}

/** Soft, slow confetti — celebratory but never overstimulating. */
function Confetti() {
  const colors = ["#4A90E2", "#A9C5B0", "#F0B040", "#E8A0B8", "#6F8E6C"];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[24px]" aria-hidden="true">
      {Array.from({ length: 26 }).map((_, i) => (
        <motion.span
          key={i}
          className="absolute h-2.5 w-2.5 rounded-[3px]"
          style={{ left: `${(i * 53) % 100}%`, background: colors[i % colors.length] }}
          initial={{ y: -30, opacity: 0, rotate: 0 }}
          animate={{ y: "120%", opacity: [0, 1, 1, 0], rotate: 360 }}
          transition={{ duration: 3 + (i % 5) * 0.5, repeat: Infinity, delay: (i % 9) * 0.25, ease: "easeIn" }}
        />
      ))}
    </div>
  );
}
