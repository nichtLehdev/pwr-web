"use client";

import { cn } from "@/lib/utils";
import { isChromaticDifficulty, type DifficultyId } from "../_lib/types";
import { keyboardHintLines } from "../_lib/answer-keyboard";

export type AnswerButtonsProps = {
  labels: string[];
  difficulty: DifficultyId;
  disabled: boolean;
  onPick: (label: string) => void;
};

export function AnswerButtons({
  labels,
  difficulty,
  disabled,
  onPick,
}: AnswerButtonsProps) {
  const isAdvanced = isChromaticDifficulty(difficulty);
  const hintId = "note-reading-keyboard-hint";
  const hints = keyboardHintLines(labels.length);

  return (
    <div
      className="flex w-full flex-col gap-2"
      data-note-reading-answers
      role="group"
      aria-label="Tonnamen"
      aria-describedby={hints.length ? hintId : undefined}
    >
      <div
        className={cn(
          "grid w-full gap-2",
          isAdvanced ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-1",
        )}
      >
        {labels.map((label, index) => {
          const n = index + 1;
          return (
            <button
              key={`${n}-${label}`}
              type="button"
              disabled={disabled}
              onClick={() => onPick(label)}
              className={cn(
                "flex min-h-[3.25rem] w-full items-center gap-3 rounded-sm border px-3 py-3 text-left transition active:scale-[0.99] disabled:opacity-40",
                "border-dark-border/60 text-dark bg-white/90 shadow-sm",
                "dark:border-dark-border dark:bg-dark-surface dark:text-dark-text",
                "hover:border-primary/45 dark:hover:border-primary/40",
                !isAdvanced && "md:text-xl",
                isAdvanced && "text-base md:text-lg",
              )}
            >
              <span
                className={cn(
                  "bg-primary/12 text-primary dark:bg-primary/20 dark:text-primary-light flex h-9 w-9 shrink-0 items-center justify-center rounded-sm text-sm font-black tabular-nums",
                  n >= 10 && "w-10 px-0.5",
                )}
                aria-hidden
              >
                {n}
              </span>
              <span className="font-black">{label}</span>
            </button>
          );
        })}
      </div>

      {hints.length > 0 && (
        <p
          id={hintId}
          className="text-dark dark:text-dark-text-muted hidden px-0.5 text-center text-xs leading-snug font-medium md:block"
        >
          {hints[0]}
        </p>
      )}
    </div>
  );
}
