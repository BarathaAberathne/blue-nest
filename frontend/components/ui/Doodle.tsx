"use client";

import Image from "next/image";
import { clsx } from "clsx";
import { motion } from "framer-motion";

// ── Approved doodle assets ────────────────────────────────────────────────────

const doodleMap = {
  "blue-bird":   "/doodles/blue-bird.png",
  "pink-bird":   "/doodles/pink-bird.png",
  "blue-flower": "/doodles/blue-flower.png",
  "pink-flower": "/doodles/pink-flower.png",
  "leaf":        "/doodles/leaf.png",
} as const;

export type DoodleKind = keyof typeof doodleMap;

// ── Animation variants ─────────────────────────────────────────────────────────

const animationVariants = {
  float: {
    initial: { y: 0 },
    animate: { y: [-6, 6, -6] as any },
    transition: { duration: 4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" },
  },
  wiggle: {
    initial: { rotate: 0 },
    animate: { rotate: [-3, 3, -3, 3, 0] as any },
    transition: { duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" },
  },
  pulse: {
    initial: { scale: 1, opacity: 0.7 },
    animate: { scale: [1, 1.08, 1] as any, opacity: [0.7, 1, 0.7] as any },
    transition: { duration: 2.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" },
  },
  subtle: {
    initial: { y: 0, rotate: 0 },
    animate: { y: [-4, 4, -4] as any, rotate: [-2, 2, -2, 2, 0] as any },
    transition: { duration: 5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" },
  },
} as const;

type AnimationVariant = keyof typeof animationVariants;

// ── Helpers ───────────────────────────────────────────────────────────────────

// Returns "absolute" when className contains positional Tailwind utilities,
// "relative" otherwise so next/image fill always has a valid containing block.
function resolvePosition(className: string | undefined): string {
  if (/\b(top-|bottom-|left-|right-|inset-)/.test(className ?? "")) return "absolute";
  return "relative";
}

function getAnimationVariant(animated: AnimationVariant | boolean | undefined): AnimationVariant | null {
  if (animated === false || animated === undefined) return null;
  if (animated === true) return "float";
  return animated;
}

// ── Props ─────────────────────────────────────────────────────────────────────

type DoodleProps = {
  kind: DoodleKind;
  className?: string;
  animated?: AnimationVariant | boolean;
  "aria-hidden"?: boolean;
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function Doodle({ kind, className, animated, "aria-hidden": ariaHidden }: DoodleProps) {
  const src = doodleMap[kind];
  const posClass = resolvePosition(className);
  const baseClass = clsx(`pointer-events-none select-none ${posClass}`, className);
  const animVar = getAnimationVariant(animated);

  if (!animVar) {
    return (
      <div className={baseClass} aria-hidden={ariaHidden ?? true}>
        <Image src={src} alt="" fill className="object-contain" sizes="80px" priority={false} />
      </div>
    );
  }

  return (
    <motion.div
      aria-hidden={ariaHidden ?? true}
      className={clsx(baseClass, "origin-center")}
      initial={animationVariants[animVar].initial}
      animate={animationVariants[animVar].animate}
      transition={animationVariants[animVar].transition}
    >
      <Image src={src} alt="" fill className="object-contain" sizes="80px" priority={false} />
    </motion.div>
  );
}
