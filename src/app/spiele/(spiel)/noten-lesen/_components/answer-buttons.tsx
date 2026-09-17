"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { GAME_FOCUS_RING } from "../../../_lib/focus-ring";
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
  /** Während der Sperre: richtige Antwort (in Tinte markiert). */
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
              /* Höhe wächst mit dem Fenster, fällt aber nie unter 44 px. */
              className={cn(
                "relative flex min-h-[clamp(2.75rem,7dvh,4rem)] w-full items-center justify-center gap-1.5 border px-2 py-2 transition active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100",
                GAME_FOCUS_RING,
                marked ? "disabled:opacity-100" : "disabled:opacity-40",
                /* Richtig ist Tinte, nicht Grün — Grün ist keine Farbe des
                 * Hefts. Falsch bleibt Rot, die einzige Signalfarbe. */
                isCorrect &&
                  "border-ink bg-ink text-paper dark:border-night-text dark:bg-night-text dark:text-night",
                isPickedWrong &&
                  "border-red-700 bg-red-700/10 text-red-800 dark:border-red-500 dark:bg-red-500/15 dark:text-red-200",
                !marked &&
                  "border-rule text-ink hover:border-ink dark:border-night-rule dark:text-night-text dark:hover:border-night-text bg-transparent",
              )}
            >
              {/* Ziffern-Badge nur wo auch Tastenkürzel gelten (md+, wie der Hinweis). */}
              <span
                className="on-orange bg-primary text-ink absolute top-1 left-1 hidden h-5 min-w-5 items-center justify-center px-0.5 text-[10px] font-bold tabular-nums md:flex"
                aria-hidden
              >
                {n}
              </span>
              <span
                className={cn(
                  "font-bold",
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
          className="text-dark dark:text-night-muted hidden px-0.5 text-center text-xs leading-snug font-medium md:block"
        >
          {hints[0]}
        </p>
      )}
    </div>
  );
}
