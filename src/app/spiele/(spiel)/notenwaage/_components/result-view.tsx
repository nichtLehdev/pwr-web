"use client";

import { Button } from "@/app/_components/ui/button";
import { GameResult } from "../../../_components/game-kit";
import { GameDock } from "../../../_components/game-shell-context";

type Props = {
  score: number;
  solved: number;
  total: number;
  bestStreak: number;
  maxScore: number;
  bestScore: number;
  plays: number;
  onRetry: () => void;
  onSetup: () => void;
};

export function NoteWaageResultView({
  score,
  solved,
  total,
  bestStreak,
  maxScore,
  bestScore,
  plays,
  onRetry,
  onSetup,
}: Props) {
  const percent = maxScore > 0 ? Math.round((100 * score) / maxScore) : 0;
  const isBest = plays > 1 && score > 0 && score >= bestScore;
  return (
    <>
      <GameResult
        percent={percent}
        value={String(score)}
        valueLabel="Punkte"
        rows={[
          ["Gelöst", `${solved}/${total}`],
          ["Beste Serie", String(bestStreak)],
          ["Dein Rekord", `${bestScore} Punkte`],
        ]}
        badge={isBest ? "Bestleistung" : null}
      />
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
          <Button type="button" variant="outline" onClick={onSetup}>
            Schwierigkeit wählen
          </Button>
        </div>
      </GameDock>
    </>
  );
}
