"use client";

import {
  PartyPopper,
  RotateCcw,
  SlidersHorizontal,
  Trophy,
} from "lucide-react";
import { Button } from "@/app/_components/ui/button";

export type GriffeMissedRow = {
  /** Stabiler Schlüssel (pitchKey) — Label allein wäre nicht eindeutig. */
  key: string;
  /** Anzeigename inkl. Oktave (z. B. „D4“), sonst kollidieren D4 und D5. */
  label: string;
  count: number;
};

export type GriffeRoundResult = {
  correct: number;
  total: number;
  bestStreakRound: number;
  missed: GriffeMissedRow[];
};

function cheer(percent: number): string {
  if (percent >= 90) return "Starke Runde — Griffe sitzen!";
  if (percent >= 70) return "Sehr gut, weiter üben!";
  if (percent >= 50) return "Solide — die häufigsten Fehler unten merken.";
  return "Übung macht die Meisterin / den Meister!";
}

export type GriffeResultViewProps = {
  result: GriffeRoundResult;
  onRetry: () => void;
  onChangeSetup: () => void;
};

export function GriffeResultView({
  result,
  onRetry,
  onChangeSetup,
}: GriffeResultViewProps) {
  const percent =
    result.total > 0 ? Math.round((100 * result.correct) / result.total) : 0;
  const topMissed = [...result.missed]
    .filter((m) => m.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

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

      {topMissed.length > 0 && (
        <div className="border-dark-border/50 dark:border-dark-border dark:bg-dark-surface/40 rounded-lg border bg-white/50 p-4">
          <p className="text-dark dark:text-dark-text mb-2 text-sm font-bold">
            Am häufigsten daneben
          </p>
          <ul className="text-dark dark:text-dark-text-secondary space-y-1.5 text-sm">
            {topMissed.map((row) => (
              <li
                key={row.key}
                className="border-dark-border/30 dark:border-dark-border/40 flex justify-between gap-3 border-b pb-1 last:border-0"
              >
                <span className="font-semibold">{row.label}</span>
                <span className="font-bold tabular-nums">{row.count}×</span>
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
          Setup ändern
        </Button>
      </div>
    </div>
  );
}
