"use client";

/**
 * Gentle, nature-inspired sounds via the Web Audio API — no audio files. Every
 * call is guarded; the game is fully playable with sound unsupported or muted.
 */
import { useCallback, useRef } from "react";

export function useChime(muted: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);

  const tones = useCallback(
    (notes: number[], gap: number, type: OscillatorType = "sine", volume = 0.12) => {
      if (muted) return;
      try {
        const AC =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const c = ctxRef.current ?? new AC();
        ctxRef.current = c;
        if (c.state === "suspended") void c.resume();
        const now = c.currentTime;
        notes.forEach((freq, i) => {
          const osc = c.createOscillator();
          const gain = c.createGain();
          osc.type = type;
          osc.frequency.value = freq;
          osc.connect(gain);
          gain.connect(c.destination);
          const t = now + i * gap;
          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(volume, t + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.45);
          osc.start(t);
          osc.stop(t + 0.5);
        });
      } catch {
        /* audio unsupported */
      }
    },
    [muted],
  );

  /** Happy chirp on a correct match. */
  const match = useCallback(() => tones([659.25, 880, 1174.66], 0.07), [tones]);
  /** A soft, friendly "try again" note — warm, never harsh. */
  const nudge = useCallback(() => tones([392, 349.23], 0.12, "sine", 0.08), [tones]);
  /** Cheerful fanfare on completion. */
  const celebrate = useCallback(() => tones([523.25, 659.25, 783.99, 1046.5, 1318.5], 0.11), [tones]);

  return { match, nudge, celebrate };
}
