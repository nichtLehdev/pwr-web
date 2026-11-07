"use client";

import { Celebration } from "../../../_components/game-kit";

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

export type NoteReadingResultViewProps = {
  result: NoteReadingResult;
  bestScore: number;
  plays: number;
};

/** Ohne eigene Knopfleiste: Die Aktionen stehen im Aktions-Dock der Hülle. */
export function NoteReadingResultView({
  result,
  bestScore,
  plays,
}: NoteReadingResultViewProps) {
  const percent =
    result.total > 0 ? Math.round((100 * result.correct) / result.total) : 0;
  const isBest = plays > 1 && result.correct > 0 && result.correct >= bestScore;

  return (
    <Celebration
      percent={percent}
      value={`${result.correct}/${result.total}`}
      valueLabel="richtig"
      stats={`Beste Serie: ${result.bestStreakRound} · Dein Rekord: ${bestScore}`}
      badge={isBest ? "Bestleistung!" : null}
      detailsLabel="Diese Noten nochmal anschauen"
    >
      {result.missed && result.missed.length > 0 ? (
        <ul className="space-y-1.5">
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
      ) : null}
    </Celebration>
  );
}
