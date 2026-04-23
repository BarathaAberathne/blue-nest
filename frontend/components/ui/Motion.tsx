"use client";

import { motion } from "framer-motion";
import { clsx } from "clsx";
import type { ReactNode } from "react";

type SharedProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

export function Reveal({ children, className, delay = 0 }: SharedProps) {
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
