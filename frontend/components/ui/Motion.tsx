"use client";

import { motion } from "framer-motion";
import { clsx } from "clsx";
import type { ReactNode } from "react";

type SharedProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

type RevealProps = SharedProps & {
  // `eager` is for above-the-fold hero content. It animates on mount with a
  // transform-only entrance (no opacity:0), so the element is painted
  // immediately in the SSR HTML and Lighthouse can record it as the LCP at
  // first paint. The default (scroll-triggered, fades from opacity:0) is for
  // below-the-fold content and must NOT be used on the LCP element — it
  // delays LCP until hydration + the IntersectionObserver fires.
  eager?: boolean;
  // IntersectionObserver threshold for the scroll-triggered reveal. Defaults to
  // 0.2 (20% of the element visible). For a block that can be TALLER than the
  // viewport — e.g. a multi-row gallery — pass "some" so the reveal still fires
  // when only part of it is on screen. With a fraction like 0.2, a tall element
  // (24-tile gallery ≈ 5000px → needs ~1000px visible) can never satisfy the
  // threshold in a short landscape viewport, leaving it stuck at opacity:0.
  amount?: number | "some" | "all";
};

export function Reveal({ children, className, delay = 0, eager = false, amount = 0.2 }: RevealProps) {
  if (eager) {
    return (
      <motion.div
        className={clsx(className)}
        initial={{ y: 12 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, delay, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    );
  }
  return (
    <motion.div
      className={clsx(className)}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

export function Float({ children, className, delay = 0 }: SharedProps) {
  return (
    <motion.div
      className={clsx(className)}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: [0, -10, 0] }}
      transition={{
        opacity: { duration: 0.45, delay },
        y: { duration: 5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay },
      }}
    >
      {children}
    </motion.div>
  );
}
