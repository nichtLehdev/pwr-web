"use client";

import { useEffect, useRef, useState } from "react";
import { Flame, Music2, Wind } from "lucide-react";
import { cn } from "@/lib/utils";
import { Toni, type ToniMood } from "../../../_components/toni";
import { pulseOf, secPerTick } from "../../../_lib/rhythm/ticks";
import type { Conductor, Segment } from "../_lib/conductor";
import { MAX_LIVES } from "../_lib/endless";
import type { JudgeEvent } from "../_lib/judge";

const REACTION_MS = 650;
const BOUNCE_PX = 7;

function reduceMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Sichtbares Metronom: wichtig für alle, die den Klick nicht gut hören. */
function BeatDots({ pulses, active }: { pulses: number; active: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-hidden>
      {Array.from({ length: pulses }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-3 w-3 rounded-full transition-transform duration-75",
            i === active
              ? "bg-primary-ink dark:bg-primary scale-[1.4] motion-reduce:scale-100"
              : "bg-ink/20 dark:bg-night-rule",
          )}
        />
      ))}
    </div>
  );
}

/** Tonis Puste: die Leben im Endlos-Spiel. */
function Breath({ lives }: { lives: number }) {
  return (
    <p className="mt-1 flex items-center gap-1" role="status">
      <span className="sr-only">Noch {lives} Puste</span>
      {Array.from({ length: MAX_LIVES }, (_, i) => (
        <Wind
          key={i}
          aria-hidden
          className={cn(
            "h-5 w-5 stroke-[2.5] transition-opacity",
            i < lives
              ? "text-primary-ink dark:text-primary spiel-pop"
              : "text-ink/20 dark:text-night-rule",
          )}
        />
      ))}
    </p>
  );
}

function reactionFor(
  event: JudgeEvent,
): { text: string; mood: ToniMood } | null {
  if (event.type === "extra") return { text: "Eine zu viel!", mood: "oops" };
  const { note } = event;
  if (event.type === "length") {
    if (note.length === "short")
      return { text: "Länger halten!", mood: "oops" };
    if (note.length === "long")
      return { text: "Früher loslassen!", mood: "oops" };
    return null;
  }
  const late = (note.deltaMs ?? 0) > 0;
  switch (note.verdict) {
    case "exact":
      return { text: "Genau!", mood: "happy" };
    case "close":
      return { text: late ? "Etwas spät" : "Etwas früh", mood: "happy" };
    case "off":
      return { text: late ? "Zu spät!" : "Zu früh!", mood: "oops" };
    case "missed":
      return { text: "Hoppla!", mood: "oops" };
    default:
      return null;
  }
}

/** Kopf der Bühne: Toni hüpft im Takt und kommentiert, daneben Punkte und Fortschritt. */
export function StageHud({
  conductor,
  baseText,
  baseMood,
  progressText,
  progress,
  lives,
}: {
  conductor: Conductor;
  baseText: string;
  baseMood: ToniMood;
  progressText: string;
  /** Anteil 0–1 der geschafften Runde; Endlos hat stattdessen Puste. */
  progress: number | null;
  lives?: number;
}) {
  const [reaction, setReaction] = useState<{
    id: number;
    text: string;
    mood: ToniMood;
  } | null>(null);
  const [score, setScore] = useState({ points: 0, multiplier: 1, streak: 0 });
  const [beat, setBeat] = useState({ pulses: 0, active: -1 });
  const toniRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let segment: Segment | null = null;
    let timer: number | null = null;
    let counter = 0;
    const still = reduceMotion();
    const unsubscribe = conductor.subscribe({
      onSegment: (next) => {
        segment = next;
      },
      onFrame: (songSec) => {
        if (!segment) return;
        const { pulseTicks, pulsesPerBar } = pulseOf(segment.timeSignature);
        const pulseSec = pulseTicks * secPerTick(segment.bpm);
        const position = (songSec - segment.startSec) / pulseSec;
        const active = Math.floor(position) % pulsesPerBar;
        setBeat((previous) =>
          previous.active === active && previous.pulses === pulsesPerBar
            ? previous
            : { pulses: pulsesPerBar, active },
        );
        if (toniRef.current && !still) {
          const hop = Math.abs(Math.sin(Math.PI * position)) * BOUNCE_PX;
          toniRef.current.style.transform = `translateY(${-hop}px)`;
        }
      },
      onJudge: (event) => {
        setScore({
          points: conductor.points,
          multiplier: conductor.multiplier,
          streak: conductor.judge.currentStreak,
        });
        const next = reactionFor(event);
        if (!next) return;
        setReaction({ id: ++counter, ...next });
        if (timer !== null) window.clearTimeout(timer);
        timer = window.setTimeout(() => setReaction(null), REACTION_MS);
      },
    });
    return () => {
      unsubscribe();
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [conductor]);

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <Toni
        ref={toniRef}
        mood={reaction?.mood ?? baseMood}
        className="h-[clamp(4rem,12svh,6.5rem)] w-[clamp(4rem,12svh,6.5rem)]"
      />
      <div className="min-w-0 flex-1">
        <p className="condensed text-ink dark:text-night-text min-h-[1.1em] text-[clamp(1.5rem,4.2svh,2.75rem)] leading-none font-extrabold">
          <span className="sr-only" aria-live="polite">
            {baseText}
          </span>
          <span
            key={reaction?.id ?? "base"}
            className={cn("inline-block", reaction && "spiel-pop")}
            aria-hidden
          >
            {reaction?.text ?? baseText}
          </span>
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <BeatDots pulses={beat.pulses} active={beat.active} />
          <span className="text-dark dark:text-night-muted text-xs font-bold tabular-nums">
            {progressText}
          </span>
        </div>
        {progress !== null && (
          <div
            className="bg-ink/10 dark:bg-night-rule mt-1.5 h-2 overflow-hidden rounded-full"
            aria-hidden
          >
            <div
              className="bg-primary h-full rounded-full transition-[width] duration-300"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        )}
        {lives !== undefined && <Breath lives={lives} />}
      </div>
      <div className="flex min-w-16 flex-col items-end leading-none">
        <span className="condensed text-ink dark:text-night-text flex items-center gap-1 text-[clamp(1.5rem,4svh,2.5rem)] font-extrabold tabular-nums">
          <Music2 className="h-5 w-5 stroke-[2.5]" aria-hidden />
          {score.points}
        </span>
        <span className="sr-only">Punkte</span>
        <span
          className={cn(
            "mt-1 flex h-6 items-center gap-1 rounded-full px-2 text-sm font-extrabold transition-opacity",
            score.multiplier > 1
              ? "bg-primary text-ink opacity-100"
              : "opacity-0",
          )}
          aria-hidden
        >
          <Flame className="h-4 w-4" />
          {score.multiplier}x
        </span>
      </div>
    </div>
  );
}

export const ANNOUNCEMENT = {
  again: "Noch einmal!",
  faster: "Schneller!",
  slower: "Etwas ruhiger",
  fresh: "Neuer Rhythmus!",
  lost: "Puste weg!",
  gained: "Puste zurück!",
} as const;

/** Große Einzählzahl; `key` startet die Plopp-Animation je Schlag neu. */
export function CountOverlay({ number }: { number: number | null }) {
  if (number === null) return null;
  return (
    <div
      className="bg-paper/70 dark:bg-night/70 pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-2xl"
      aria-hidden
    >
      <p
        key={number}
        className="rhythm-count-pop condensed text-primary-ink dark:text-primary text-[clamp(4rem,16svh,8rem)] leading-none font-extrabold tabular-nums"
      >
        {number}
      </p>
    </div>
  );
}

/** Zählt beim Einzählen mit und liefert `null`, sobald die Musik beginnt. */
export function useCountIn(conductor: Conductor): number | null {
  const [number, setNumber] = useState<number | null>(null);
  useEffect(() => {
    let segment: Segment | null = null;
    return conductor.subscribe({
      onSegment: (next) => {
        segment = next;
        if (next.kind !== "count") setNumber(null);
      },
      onFrame: (songSec) => {
        if (segment?.kind !== "count") return;
        const pulseSec =
          pulseOf(segment.timeSignature).pulseTicks * secPerTick(segment.bpm);
        const beat = Math.floor((songSec - segment.startSec) / pulseSec) + 1;
        if (beat >= 1) setNumber(beat);
      },
    });
  }, [conductor]);
  return number;
}

/** Springender Ball: Höhe aus der Phase im Schlag, so sieht man den nächsten Einsatz kommen. */
export function ballHop(positionInPulses: number, heightPx: number): number {
  return -Math.abs(Math.sin(Math.PI * positionInPulses)) * heightPx;
}
