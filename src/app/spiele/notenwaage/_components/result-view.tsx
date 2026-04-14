"use client";

import { PartyPopper, RotateCcw, SlidersHorizontal, Trophy } from "lucide-react";

type Props = {
  score: number;
  solved: number;
  total: number;
  bestStreak: number;
  onRetry: () => void;
  onSetup: () => void;
};

export function NoteWaageResultView({ score, solved, total, bestStreak, onRetry, onSetup }: Props) {
  const percent = total > 0 ? Math.round((100 * solved) / total) : 0;
  return (
    <div className="space-y-5 border-t border-gray-200/90 pt-5 md:space-y-6 md:pt-6 dark:border-dark-border/80">
      <div className="text-center">
        {percent >= 75 ? (
          <Trophy className="text-primary mx-auto h-12 w-12 stroke-[1.35] md:h-16 md:w-16" aria-hidden />
        ) : (
          <PartyPopper className="text-primary mx-auto h-12 w-12 stroke-[1.35] md:h-16 md:w-16" aria-hidden />
        )}
        <p className="text-dark dark:text-dark-text mt-3 text-lg font-black md:text-xl">Runde beendet</p>
        <p className="text-primary dark:text-primary-light mt-2 text-4xl font-black tabular-nums md:text-5xl">
          {score}
        </p>
        <p className="text-dark dark:text-dark-text-secondary mt-2 text-sm font-medium">
          Gelöst: {solved}/{total} · Beste First-Try-Serie: {bestStreak}
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={onRetry}
          className="bg-primary hover:bg-primary-light dark:hover:bg-primary-dark inline-flex items-center justify-center gap-2 rounded-sm px-4 py-3.5 text-base font-black text-white transition active:scale-[0.99]"
        >
          <RotateCcw className="h-5 w-5" aria-hidden />
          Nochmal spielen
        </button>
        <button
          type="button"
          onClick={onSetup}
          className="border-dark-border text-dark hover:bg-background-secondary dark:border-dark-border dark:text-dark-text dark:hover:bg-dark-background inline-flex items-center justify-center gap-2 rounded-sm border px-4 py-3.5 text-base font-bold transition-colors"
        >
          <SlidersHorizontal className="h-5 w-5" aria-hidden />
          Setup ändern
        </button>
      </div>
    </div>
  );
}
