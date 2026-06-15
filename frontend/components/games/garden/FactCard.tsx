"use client";

/**
 * "Did you know?" / encouragement card. The message animates in whenever it
 * changes and is announced politely to screen readers.
 */
import { motion, AnimatePresence } from "framer-motion";
import { Sprout } from "lucide-react";

interface FactCardProps {
  /** Heading, e.g. "Did you know?" or "Step 2". */
  eyebrow: string;
  message: string;
  reduce: boolean;
}

export function FactCard({ eyebrow, message, reduce }: FactCardProps) {
  return (
    <div className="rounded-[24px] border border-[#E3EAD9] bg-[#F2F6EC] p-4 shadow-sm sm:p-5">
      <p className="flex items-center gap-2 text-sm font-bold text-[#6F8E6C]">
        <Sprout className="h-4 w-4" aria-hidden="true" />
        {eyebrow}
      </p>
      <AnimatePresence mode="wait">
        <motion.p
          key={message}
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -6 }}
          transition={{ duration: 0.3 }}
          className="mt-1.5 text-lg leading-snug text-[#3A4A3A]"
          role="status"
          aria-live="polite"
        >
          {message}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
