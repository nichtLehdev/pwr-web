"use client";

import {
  PartyPopper,
  RotateCcw,
  SlidersHorizontal,
  Trophy,
} from "lucide-react";
import { Button } from "@/app/_components/ui/button";

export type MissedNote = {
  label: string;
  /** Deutsche Positionsbeschreibung (Linie/Zwischenraum/Hilfslinie). */
  description: string;
};

export type NoteReadingResult = {
  correct: number;
  total: number;
  bestStreakRound: number;
  /** Im Quiz verpasste Noten (dedupliziert), zum Nachschauen. */
  missed?: MissedNote[];
};

function cheer(percent: number): string {
  if (percent >= 90) return "Starke Runde — weiter so!";
  if (percent >= 70) return "Sehr gut, das sitzt!";
  if (percent >= 50) return "Solide — noch einmal üben!";
  return "Übung macht die Meisterin / den Meister!";
}

export type NoteReadingResultViewProps = {
  result: NoteReadingResult;
  onRetry: () => void;
  onChangeSetup: () => void;
};

export function NoteReadingResultView({
  result,
  onRetry,
  onChangeSetup,
}: NoteReadingResultViewProps) {
  const percent =
    result.total > 0 ? Math.round((100 * result.correct) / result.total) : 0;

  return (
    <div className="dark:border-dark-border/80 space-y-5 border-t border-gray-200/90 pt-5 md:space-y-6 md:pt-6">
      <div className="text-center">
        {percent >= 75 ? (
          <Trophy
            className="text-primary mx-auto h-12 w-12 stroke-[1.35] md:h-16 md:w-16"
            aria-hidden
          />
        ) : (
          <PartyPopper
            className="text-primary mx-auto h-12 w-12 stroke-[1.35] md:h-16 md:w-16"
            aria-hidden
          />
        )}
        <p className="text-dark dark:text-dark-text mt-3 text-lg font-bold md:text-xl">
          {cheer(percent)}
        </p>
        <p className="text-primary dark:text-primary-light mt-2 text-4xl font-bold tabular-nums md:text-5xl">
          {result.correct}/{result.total}
        </p>
        <p className="text-dark dark:text-dark-text-secondary mt-2 text-sm font-medium">
          {percent}% richtig · Beste Serie in der Runde:{" "}
          {result.bestStreakRound}
        </p>
      </div>

      {result.missed && result.missed.length > 0 && (
        <div className="border-dark-border/50 dark:border-dark-border dark:bg-dark-surface/50 mx-auto w-full max-w-xl rounded-lg border bg-white/60 p-4 text-left">
          <p className="text-dark dark:text-dark-text text-sm font-bold">
            Diese Noten nochmal anschauen:
          </p>
          <ul className="mt-2 space-y-1.5">
            {result.missed.map((m) => (
              <li
                key={`${m.label}|${m.description}`}
                className="text-dark dark:text-dark-text-secondary text-sm leading-snug"
              >
                <span className="text-dark dark:text-dark-text font-bold">
                  {m.label}
                </span>{" "}
                — {m.description}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button type="button" size="lg" className="gap-2" onClick={onRetry}>
          <RotateCcw className="h-5 w-5 shrink-0 stroke-[2]" aria-hidden />
          Nochmal spielen
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="gap-2"
          onClick={onChangeSetup}
        >
          <SlidersHorizontal
            className="h-5 w-5 shrink-0 stroke-[2]"
            aria-hidden
          />
          Schwierigkeit / Modus
        </Button>
      </div>
    </div>
  );
}
