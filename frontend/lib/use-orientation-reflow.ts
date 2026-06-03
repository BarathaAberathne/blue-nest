"use client";

import { useEffect, type RefObject } from "react";

/**
 * Defensive fix for a WebKit/Safari (iPad) bug where galleries fail to
 * re-layout after an orientation change:
 *
 *   1. CSS multi-column masonry (`column-fill: balance`) does not re-balance or
 *      repaint on rotation, leaving blank / clipped / overlapping tiles.
 *   2. Native `loading="lazy"` images that newly enter the viewport because of
 *      the rotation are not re-evaluated until the user scrolls.
 *
 * On `orientationchange` and `resize` (debounced to the next frame so the new
 * viewport has settled) we:
 *   • force a layout read on the gallery container — nudges Safari to recompute
 *     the multi-column flow (a read only; no style mutation, so it's invisible
 *     and never shifts content), and
 *   • dispatch a no-op scroll so the browser re-checks lazy images near the
 *     viewport. Images stay lazy — nothing is forced to load eagerly.
 *
 * Chrome already handles rotation correctly, so this is a no-op there and is
 * safe by construction: it adds listeners only, mutates no markup or styles.
 */
export function useOrientationReflow(ref?: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    let raf1 = 0;
    let raf2 = 0;

    const refresh = () => {
      // Double rAF: wait for the post-rotation layout to settle before nudging.
      raf1 = window.requestAnimationFrame(() => {
        raf2 = window.requestAnimationFrame(() => {
          // 1. Force the gallery container to recompute its layout (esp. the
          //    multi-column masonry). Reading layout is enough to flush it.
          const el = ref?.current;
          if (el) void el.offsetHeight;

          // 2. Re-trigger native lazy-loading without forcing eager loads.
          window.dispatchEvent(new Event("scroll"));
          window.scrollBy(0, 0);
        });
      });
    };

    window.addEventListener("orientationchange", refresh);
    window.addEventListener("resize", refresh);

    return () => {
      window.removeEventListener("orientationchange", refresh);
      window.removeEventListener("resize", refresh);
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
    };
  }, [ref]);
}
