"use client";

/**
 * Gentle, nature-inspired sounds via the Web Audio API — no audio files. Every
 * call is guarded; the game is fully playable with sound unsupported or muted.
 */
import { useCallback, useRef } from "react";

export function useChime(muted: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);

  const ctx = useCallback(() => {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const c = ctxRef.current ?? new AC();
    ctxRef.current = c;
    if (c.state === "suspended") void c.resume();
    return c;
  }, []);

  const tones = useCallback(
    (notes: number[], gap: number, type: OscillatorType = "sine", volume = 0.12) => {
      if (muted) return;
      try {
        const c = ctx();
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
          gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.5);
          osc.start(t);
          osc.stop(t + 0.55);
        });
      } catch {
        /* audio unsupported */
      }
    },
    [ctx, muted],
  );

  /** Soft confirmation when a seed is planted. */
  const plant = useCallback(() => tones([392, 523.25], 0.08), [tones]);
  /** A gentle "pouring" shimmer for watering (filtered noise). */
  const water = useCallback(() => {
    if (muted) return;
    try {
      const c = ctx();
      const now = c.currentTime;
      const dur = 0.7;
      const buffer = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
      const ch = buffer.getChannelData(0);
      for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length);
      const src = c.createBufferSource();
      src.buffer = buffer;
      const filter = c.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 1400;
      filter.Q.value = 0.8;
      const gain = c.createGain();
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + dur);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(c.destination);
      src.start(now);
      src.stop(now + dur);
    } catch {
      /* audio unsupported */
    }
  }, [ctx, muted]);
  /** Warm rising tone for sunshine. */
  const sun = useCallback(() => tones([523.25, 659.25, 783.99], 0.1), [tones]);
  /** A little chirp as the plant grows. */
  const grow = useCallback(() => tones([659.25, 880], 0.09), [tones]);
  /** Cheerful fanfare on completion. */
  const celebrate = useCallback(() => tones([523.25, 659.25, 783.99, 1046.5, 1318.5], 0.11), [tones]);

  return { plant, water, sun, grow, celebrate };
}
