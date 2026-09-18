"use client";

import { PartyPopper, Trophy } from "lucide-react";

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
};

/**
 * Auswertung ohne eigene Knopfleiste — „Nochmal spielen“ und „Schwierigkeit /
 * Modus“ stehen im Aktions-Dock der Hülle, wo die Hauptaktion jedes Spiels
 * sitzt.
 */
export function NoteReadingResultView({ result }: NoteReadingResultViewProps) {
  const percent =
    result.total > 0 ? Math.round((100 * result.correct) / result.total) : 0;

  return (
    <div className="border-rule dark:border-night-rule space-y-5 border-t pt-5 md:space-y-6 md:pt-6">
      <div className="text-center">
        {percent >= 75 ? (
          <Trophy
            className="text-primary-ink dark:text-primary mx-auto h-12 w-12 stroke-[1.35] md:h-16 md:w-16"
            aria-hidden
          />
        ) : (
          <PartyPopper
            className="text-primary-ink dark:text-primary mx-auto h-12 w-12 stroke-[1.35] md:h-16 md:w-16"
            aria-hidden
          />
        )}
        <p className="text-ink dark:text-night-text mt-3 text-lg font-bold md:text-xl">
          {cheer(percent)}
        </p>
        <p className="text-primary-ink dark:text-primary mt-2 text-4xl font-bold tabular-nums md:text-5xl">
          {result.correct}/{result.total}
        </p>
        <p className="text-dark dark:text-night-muted mt-2 text-sm font-medium">
          {percent}% richtig · Beste Serie in der Runde:{" "}
          {result.bestStreakRound}
        </p>
      </div>

      {result.missed && result.missed.length > 0 && (
        <div className="border-rule dark:border-night-rule dark:bg-night-raised bg-rule/25 mx-auto w-full max-w-xl border p-4 text-left">
          <p className="text-ink dark:text-night-text text-sm font-bold">
            Diese Noten nochmal anschauen:
          </p>
          <ul className="mt-2 space-y-1.5">
            {result.missed.map((m) => (
              <li
                key={`${m.label}|${m.description}`}
                className="text-dark dark:text-night-muted text-sm leading-snug"
              >
                <span className="text-ink dark:text-night-text font-bold">
                  {m.label}
                </span>{" "}
                — {m.description}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
