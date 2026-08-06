"use client";

import { useEffect, useState } from "react";
import type { RefObject } from "react";
import { cn } from "@/lib/utils";

export interface BeatPulseTiming {
  /** `performance.now()`-Zeitpunkt des ersten Einzählschlags. */
  startMs: number;
  /** Puls-Schlagdauer in ms (bei x/8: punktierte Viertel). */
  beatMs: number;
  beatsPerBar: number;
  /** Nach diesem Zeitpunkt stoppt der Puls (Figurende). */
  endMs: number;
}

interface BeatPulseProps {
  /**
   * Timing kommt per Ref statt Props: der Spiel-Parent rendert während des
   * Tippens bewusst nicht neu (Zero-Re-Render-Tap-Pfad) — dieser Baustein
   * treibt sich selbst über rAF und pollt das Ref, bis Daten da sind.
   */
  timingRef: RefObject<BeatPulseTiming | null>;
}

/**
 * Puls-Anzeige für Einzählen + Spielen: eine Reihe Punkte (einer je Schlag im
 * Takt), der aktive Punkt pulst pro Schlag. `prefers-reduced-motion`:
 * statisches Hervorheben statt Skalierung (Tailwind `motion-reduce`).
 */
export function BeatPulse({ timingRef }: BeatPulseProps) {
  const [beatsPerBar, setBeatsPerBar] = useState<number | null>(null);
  const [activeIdx, setActiveIdx] = useState(-1);

  useEffect(() => {
    let raf = 0;
    let lastIdx = -1;
    let lastBeats: number | null = null;

    const tick = () => {
      const timing = timingRef.current;
      if (!timing) {
        raf = requestAnimationFrame(tick);
        return;
      }
      if (lastBeats !== timing.beatsPerBar) {
        lastBeats = timing.beatsPerBar;
        setBeatsPerBar(timing.beatsPerBar);
      }
      const now = performance.now();
      if (now >= timing.endMs + timing.beatMs) {
        // Figur vorbei — letzter Zustand bleibt stehen, kein weiterer Puls.
        return;
      }
      const idx =
        now < timing.startMs
          ? -1
          : Math.floor((now - timing.startMs) / timing.beatMs) %
            timing.beatsPerBar;
      if (idx !== lastIdx) {
        lastIdx = idx;
        setActiveIdx(idx);
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [timingRef]);

  if (beatsPerBar === null) return null;

  return (
    <div
      className="flex items-center justify-center gap-2 py-1"
      aria-hidden="true"
    >
      {Array.from({ length: beatsPerBar }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-2.5 w-2.5 rounded-full transition-transform duration-100 md:h-3 md:w-3",
            i === activeIdx
              ? "bg-primary scale-125 motion-reduce:scale-100"
              : "bg-dark-border/30 dark:bg-dark-border scale-100",
          )}
        />
      ))}
    </div>
  );
}
