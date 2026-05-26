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
};

export function Reveal({ children, className, delay = 0, eager = false }: RevealProps) {
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
      viewport={{ once: true, amount: 0.2 }}
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
