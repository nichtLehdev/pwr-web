"use client";

import { Button } from "@/app/_components/ui/button";
import { ArcadeButton } from "../../../_components/arcade-button";
import { Celebration } from "../../../_components/game-kit";
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
      <Celebration
        percent={percent}
        value={String(score)}
        valueLabel="Punkte"
        stats={`Gelöst: ${solved}/${total} · Beste Serie: ${bestStreak} · Dein Rekord: ${bestScore}`}
        badge={isBest ? "Bestleistung!" : null}
      />
      <GameDock>
        <div className="flex flex-col gap-2">
          <ArcadeButton onClick={onRetry}>Nochmal spielen</ArcadeButton>
          <Button type="button" variant="outline" onClick={onSetup}>
            Schwierigkeit wählen
          </Button>
        </div>
      </GameDock>
    </>
  );
}
