"use client";

import { cn } from "@/lib/utils";
import type { GameModeId } from "../_lib/types";

export type ScoreBarProps = {
  mode: GameModeId;
  streak: number;
  bestStreak: number;
  quizCorrect?: number;
  quizIndex?: number;
  quizTotal?: number;
  secondsLeft?: number | null;
  className?: string;
};

export function ScoreBar({
  mode,
  streak,
  bestStreak,
  quizCorrect,
  quizIndex,
  quizTotal,
  secondsLeft,
  className,
}: ScoreBarProps) {
  return (
    <div
      className={cn(
        "border-dark-border/50 dark:border-dark-border dark:bg-dark-surface/60 flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-white/60 px-3 py-2 text-sm font-bold",
        className,
      )}
    >
      <div className="text-dark dark:text-dark-text flex flex-wrap gap-x-4 gap-y-1">
        <span>
          Streak: <span className="text-primary tabular-nums">{streak}</span>
        </span>
        <span className="text-dark dark:text-dark-text-muted font-semibold">
          Beste: <span className="tabular-nums">{bestStreak}</span>
        </span>
      </div>
      {mode === "quiz" &&
        quizIndex !== undefined &&
        quizTotal !== undefined && (
          <span className="text-dark dark:text-dark-text flex flex-wrap items-center gap-x-3 gap-y-1 tabular-nums">
            <span>
              Note {quizIndex + 1}/{quizTotal}
            </span>
            {quizCorrect !== undefined && (
              <span className="text-dark dark:text-dark-text-muted text-xs font-bold md:text-sm">
                Richtig: {quizCorrect}
              </span>
            )}
          </span>
        )}
      {mode === "quiz" && secondsLeft != null && (
        <span
          className={cn(
            "tabular-nums",
            secondsLeft <= 2
              ? "text-rose-600 dark:text-rose-400"
              : "text-primary",
          )}
        >
          {secondsLeft.toFixed(1)} s
        </span>
      )}
    </div>
  );
}
