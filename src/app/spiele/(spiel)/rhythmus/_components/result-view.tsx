"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/app/_components/ui/button";
import {
  DetailRow,
  FactRows,
  ResultField,
} from "../../../_components/game-kit";
import { GameDock } from "../../../_components/game-shell-context";
import { useSkipGesture } from "../../../_components/use-skip-gesture";
import { RhythmFigureLoader } from "../../../_components/rhythm-figure-loader";
import { resultHeadline } from "../../../_lib/rewards";
import {
  harmonyFor,
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
import type { Attempt } from "../_lib/conductor";
import type { SessionSummary } from "../_lib/feedback";
import { CHALLENGE_PASS_PERCENT, SECTIONS } from "../_lib/path";
import type { ChallengeResult, EndlessResult } from "./rhythm-game";

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
  const { melodyHz } = harmonyFor(attempt);
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
  challenge,
  bestStreak,
  points,
  endless,
  isRecord,
  rankUp,
  awardsStars,
  audio,
  onAgain,
  onSetup,
}: {
  summary: SessionSummary;
  challenge: ChallengeResult | null;
  bestStreak: number;
  points: number;
  endless: EndlessResult | null;
  isRecord: boolean;
  /** Neuer Titel, wenn diese Runde ihn gebracht hat. */
  rankUp: string | null;
  awardsStars: boolean;
  audio: RhythmAudio;
  onAgain: () => void;
  onSetup: () => void;
}) {
  const attempt = summary.focusAttempt;
  const [playing, setPlaying] = useState<"target" | "take" | null>(null);

  // Je Stern ein Ton höher; nach einer gelungenen Runde klingt es wie eine Fanfare.
  useEffect(() => {
    if (endless) {
      if (endless.isRecord) audio.jingle(JINGLE_NOTES, STAR_STEP_SEC / 2, 0.25);
      return;
    }
    if (!awardsStars || summary.stars === 0) return;
    audio.jingle(
      JINGLE_NOTES.slice(0, summary.stars + (summary.stars === 3 ? 2 : 1)),
      STAR_STEP_SEC / 2,
      0.25,
    );
  }, [audio, awardsStars, endless, summary.stars]);

  // Die Fanfare gehört zur Feier und endet mit ihr.
  const [jingling, setJingling] = useState(true);
  useSkipGesture(jingling, () => {
    setJingling(false);
    audio.cancelScheduled();
  });

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

  const rows: [string, string][] = [
    ["Punkte", String(points)],
    ...(endless
      ? ([["Getroffen", `${summary.percent} %`]] as [string, string][])
      : []),
    ...(bestStreak >= 4
      ? ([["Beste Serie", String(bestStreak)]] as [string, string][])
      : []),
    ...(endless
      ? ([
          [
            "Dein Rekord",
            `${endless.best.points} Punkte, ${endless.best.reached} ${endless.unit}`,
          ],
        ] as [string, string][])
      : []),
  ];

  return (
    <div className="flex flex-col gap-4 pb-2">
      <ResultField
        value={endless ? String(endless.reached) : `${summary.percent} %`}
        valueLabel={endless ? `${endless.unit} geschafft` : "getroffen"}
        headline={
          endless
            ? endless.isRecord
              ? "Neuer Rekord."
              : "Die Puste ist weg."
            : challenge
              ? challenge.passed
                ? "Challenge geschafft."
                : "Noch nicht geschafft."
              : resultHeadline(summary.stars)
        }
        stars={awardsStars ? summary.stars : null}
        percent={summary.percent}
        celebrate={
          endless
            ? endless.isRecord
            : challenge
              ? challenge.passed
              : awardsStars && summary.stars >= 2
        }
        badge={
          challenge?.passed && SECTIONS[challenge.section + 1]
            ? `Abschnitt ${challenge.section + 2} ist frei`
            : endless
              ? null
              : rankUp
                ? `Neuer Titel: ${rankUp}`
                : isRecord
                  ? "Neuer Rekord"
                  : null
        }
      />

      {challenge && !challenge.passed && (
        <p className="text-ink dark:text-night-text text-center text-lg leading-snug font-bold">
          Du brauchst {CHALLENGE_PASS_PERCENT} % und noch Puste am Ende. Übe die
          Stufen noch einmal, dann klappt es.
        </p>
      )}

      <FactRows rows={rows} />

      <p className="text-ink dark:text-night-text max-w-[52ch] text-lg leading-snug">
        {challenge?.passed
          ? SECTIONS[challenge.section + 1]
            ? `Du kannst jetzt alles aus Abschnitt ${challenge.section + 1}.`
            : "Du hast den ganzen Lernpfad geschafft."
          : summary.tips[0]}
      </p>

      {attempt && (
        <DetailRow label="Wie klang es bei dir?">
          <div className="flex flex-col gap-2">
            {summary.tips.length > 1 && (
              <ul>
                {summary.tips.slice(1).map((tip) => (
                  <li
                    key={tip}
                    className="border-rule dark:border-night-rule text-ink dark:text-night-text border-b py-2 leading-snug"
                  >
                    {tip}
                  </li>
                ))}
              </ul>
            )}
            <div className="h-[clamp(8rem,22svh,14rem)]">
              <RhythmFigureLoader
                bars={attempt.bars}
                noteKey={harmonyFor(attempt).melodyKey}
                timeSignature={attempt.timeSignature}
                onDrawn={paintAttempt}
              />
            </div>
            {description && <p className="sr-only">{description}</p>}
            <p className="text-dark dark:text-night-muted text-sm">
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
        </DetailRow>
      )}

      <GameDock>
        <div className="flex gap-2">
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="flex-1"
            onClick={onAgain}
          >
            Nochmal
          </Button>
          <Button
            type="button"
            size="lg"
            className="spiel-action flex-1"
            onClick={onSetup}
          >
            Weiter
          </Button>
        </div>
      </GameDock>
    </div>
  );
}
