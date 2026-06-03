"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useOrientationReflow } from "@/lib/use-orientation-reflow";

export type SlideImage = { src: string; alt: string };

type CardImageSliderProps = {
  images: SlideImage[];
  /** Passed straight to next/image — keep identical to the previous static image. */
  sizes: string;
  /** Classes applied to every slide <Image> (e.g. object-cover + group-hover scale). */
  imageClassName?: string;
  /** Auto-advance interval in ms. */
  interval?: number;
  /** Pastel accent for the dot indicators. */
  dotColor?: string;
  /** Accessible label for the carousel region. */
  label?: string;
};

/**
 * A minimal, dependency-free cross-fade slider that slots into an existing
 * card image area. It fills its (already sized + rounded + overflow-hidden)
 * parent via `absolute inset-0`, so it introduces no layout shift and leaves
 * the card geometry untouched. Falls back to a single static image when only
 * one slide is supplied.
 */
export default function CardImageSlider({
  images,
  sizes,
  imageClassName = "",
  interval = 4500,
  dotColor = "#ffffff",
  label = "Image gallery",
}: CardImageSliderProps) {
  const [index, setIndex] = useState(0);
  const pausedRef = useRef(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  // True for the moment between a swipe finishing and the synthetic click it
  // produces — lets us swallow that click so a swipe never navigates the
  // parent <Link> on branch cards.
  const swipedRef = useRef(false);

  const count = images.length;
  const go = useCallback(
    (next: number) => setIndex((next + count) % count),
    [count],
  );

  // Re-trigger lazy images across the page after an orientation change
  // (iPad/Safari). No ref needed — the global scroll nudge covers the home-page
  // gallery surfaces (card sliders + preview strip).
  useOrientationReflow();

  // Auto-advance — paused on hover/focus, when the tab is hidden, or when the
  // user prefers reduced motion. Effect only runs client-side, and the first
  // render always shows slide 0, so SSR and hydration stay in sync.
  useEffect(() => {
    if (count <= 1) return;
    if (typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const id = window.setInterval(() => {
      if (!pausedRef.current && !document.hidden) {
        setIndex((i) => (i + 1) % count);
      }
    }, interval);
    return () => window.clearInterval(id);
  }, [count, interval]);

  // Single image: render exactly as the card did before — no slider chrome.
  if (count <= 1) {
    const only = images[0];
    return (
      <Image src={only.src} alt={only.alt} fill className={imageClassName} sizes={sizes} />
    );
  }

  return (
    <div
      className="absolute inset-0"
      role="group"
      aria-roledescription="carousel"
      aria-label={label}
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
      onFocusCapture={() => { pausedRef.current = true; }}
      onBlurCapture={() => { pausedRef.current = false; }}
      onTouchStart={(e) => {
        const t = e.touches[0];
        touchStart.current = { x: t.clientX, y: t.clientY };
        // Start every gesture clean. A swipe often produces no trailing click
        // (the browser suppresses it), so we can't rely on the click to clear
        // the flag — resetting here guarantees a stale swipe never swallows a
        // later genuine tap.
        swipedRef.current = false;
      }}
      onTouchEnd={(e) => {
        const start = touchStart.current;
        touchStart.current = null;
        if (!start) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - start.x;
        const dy = t.clientY - start.y;
        // Only act on a deliberate, mostly-horizontal swipe — vertical scrolls
        // (where |dy| dominates) must never flip the slide.
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
          swipedRef.current = true;
          go(index + (dx < 0 ? 1 : -1));
        }
      }}
      onClickCapture={(e) => {
        // Swallow the click a swipe synthesises so the parent <Link> on branch
        // cards doesn't navigate when the user only meant to change slides.
        if (swipedRef.current) {
          e.preventDefault();
          e.stopPropagation();
          swipedRef.current = false;
        }
      }}
    >
      {images.map((img, i) => (
        // Wrapper owns the slider's premium cross-dissolve (slow eased fade +
        // a subtle settle-zoom). Keeping that transform here — not on the
        // <Image> — lets the card's own `group-hover:scale-105` compose with
        // it instead of fighting over the same transform.
        <div
          key={img.src}
          aria-hidden={i !== index}
          className={`absolute inset-0 will-change-[opacity,transform] ${
            i === index
              ? "z-[1] opacity-100 motion-safe:scale-100"
              : "z-0 opacity-0 motion-safe:scale-[1.06]"
          }`}
          style={{
            transition:
              "opacity 1100ms cubic-bezier(0.4, 0, 0.2, 1), transform 1600ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <Image src={img.src} alt={img.alt} fill className={imageClassName} sizes={sizes} />
        </div>
      ))}

      {/* Dot indicators — subtle, pastel, bottom-centred. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-2.5 z-10 flex justify-center gap-1.5">
        {images.map((img, i) => (
          <button
            key={img.src}
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); go(i); }}
            aria-label={`Show image ${i + 1} of ${count}`}
            aria-current={i === index}
            className="pointer-events-auto h-1.5 rounded-full shadow-[0_1px_3px_rgba(90,74,66,0.35)] transition-all duration-300"
            style={{
              width: i === index ? "0.85rem" : "0.375rem",
              backgroundColor: dotColor,
              opacity: i === index ? 0.95 : 0.55,
            }}
          />
        ))}
      </div>
    </div>
  );
}
