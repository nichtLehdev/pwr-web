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
    <div className="border-rule dark:border-night-rule space-y-[clamp(0.75rem,2.4dvh,1.5rem)] border-t pt-[clamp(0.75rem,2.4dvh,1.5rem)]">
      <div className="text-center">
        {percent >= 75 ? (
          <Trophy
            className="text-primary-ink dark:text-primary mx-auto h-[clamp(2.5rem,6dvh,4rem)] w-[clamp(2.5rem,6dvh,4rem)] stroke-[1.35]"
            aria-hidden
          />
        ) : (
          <PartyPopper
            className="text-primary-ink dark:text-primary mx-auto h-[clamp(2.5rem,6dvh,4rem)] w-[clamp(2.5rem,6dvh,4rem)] stroke-[1.35]"
            aria-hidden
          />
        )}
        <p className="text-ink dark:text-night-text mt-[clamp(0.5rem,1.6dvh,0.75rem)] text-[clamp(1rem,2.4dvh,1.25rem)] font-bold">
          {cheer(percent)}
        </p>
        <p className="text-primary-ink dark:text-primary mt-1 text-[clamp(2rem,6dvh,3rem)] leading-tight font-bold tabular-nums">
          {result.correct}/{result.total}
        </p>
        <p className="text-dark dark:text-night-muted mt-2 text-sm font-medium">
          {percent}% richtig · Beste Serie in der Runde:{" "}
          {result.bestStreakRound}
        </p>
      </div>

      {topMissed.length > 0 && (
        <div className="border-rule bg-rule/25 dark:border-night-rule dark:bg-night-raised border p-[clamp(0.75rem,2dvh,1rem)]">
          <p className="text-ink dark:text-night-text mb-2 text-sm font-bold">
            Am häufigsten daneben
          </p>
          <ul className="text-ink dark:text-night-text space-y-[clamp(0.25rem,0.8dvh,0.375rem)] text-sm">
            {topMissed.map((row) => (
              <li
                key={row.key}
                className="border-rule dark:border-night-rule flex justify-between gap-3 border-b pb-1 last:border-0"
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
