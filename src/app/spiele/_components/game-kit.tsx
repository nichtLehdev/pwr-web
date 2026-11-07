"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Flame, Star, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { GAME_FOCUS_RING } from "../_lib/focus-ring";
import {
  isStreakMilestone,
  resultHeadline,
  starsFor,
  type Stars,
} from "../_lib/rewards";
import { JINGLE_NOTES, RhythmAudio } from "../_lib/rhythm/audio";
import { Confetti } from "./confetti";
import { Toni, type ToniMood } from "./toni";

const SOUND_KEY = "pwr.spiele.v1.sound";
const CELEBRATE_FROM_STARS = 2;
const STAR_STEP_SEC = 0.28;
const WRONG_NOTES = [185, 155.56] as const;

function readSoundOn(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

/** Belohnungsklänge für die stillen Spiele; abschaltbar, etwa für die Probe oder den Bus. */
export function useGameSounds() {
  const [audio] = useState(() => new RhythmAudio());
  useEffect(() => () => audio.close(), [audio]);

  const play = useCallback(
    (notes: readonly number[], step: number, delay = 0) => {
      if (!readSoundOn()) return;
      void audio
        .ensure()
        .then(() => audio.jingle(notes, step, delay))
        .catch(() => undefined);
    },
    [audio],
  );

  const correct = useCallback(
    (streak: number) => {
      const top = Math.min(JINGLE_NOTES.length, 2 + Math.floor(streak / 3));
      play(JINGLE_NOTES.slice(top - 2, top), 0.08);
    },
    [play],
  );
  const wrong = useCallback(() => play(WRONG_NOTES, 0.11), [play]);
  const fanfare = useCallback(
    (stars: Stars) => {
      if (stars === 0) return;
      const count = stars === 3 ? JINGLE_NOTES.length : stars + 1;
      play(JINGLE_NOTES.slice(0, count), STAR_STEP_SEC / 2, 0.25);
    },
    [play],
  );

  return { correct, wrong, fanfare };
}

export function SoundToggle() {
  const [on, setOn] = useState(true);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Serverbild kennt den Speicher nicht
  useEffect(() => setOn(readSoundOn()), []);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label="Spielklänge"
      onClick={() => {
        const next = !on;
        setOn(next);
        try {
          localStorage.setItem(SOUND_KEY, next ? "on" : "off");
        } catch {
          /* Privatmodus: Es bleibt bei dieser Sitzung. */
        }
      }}
      className={cn(
        "text-ink dark:text-night-text flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
        GAME_FOCUS_RING,
      )}
    >
      {on ? (
        <Volume2 className="h-5 w-5" aria-hidden />
      ) : (
        <VolumeX className="h-5 w-5 opacity-50" aria-hidden />
      )}
    </button>
  );
}

/** Begrüßung auf den Auswahlseiten. */
export function GameHero({
  title,
  text,
  mood = "idle",
}: {
  title: string;
  text: string;
  mood?: ToniMood;
}) {
  return (
    <div className="spiel-buehne flex items-center gap-3 rounded-3xl p-3">
      <Toni mood={mood} className="spiel-float h-20 w-20 sm:h-24 sm:w-24" />
      <div className="min-w-0 flex-1">
        <h2 className="condensed text-ink dark:text-night-text text-[clamp(1.5rem,4svh,2.5rem)] leading-none font-extrabold">
          {title}
        </h2>
        <p className="text-ink dark:text-night-text mt-1 leading-snug">
          {text}
        </p>
      </div>
      <SoundToggle />
    </div>
  );
}

/** Toni kommentiert das Spiel: fester Platz, damit der Inhalt darunter nicht springt. */
export function ToniCoach({
  mood,
  message,
  note,
  streak = 0,
  progress = null,
}: {
  mood: ToniMood;
  message: string;
  note?: string;
  streak?: number;
  /** Anteil 0–1; `null` blendet den Balken aus (Lernen, Endlos). */
  progress?: number | null;
}) {
  const celebrating = mood === "happy" && isStreakMilestone(streak);
  return (
    <div className="spiel-buehne flex items-center gap-2 rounded-3xl px-3 py-2 sm:gap-3">
      {celebrating && <Confetti key={streak} pieces={26} />}
      <Toni
        key={mood}
        mood={mood}
        className={cn(
          "h-[clamp(3rem,8dvh,4.5rem)] w-[clamp(3rem,8dvh,4.5rem)]",
          mood === "happy" && "spiel-pop",
          mood === "oops" && "spiel-shake",
        )}
      />
      <div className="min-w-0 flex-1">
        <p
          key={message}
          className={cn(
            "condensed text-ink dark:text-night-text origin-left text-[clamp(1.25rem,3svh,1.875rem)] leading-none font-extrabold",
            mood === "happy" && "spiel-pop",
          )}
        >
          {message}
        </p>
        {note && (
          <p className="text-dark dark:text-night-muted mt-0.5 text-xs leading-tight font-bold">
            {note}
          </p>
        )}
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
      </div>
      <span
        className={cn(
          "bg-primary text-ink flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-extrabold tabular-nums transition-opacity",
          streak >= 2 ? "opacity-100" : "opacity-0",
        )}
        aria-hidden
      >
        <Flame className="h-4 w-4" />
        {streak}
      </span>
    </div>
  );
}

/** Ergebnisfeier mit Sternen; Einzelheiten stehen als `children` hinter einem Klick. */
export function Celebration({
  percent,
  value,
  valueLabel,
  stats,
  badge,
  detailsLabel,
  children,
}: {
  percent: number;
  value: string;
  valueLabel: string;
  stats?: string;
  badge?: string | null;
  detailsLabel?: string;
  children?: ReactNode;
}) {
  const stars = starsFor(percent);
  const { fanfare } = useGameSounds();
  useEffect(() => fanfare(stars), [fanfare, stars]);

  return (
    <div className="flex flex-col gap-3">
      {stars >= CELEBRATE_FROM_STARS && <Confetti />}
      <div className="spiel-buehne flex flex-col items-center gap-2 rounded-3xl p-4 text-center">
        <Toni
          mood={stars >= 1 ? "happy" : "idle"}
          className="spiel-float h-[clamp(5rem,16dvh,8rem)] w-[clamp(5rem,16dvh,8rem)]"
        />
        <p className="condensed text-ink dark:text-night-text text-[clamp(1.75rem,4.5svh,3rem)] leading-none font-extrabold">
          {resultHeadline(stars)}
        </p>
        <span className="sr-only">{stars} von 3 Sternen.</span>
        <div className="flex gap-2" aria-hidden>
          {[1, 2, 3].map((n) => (
            <Star
              key={n}
              className={cn(
                "h-[clamp(2.75rem,8svh,4.5rem)] w-[clamp(2.75rem,8svh,4.5rem)] stroke-[1.5]",
                n <= stars
                  ? "fill-primary text-ink dark:text-night-text spiel-pop"
                  : "text-ink/20 dark:text-night-rule",
              )}
              style={{ animationDelay: `${0.25 + (n - 1) * STAR_STEP_SEC}s` }}
            />
          ))}
        </div>
        <p className="text-ink dark:text-night-text">
          <span className="condensed text-3xl font-extrabold tabular-nums">
            {value}
          </span>{" "}
          <span className="font-bold">{valueLabel}</span>
        </p>
        {stats && (
          <p className="text-dark dark:text-night-muted text-sm font-bold tabular-nums">
            {stats}
          </p>
        )}
        {badge && (
          <p className="bg-primary text-ink spiel-pop rounded-full px-4 py-1 font-extrabold">
            {badge}
          </p>
        )}
      </div>
      {children && (
        <details className="border-rule dark:border-night-rule rounded-2xl border-2">
          <summary
            className={cn(
              "text-ink dark:text-night-text flex min-h-11 cursor-pointer list-none items-center justify-center rounded-2xl px-3 text-sm font-bold [&::-webkit-details-marker]:hidden",
              GAME_FOCUS_RING,
            )}
          >
            {detailsLabel ?? "Genauer ansehen"}
          </summary>
          <div className="px-3 pb-3">{children}</div>
        </details>
      )}
    </div>
  );
}
