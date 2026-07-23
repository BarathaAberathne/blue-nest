"use client";

import { useEffect, useRef } from "react";

// Re-fires `callback` on a fixed interval and immediately on tab focus/
// visibility — the two triggers that cause "stale until F5" in practice (e.g.
// a kiosk clock-in on another device while this tab sits open).
// - Paused while the tab is hidden.
// - An in-flight guard prevents overlapping calls and naturally coalesces
//   focus + visibilitychange firing back-to-back on the same tab-switch.
// - The callback is held in a ref so callers don't need to useCallback-wrap it
//   or worry about stale closures.
export function useAutoRefresh(callback: () => void | Promise<void>, intervalMs: number) {
  const cbRef = useRef(callback);
  useEffect(() => { cbRef.current = callback; });
  const runningRef = useRef(false);

  useEffect(() => {
    const fire = async () => {
      if (document.visibilityState !== "visible" || runningRef.current) return;
      runningRef.current = true;
      try {
        await cbRef.current();
      } finally {
        runningRef.current = false;
      }
    };
    const id = setInterval(fire, intervalMs);
    document.addEventListener("visibilitychange", fire);
    window.addEventListener("focus", fire);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", fire);
      window.removeEventListener("focus", fire);
    };
  }, [intervalMs]);
}
