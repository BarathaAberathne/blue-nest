"use client";

/**
 * Celebration screen. Accessible modal dialog (focus moved in, Escape replays),
 * gentle confetti, the awarded "Garden Explorer" badge, and persisted
 * achievement stats.
 */
import { useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { RotateCcw, Home } from "lucide-react";
import { BirdIcon, BadgeIcon, PlantFull } from "./icons";
import type { GardenSave, PlantDef } from "./types";

interface CompletionModalProps {
  plant: PlantDef;
  save: GardenSave;
  reduce: boolean;
  onPlayAgain: () => void;
}

export function CompletionModal({ plant, save, reduce, onPlayAgain }: CompletionModalProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

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
      aria-labelledby="garden-complete-title"
      className="absolute inset-0 z-30 flex items-center justify-center rounded-[24px] bg-[#2F5D9F]/30 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {!reduce && <Confetti />}

      <motion.div
        className="relative w-full max-w-md rounded-[24px] border border-white/70 bg-[#FAF8F4] p-6 text-center shadow-[0_24px_60px_-24px_rgba(47,93,159,0.6)] sm:p-8"
        initial={{ scale: 0.85, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
      >
        <div className="mb-2 flex items-end justify-center gap-1">
          <motion.div
            className="h-20 w-20"
            animate={reduce ? undefined : { rotate: [-4, 4, -4] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <BirdIcon className="h-full w-full" />
          </motion.div>
          <div className="h-20 w-16">
            <PlantFull id={plant.id} className="h-full w-full" />
          </div>
        </div>

        <h2
          id="garden-complete-title"
          ref={headingRef}
          tabIndex={-1}
          className="font-display text-3xl text-[#2F5D9F] outline-none sm:text-4xl"
        >
          🎉 Congratulations!
        </h2>
        <p className="mx-auto mt-2 max-w-xs text-[#6B5B52]">
          You helped your {plant.name.toLowerCase()} grow. You are a true Garden Explorer!
        </p>

        {/* Garden Explorer badge */}
        <motion.div
          className="mx-auto mt-4 flex w-fit items-center gap-3 rounded-[24px] border border-[#E3EAD9] bg-[#F2F6EC] px-5 py-3"
          initial={{ scale: 0, rotate: -12 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 240 }}
        >
          <BadgeIcon className="h-12 w-10" />
          <div className="text-left">
            <p className="font-display text-lg leading-tight text-[#2F5D9F]">Garden Explorer Badge</p>
            <p className="text-xs font-semibold text-[#6F8E6C]">
              {save.gardensGrown} garden{save.gardensGrown === 1 ? "" : "s"} grown · {save.plantsGrown.length}/4 plants
            </p>
          </div>
        </motion.div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={onPlayAgain}
            className="inline-flex items-center gap-2 rounded-[24px] bg-[#4A90E2] px-6 py-3 font-display text-lg text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-[#3A7BC8] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#4A90E2]/50"
          >
            <RotateCcw className="h-5 w-5" /> Play Again
          </button>
          <Link
            href="/play-area"
            className="inline-flex items-center gap-2 rounded-[24px] border-2 border-[#A9C5B0] bg-white px-6 py-3 font-display text-lg text-[#6F8E6C] transition-all hover:-translate-y-0.5 hover:bg-[#EEF4EF] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#A9C5B0]/60"
          >
            <Home className="h-5 w-5" /> Back to Games
          </Link>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Confetti() {
  const colors = ["#4A90E2", "#A9C5B0", "#F4C84B", "#E8A0B8", "#6F8E6C"];
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
