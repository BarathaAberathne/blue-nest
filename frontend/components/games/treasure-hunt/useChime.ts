"use client";

/**
 * Gentle, nature-inspired sound via the Web Audio API — no audio files, so
 * nothing to download and nothing to fail. Every call is guarded; the game is
 * fully playable with sound unsupported or muted.
 */
import { useCallback, useRef } from "react";

export function useChime(muted: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);

  const tone = useCallback(
    (notes: number[], gap: number, type: OscillatorType = "sine", volume = 0.12) => {
      if (muted) return;
      try {
        const AC =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = ctxRef.current ?? new AC();
        ctxRef.current = ctx;
        if (ctx.state === "suspended") void ctx.resume();
        const now = ctx.currentTime;
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = type;
          osc.frequency.value = freq;
          osc.connect(gain);
          gain.connect(ctx.destination);
          const t = now + i * gap;
          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(volume, t + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.5);
          osc.start(t);
          osc.stop(t + 0.55);
        });
      } catch {
        /* audio unsupported — silently continue */
      }
    },
    [muted],
  );

  /** Soft woodland sparkle when a treasure is found. */
  const found = useCallback(() => tone([659.25, 880, 1174.66], 0.07), [tone]); // E–A–D
  /** Cheerful little chirp/fanfare on completion. */
  const celebrate = useCallback(
    () => tone([523.25, 659.25, 783.99, 1046.5, 1318.5], 0.11),
    [tone],
  );

  return { found, celebrate };
}
