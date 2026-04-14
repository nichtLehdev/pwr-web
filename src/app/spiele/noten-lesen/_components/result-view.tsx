"use client";

import { PartyPopper, RotateCcw, SlidersHorizontal, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export type NoteReadingResult = {
  correct: number;
  total: number;
  bestStreakRound: number;
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
    <div className="space-y-5 border-t border-gray-200/90 pt-5 md:space-y-6 md:pt-6 dark:border-dark-border/80">
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
        <p className="text-dark dark:text-dark-text mt-3 text-lg font-black md:text-xl">
          {cheer(percent)}
        </p>
        <p className="text-primary dark:text-primary-light mt-2 text-4xl font-black tabular-nums md:text-5xl">
          {result.correct}/{result.total}
        </p>
        <p className="text-dark dark:text-dark-text-secondary mt-2 text-sm font-medium">
          {percent}% richtig · Beste Serie in der Runde: {result.bestStreakRound}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={onRetry}
          className="bg-primary hover:bg-primary-light dark:hover:bg-primary-dark inline-flex items-center justify-center gap-2 rounded-sm px-4 py-3.5 text-base font-black text-white transition active:scale-[0.99]"
        >
          <RotateCcw className="h-5 w-5 shrink-0 stroke-[2]" aria-hidden />
          Nochmal spielen
        </button>
        <button
          type="button"
          onClick={onChangeSetup}
          className={cn(
            "border-dark-border text-dark hover:bg-background-secondary dark:border-dark-border dark:text-dark-text dark:hover:bg-dark-background inline-flex items-center justify-center gap-2 rounded-sm border px-4 py-3.5 text-base font-bold transition-colors",
          )}
        >
          <SlidersHorizontal className="h-5 w-5 shrink-0 stroke-[2]" aria-hidden />
          Schwierigkeit / Modus
        </button>
      </div>
    </div>
  );
}
