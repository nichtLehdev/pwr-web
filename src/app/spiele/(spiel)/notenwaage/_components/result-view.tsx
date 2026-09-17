"use client";

import {
  PartyPopper,
  RotateCcw,
  SlidersHorizontal,
  Trophy,
} from "lucide-react";
import { Button } from "@/app/_components/ui/button";

type Props = {
  score: number;
  solved: number;
  total: number;
  bestStreak: number;
  onRetry: () => void;
  onSetup: () => void;
};

export function NoteWaageResultView({
  score,
  solved,
  total,
  bestStreak,
  onRetry,
  onSetup,
}: Props) {
  const percent = total > 0 ? Math.round((100 * solved) / total) : 0;
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
          Runde beendet
        </p>
        {/* Orange ist im Heft eine Flaeche: als Schrift auf Papier nur 1,99:1,
            deshalb die Messing-Tinte — im Nachtdruck traegt Orange selbst. */}
        <p className="text-primary-ink dark:text-primary mt-2 text-4xl font-bold tabular-nums md:text-5xl">
          {score}
        </p>
        <p className="text-dark dark:text-night-muted mt-2 text-sm font-medium">
          Gelöst: {solved}/{total} · Beste First-Try-Serie: {bestStreak}
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button type="button" size="lg" className="gap-2" onClick={onRetry}>
          <RotateCcw className="h-5 w-5" aria-hidden />
          Nochmal spielen
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="gap-2"
          onClick={onSetup}
        >
          <SlidersHorizontal className="h-5 w-5" aria-hidden />
          Setup ändern
        </Button>
      </div>
    </div>
  );
}
