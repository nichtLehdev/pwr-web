"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/app/_components/ui/button";
import { ArcadeButton } from "../../../_components/arcade-button";
import { Confetti } from "../../../_components/confetti";
import { GameDock } from "../../../_components/game-shell-context";
import { Toni } from "../../../_components/toni";
import { RhythmFigureLoader } from "../../../_components/rhythm-figure-loader";
import {
  harmonyAt,
  JINGLE_NOTES,
  type RhythmAudio,
} from "../../../_lib/rhythm/audio";
import { describeFigure } from "../../../_lib/rhythm/describe";
import type { BarHandle } from "../../../_lib/rhythm/draw-bar";
import {
  barTicks,
  onsetsOf,
  pulseOf,
  secPerTick,
} from "../../../_lib/rhythm/ticks";
import type { Level } from "../../../_lib/rhythm/levels";
import type { Attempt } from "../_lib/conductor";
import type { SessionSummary } from "../_lib/feedback";

function headlineFor(stars: number): string {
  if (stars === 3) return "Wahnsinn, das sitzt!";
  if (stars === 2) return "Super gespielt!";
  if (stars === 1) return "Geschafft, weiter so!";
  return "Fast! Noch eine Runde?";
}

const CELEBRATE_FROM_STARS = 2;
const STAR_STEP_SEC = 0.28;

/** Spielt die Figur mit Klick: entweder die Vorlage oder das, was der Spieler gespielt hat. */
function replay(
  audio: RhythmAudio,
  attempt: Attempt,
  version: "target" | "take",
) {
  audio.cancelScheduled();
  const start = audio.now() + 0.12;
  const tickSec = secPerTick(attempt.bpm);
  const { pulseTicks, pulsesPerBar } = pulseOf(attempt.timeSignature);
  const ticksPerBar = barTicks(attempt.timeSignature);
  const pulses = pulsesPerBar * attempt.bars.length;
  for (let k = 0; k < pulses; k++) {
    audio.scheduleClick(
      start + k * pulseTicks * tickSec,
      k % pulsesPerBar === 0,
      0.3,
    );
  }
  const { melodyHz } = harmonyAt(attempt.index);
  if (version === "target") {
    attempt.bars.forEach((events, barIndex) => {
      for (const onset of onsetsOf(events)) {
        audio.scheduleNote(
          start + (barIndex * ticksPerBar + onset.tick) * tickSec,
          onset.ticks * tickSec,
          melodyHz,
        );
      }
    });
    return;
  }
  for (const press of attempt.presses) {
    audio.scheduleNote(
      start + (press.atMs - attempt.startMs) / 1000,
      (press.durationMs ?? 140) / 1000 / 0.9,
      melodyHz,
    );
  }
}

export function ResultView({
  summary,
  nextLevel,
  bestStreak,
  points,
  isRecord,
  rankUp,
  awardsStars,
  audio,
  onAgain,
  onNext,
  onSetup,
}: {
  summary: SessionSummary;
  nextLevel: Level | null;
  bestStreak: number;
  points: number;
  isRecord: boolean;
  /** Neuer Titel, wenn diese Runde ihn gebracht hat. */
  rankUp: string | null;
  awardsStars: boolean;
  audio: RhythmAudio;
  onAgain: () => void;
  onNext: () => void;
  onSetup: () => void;
}) {
  const attempt = summary.focusAttempt;
  const [playing, setPlaying] = useState<"target" | "take" | null>(null);

  // Je Stern ein Ton höher; nach einer gelungenen Runde klingt es wie eine Fanfare.
  useEffect(() => {
    if (!awardsStars || summary.stars === 0) return;
    audio.jingle(
      JINGLE_NOTES.slice(0, summary.stars + (summary.stars === 3 ? 2 : 1)),
      STAR_STEP_SEC / 2,
      0.25,
    );
  }, [audio, awardsStars, summary.stars]);

  const description = useMemo(
    () =>
      attempt
        ? describeFigure({
            timeSignature: attempt.timeSignature,
            bars: attempt.bars,
          })
        : null,
    [attempt],
  );

  const paintAttempt = useCallback(
    (handles: BarHandle[]) => {
      if (!attempt) return;
      const tickSec = secPerTick(attempt.bpm);
      const ticksPerBar = barTicks(attempt.timeSignature);
      handles.forEach((handle) => handle.addTargets());
      for (const note of attempt.notes) {
        handles[note.barIndex]?.mark(
          note.eventIndex,
          note.verdict ?? "missed",
          note.length === "short" || note.length === "long",
        );
      }
      const hitPresses = new Set(
        attempt.notes.flatMap((n) =>
          n.deltaMs === null ? [] : [n.onsetMs + n.deltaMs],
        ),
      );
      for (const press of attempt.presses) {
        const from = (press.atMs - attempt.startMs) / 1000 / tickSec;
        const to = from + (press.durationMs ?? 90) / 1000 / tickSec;
        const barIndex = Math.max(0, Math.floor(from / ticksPerBar));
        handles[barIndex]?.addTake(
          from - barIndex * ticksPerBar,
          to - barIndex * ticksPerBar,
          !hitPresses.has(press.atMs),
        );
      }
    },
    [attempt],
  );

  const play = (version: "target" | "take") => {
    if (!attempt) return;
    void audio.ensure().then(() => {
      replay(audio, attempt, version);
      setPlaying(version);
    });
  };

  return (
    <div className="flex flex-col gap-3 pb-2">
      {awardsStars && summary.stars >= CELEBRATE_FROM_STARS && <Confetti />}

      <div className="spiel-buehne flex flex-col items-center gap-2 rounded-3xl p-4 text-center">
        <Toni
          mood={summary.stars >= 1 ? "happy" : "idle"}
          className="spiel-float h-[clamp(5rem,16svh,8rem)] w-[clamp(5rem,16svh,8rem)]"
        />
        <p className="condensed text-ink dark:text-night-text text-[clamp(1.75rem,4.5svh,3rem)] leading-none font-extrabold">
          {headlineFor(summary.stars)}
        </p>
        <span className="sr-only">
          {summary.percent} Prozent, {summary.stars} von 3 Sternen, {points}{" "}
          Punkte
        </span>
        {awardsStars && (
          <div className="flex gap-2" aria-hidden>
            {[1, 2, 3].map((n) => (
              <Star
                key={n}
                className={cn(
                  "h-[clamp(2.75rem,8svh,4.5rem)] w-[clamp(2.75rem,8svh,4.5rem)] stroke-[1.5]",
                  n <= summary.stars
                    ? "fill-primary text-ink dark:text-night-text spiel-pop"
                    : "text-ink/20 dark:text-night-rule",
                )}
                style={{ animationDelay: `${0.25 + (n - 1) * STAR_STEP_SEC}s` }}
              />
            ))}
          </div>
        )}
        <p
          className="text-ink dark:text-night-text flex flex-wrap items-center justify-center gap-x-3 font-bold tabular-nums"
          aria-hidden
        >
          <span className="condensed text-2xl font-extrabold">
            {points} Punkte
          </span>
          <span>{summary.percent} % getroffen</span>
          {bestStreak >= 4 && <span>{bestStreak} in Folge</span>}
        </p>
        {(isRecord || rankUp) && (
          <p className="bg-primary text-ink spiel-pop rounded-full px-4 py-1 font-extrabold">
            {rankUp ? `Neuer Titel: ${rankUp}!` : "Neuer Rekord!"}
          </p>
        )}
        <p className="text-ink dark:text-night-text mt-1 max-w-[52ch] leading-snug">
          {summary.tips[0]}
        </p>
      </div>

      {attempt && (
        <details className="border-rule dark:border-night-rule rounded-2xl border-2">
          <summary className="text-ink dark:text-night-text flex min-h-11 cursor-pointer list-none items-center justify-center rounded-2xl px-3 text-sm font-bold [&::-webkit-details-marker]:hidden">
            Genauer ansehen: Wie klang es bei dir?
          </summary>
          <div className="flex flex-col gap-2 px-3 pb-3">
            {summary.tips.length > 1 && (
              <ul className="flex flex-col gap-1">
                {summary.tips.slice(1).map((tip) => (
                  <li
                    key={tip}
                    className="border-primary text-ink dark:text-night-text border-l-4 pl-3 text-sm leading-snug"
                  >
                    {tip}
                  </li>
                ))}
              </ul>
            )}
            <div className="h-[clamp(8rem,22svh,14rem)]">
              <RhythmFigureLoader
                bars={attempt.bars}
                timeSignature={attempt.timeSignature}
                onDrawn={paintAttempt}
              />
            </div>
            {description && <p className="sr-only">{description}</p>}
            <p className="text-dark dark:text-night-muted text-xs">
              Die schwierigste Stelle der Runde: oben dein Spiel in Messing,
              darunter grau die Vorlage. Liegen sie übereinander, passt es.
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => play("target")}
                aria-pressed={playing === "target"}
              >
                So klingt&apos;s richtig
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => play("take")}
                aria-pressed={playing === "take"}
              >
                So klang&apos;s bei dir
              </Button>
            </div>
          </div>
        </details>
      )}

      <GameDock>
        <div className="flex flex-col gap-2">
          {nextLevel && summary.stars >= 2 ? (
            <ArcadeButton onClick={onNext}>Nächste Stufe</ArcadeButton>
          ) : (
            <ArcadeButton onClick={onAgain}>Nochmal spielen</ArcadeButton>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onSetup}
            >
              Zum Musikweg
            </Button>
            {nextLevel && summary.stars >= 2 && (
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onAgain}
              >
                Nochmal
              </Button>
            )}
          </div>
        </div>
      </GameDock>
    </div>
  );
}
