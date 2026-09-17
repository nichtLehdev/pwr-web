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

/**
 * Punktestand für den Slot rechts in der Kopfleiste der Hülle (`GameBarSlot`).
 *
 * Vorher war das ein eigener Kasten im Inhalt — eine zweite Statusleiste
 * direkt unter der echten. Als Zeile in der Kopfleiste kostet sie keine
 * Bauhöhe mehr; die Nebenwerte treten erst ab `sm` dazu, damit auf dem Handy
 * neben Zurück-Link und Titel nichts umbricht.
 */
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
  const isQuiz = mode === "quiz";
  return (
    <div
      className={cn(
        "text-ink dark:text-night-text flex items-center gap-2 text-xs font-bold tabular-nums sm:gap-3 sm:text-sm",
        className,
      )}
    >
      {isQuiz && quizIndex !== undefined && quizTotal !== undefined && (
        <span>
          <span className="sr-only">Note </span>
          {quizIndex + 1}/{quizTotal}
        </span>
      )}
      {isQuiz && quizCorrect !== undefined && (
        <span className="text-dark dark:text-night-muted hidden font-semibold sm:inline">
          Richtig {quizCorrect}
        </span>
      )}
      <span>
        <span className="text-dark dark:text-night-muted font-semibold">
          Serie{" "}
        </span>
        {streak}
      </span>
      {bestStreak > 0 && (
        <span className="text-dark dark:text-night-muted hidden font-semibold sm:inline">
          Beste {bestStreak}
        </span>
      )}
      {isQuiz && secondsLeft != null && (
        <span
          /* Druckfeld statt farbiger Schrift; unter zwei Sekunden Rot. */
          className={cn(
            "on-orange px-1.5 py-0.5",
            secondsLeft <= 2 ? "text-paper bg-red-700" : "bg-primary text-ink",
          )}
        >
          {secondsLeft.toFixed(1)} s
        </span>
      )}
    </div>
  );
}
