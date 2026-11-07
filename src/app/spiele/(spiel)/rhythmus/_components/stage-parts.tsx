"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { HeartRow } from "../../../_components/game-kit";
import { Toni, type ToniMood } from "../../../_components/toni";
import { pulseOf, secPerTick } from "../../../_lib/rhythm/ticks";
import type { Conductor, Segment } from "../_lib/conductor";
import type { JudgeEvent } from "../_lib/judge";

const REACTION_MS = 650;
const BOUNCE_PX = 6;

function reduceMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Sichtbares Metronom: wichtig für alle, die den Klick nicht gut hören. */
function BeatMarks({ pulses, active }: { pulses: number; active: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-hidden>
      {Array.from({ length: pulses }, (_, i) => (
        <span
          key={i}
          className={cn(
            "spiel-dot h-2.5 w-2.5",
            i === active
              ? "bg-primary-ink dark:bg-primary"
              : "bg-rule dark:bg-night-rule",
          )}
        />
      ))}
    </div>
  );
}

/** Puste: die Leben im Endlos-Spiel. */
function Breath({ lives }: { lives: number }) {
  return (
    <span className="semi-condensed text-dark dark:text-night-muted flex items-center gap-1.5 text-sm font-semibold">
      Puste
      <HeartRow hearts={lives} />
    </span>
  );
}

function reactionFor(
  event: JudgeEvent,
): { text: string; mood: ToniMood } | null {
  if (event.type === "extra") return { text: "Eine zu viel", mood: "oops" };
  const { note } = event;
  if (event.type === "length") {
    if (note.length === "short") return { text: "Länger halten", mood: "oops" };
    if (note.length === "long") {
      return { text: "Früher loslassen", mood: "oops" };
    }
    return null;
  }
  const late = (note.deltaMs ?? 0) > 0;
  switch (note.verdict) {
    case "exact":
      return { text: "Genau", mood: "happy" };
    case "close":
      return { text: late ? "Etwas spät" : "Etwas früh", mood: "happy" };
    case "off":
      return { text: late ? "Zu spät" : "Zu früh", mood: "oops" };
    case "missed":
      return { text: "Verpasst", mood: "oops" };
    default:
      return null;
  }
}

/** Kopf des Spiels: Die Note hüpft im Takt, daneben Ansage, Punkte und Fortschritt. */
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
  const [score, setScore] = useState({ points: 0, multiplier: 1 });
  const [beat, setBeat] = useState({ pulses: 0, active: -1 });
  const markRef = useRef<HTMLDivElement>(null);

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
        if (markRef.current && !still) {
          const hop = Math.abs(Math.sin(Math.PI * position)) * BOUNCE_PX;
          markRef.current.style.transform = `translateY(${-hop}px)`;
        }
      },
      onJudge: (event) => {
        setScore({
          points: conductor.points,
          multiplier: conductor.multiplier,
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
    <div className="spiel-status border-ink dark:border-night-text border-b-2">
      <div className="flex items-center gap-3 pb-2 sm:gap-4">
        <Toni
          ref={markRef}
          mood={reaction?.mood ?? baseMood}
          className="h-[clamp(3.25rem,9svh,5rem)] w-[clamp(3.25rem,9svh,5rem)]"
        />
        <div className="min-w-0 flex-1">
          <p className="spiel-hud-text condensed text-ink dark:text-night-text min-h-[1em] text-[clamp(1.75rem,5svh,3.25rem)] leading-[0.95] font-extrabold">
            <span className="sr-only" aria-live="polite">
              {baseText}
            </span>
            <span
              key={reaction?.id ?? "base"}
              className={cn(
                "inline-block origin-left",
                reaction?.mood === "happy" && "spiel-stamp",
                reaction?.mood === "oops" && "spiel-shake",
              )}
              aria-hidden
            >
              {reaction?.text ?? baseText}
            </span>
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <BeatMarks pulses={beat.pulses} active={beat.active} />
            <span className="text-dark dark:text-night-muted text-sm tabular-nums">
              {progressText}
            </span>
            {lives !== undefined && <Breath lives={lives} />}
          </div>
        </div>
        <div className="flex flex-col items-end leading-none">
          <span className="condensed text-ink dark:text-night-text text-[clamp(1.75rem,5svh,3.25rem)] font-extrabold tabular-nums">
            {score.points}
          </span>
          <span className="semi-condensed text-dark dark:text-night-muted mt-0.5 text-sm font-semibold">
            Punkte
          </span>
          <span
            aria-hidden
            className={cn(
              "spiel-tag semi-condensed on-orange bg-primary text-ink mt-1 px-1.5 text-sm font-semibold tabular-nums",
              score.multiplier > 1 ? "visible" : "invisible",
            )}
          >
            {score.multiplier}-fach
          </span>
        </div>
      </div>
      {progress !== null && (
        <div aria-hidden className="spiel-bar h-1.5">
          <div
            className="bg-primary h-full transition-[width] duration-300"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

export const ANNOUNCEMENT = {
  again: "Noch einmal",
  faster: "Schneller",
  slower: "Etwas ruhiger",
  fresh: "Neuer Rhythmus",
  lost: "Puste weg",
  gained: "Puste zurück",
} as const;

/** Große Einzählzahl; `key` startet die Animation je Schlag neu. */
export function CountOverlay({ number }: { number: number | null }) {
  if (number === null) return null;
  return (
    <div
      className="spiel-sheet bg-paper dark:bg-night pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
      aria-hidden
    >
      <p
        key={number}
        className="rhythm-count-pop condensed text-ink dark:text-night-text text-[clamp(5rem,20svh,10rem)] leading-none font-extrabold tabular-nums"
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

/** Hüpfender Notenkopf: Höhe aus der Phase im Schlag, so sieht man den Einsatz kommen. */
export function ballHop(positionInPulses: number, heightPx: number): number {
  return -Math.abs(Math.sin(Math.PI * positionInPulses)) * heightPx;
}

/** Der einzige runde Punkt im Spiel, denn er ist ein Notenkopf. */
export function HoppingHead({
  headRef,
  filled,
}: {
  headRef: React.RefObject<HTMLDivElement | null>;
  filled: boolean;
}) {
  return (
    <div
      ref={headRef}
      className="absolute top-5 left-1/2 h-3.5 w-5"
      aria-hidden
    >
      <div
        className={cn(
          "border-ink dark:border-night-text h-full w-full -rotate-20 rounded-[50%] border-2",
          filled ? "bg-primary" : "bg-paper dark:bg-night",
        )}
      />
    </div>
  );
}
