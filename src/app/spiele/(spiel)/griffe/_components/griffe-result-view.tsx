"use client";

import { Button } from "@/app/_components/ui/button";
import { GameResult } from "../../../_components/game-kit";
import { GameDock } from "../../../_components/game-shell-context";

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

export type GriffeResultViewProps = {
  result: GriffeRoundResult;
  onRetry: () => void;
  onChangeSetup: () => void;
  bestScore: number;
  plays: number;
};

export function GriffeResultView({
  result,
  onRetry,
  onChangeSetup,
  bestScore,
  plays,
}: GriffeResultViewProps) {
  const percent =
    result.total > 0 ? Math.round((100 * result.correct) / result.total) : 0;
  const topMissed = [...result.missed]
    .filter((m) => m.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  const isBest = plays > 1 && result.correct > 0 && result.correct >= bestScore;

  return (
    <>
      <GameResult
        percent={percent}
        value={`${result.correct}/${result.total}`}
        valueLabel="richtig"
        rows={[
          ["Beste Serie", String(result.bestStreakRound)],
          ["Dein Rekord", `${bestScore} richtig`],
        ]}
        badge={isBest ? "Bestleistung" : null}
        detailsLabel="Das übst du am besten noch"
      >
        {topMissed.length > 0 ? (
          <ul className="text-ink dark:text-night-text space-y-1 text-sm">
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
        ) : null}
      </GameResult>
      <GameDock>
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            size="lg"
            className="spiel-action w-full"
            onClick={onRetry}
          >
            Nochmal spielen
          </Button>
          <Button type="button" variant="outline" onClick={onChangeSetup}>
            Schwierigkeit und Modus
          </Button>
        </div>
      </GameDock>
    </>
  );
}
