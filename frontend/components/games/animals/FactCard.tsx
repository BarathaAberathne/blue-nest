"use client";

/**
 * "Did you know?" / instruction card. The message animates whenever it changes
 * and is announced politely to screen readers. Shows the relevant animal icon
 * when a fact is being celebrated.
 */
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { AnimalIcon } from "./icons";
import type { AnimalId } from "./types";

interface FactCardProps {
  eyebrow: string;
  message: string;
  animal: AnimalId | null;
  reduce: boolean;
}

export function FactCard({ eyebrow, message, animal, reduce }: FactCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-[24px] border border-[#E3EAD9] bg-[#F2F6EC] p-4 shadow-sm sm:p-5">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white sm:h-14 sm:w-14">
        {animal ? <AnimalIcon id={animal} className="h-9 w-9 sm:h-11 sm:w-11" /> : <Sparkles className="h-6 w-6 text-[#6F8E6C]" aria-hidden="true" />}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-[#6F8E6C]">{eyebrow}</p>
        <AnimatePresence mode="wait">
          <motion.p
            key={message}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
            className="mt-0.5 text-base leading-snug text-[#3A4A3A] sm:text-lg"
            role="status"
            aria-live="polite"
          >
            {message}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
