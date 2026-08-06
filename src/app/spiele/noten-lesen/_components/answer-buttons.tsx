"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AnswerLayout } from "../_lib/note-generator";
import { keyboardHintLines } from "../_lib/answer-keyboard";

export type AnswerButtonsProps = {
  labels: string[];
  /** Diatonisches 7er- oder chromatisches 12er-Raster (Spalten, Schriftgröße). */
  layout: AnswerLayout;
  disabled: boolean;
  onPick: (label: string) => void;
  /** Während der Sperre: getippte Antwort (rot bei Fehler markiert). */
  pickedLabel?: string | null;
  /** Während der Sperre: richtige Antwort (grün markiert). */
  correctLabel?: string | null;
};

export function AnswerButtons({
  labels,
  layout,
  disabled,
  onPick,
  pickedLabel = null,
  correctLabel = null,
}: AnswerButtonsProps) {
  const isAdvanced = layout === "chromatic";
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
          /* Feste Reihenfolge, kompaktes Raster — Labels sind 1–3 Zeichen. */
          isAdvanced
            ? "grid-cols-3 sm:grid-cols-4 md:grid-cols-6"
            : "grid-cols-4 md:grid-cols-7",
        )}
      >
        {labels.map((label, index) => {
          const n = index + 1;
          const isCorrect = correctLabel != null && label === correctLabel;
          const isPickedWrong =
            pickedLabel != null && label === pickedLabel && !isCorrect;
          const marked = isCorrect || isPickedWrong;
          return (
            <button
              key={`${n}-${label}`}
              type="button"
              disabled={disabled}
              onClick={() => onPick(label)}
              className={cn(
                "relative flex min-h-[3.25rem] w-full items-center justify-center gap-1.5 rounded-sm border px-2 py-2 transition active:scale-[0.99]",
                marked ? "disabled:opacity-100" : "disabled:opacity-40",
                isCorrect &&
                  "border-emerald-600 bg-emerald-500/15 text-emerald-900 dark:border-emerald-400 dark:bg-emerald-500/15 dark:text-emerald-200",
                isPickedWrong &&
                  "border-rose-600 bg-rose-500/10 text-rose-900 dark:border-rose-400 dark:bg-rose-500/15 dark:text-rose-200",
                !marked &&
                  "border-dark-border/60 text-dark bg-white/90 shadow-sm",
                !marked &&
                  "dark:border-dark-border dark:bg-dark-surface dark:text-dark-text",
                !marked &&
                  "hover:border-primary/45 dark:hover:border-primary/40",
              )}
            >
              {/* Ziffern-Badge nur wo auch Tastenkürzel gelten (md+, wie der Hinweis). */}
              <span
                className={cn(
                  "bg-primary/12 text-primary dark:bg-primary/20 dark:text-primary-light absolute top-1 left-1 hidden h-5 min-w-5 items-center justify-center rounded-sm px-0.5 text-[10px] font-black tabular-nums md:flex",
                )}
                aria-hidden
              >
                {n}
              </span>
              <span
                className={cn(
                  "font-black",
                  isAdvanced ? "text-base md:text-lg" : "text-lg md:text-xl",
                )}
              >
                {label}
              </span>
              {isCorrect && (
                <Check className="h-4 w-4 shrink-0 stroke-[3]" aria-hidden />
              )}
              {isPickedWrong && (
                <X className="h-4 w-4 shrink-0 stroke-[3]" aria-hidden />
              )}
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
