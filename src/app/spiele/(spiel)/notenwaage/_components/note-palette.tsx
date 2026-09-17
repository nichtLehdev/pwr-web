"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";
import { GAME_FOCUS_RING } from "../../../_lib/focus-ring";
import { NOTE_VALUES, type NoteValueId } from "../_lib/types";
import { unitsToBeatLabel } from "../_lib/beat-label";
import { NoteGlyph } from "./note-glyph-loader";

type Props = {
  ids: NoteValueId[];
  onAdd: (id: NoteValueId) => void;
  onRemoveLastOf: (id: NoteValueId) => void;
  disabled?: boolean;
  showDescriptions?: boolean;
};

/*
 * Feld- und Notengröße folgen der Fensterhöhe (siehe note-pan.tsx). Der
 * Abstand zur Beschriftung ist genau die halbe Notengröße: Das VexFlow-SVG
 * ragt anteilig unter sein Kästchen (die Verschiebung in note-glyph.tsx ist
 * jetzt prozentual), also muss auch der Abstand mitwachsen — ein fester
 * `mt-5` saß bei großen Noten mitten im Notenhals.
 */
export const PALETTE_FELD =
  "min-h-[max(64px,min(calc(12dvh_-_14px),110px))] md:min-h-[max(72px,min(calc(28.3dvh_-_112px),190px))]";
export const PALETTE_GLYPH =
  "h-[max(26px,min(calc(5dvh_-_14px),44px))] w-[max(26px,min(calc(5dvh_-_14px),44px))] md:h-[max(34px,min(calc(10dvh_-_28px),80px))] md:w-[max(34px,min(calc(10dvh_-_28px),80px))]";
export const PALETTE_ABSTAND =
  "mt-[max(13px,min(calc(2.5dvh_-_7px),22px))] md:mt-[max(17px,min(calc(5dvh_-_14px),40px))]";

export function NotePalette({
  ids,
  onAdd,
  onRemoveLastOf,
  disabled = false,
  showDescriptions = true,
}: Props) {
  const pressTimer = useRef<number | null>(null);
  // Nach ausgelöstem Long-Press darf der folgende Click die Note nicht
  // gleich wieder hinzufügen — der Click wird einmalig verschluckt.
  const longPressFired = useRef(false);

  const clearPressTimer = () => {
    if (pressTimer.current != null) window.clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };

  return (
    <div
      className={cn(
        "grid gap-1.5 md:gap-2",
        ids.length <= 6 ? "grid-cols-3" : "grid-cols-5",
      )}
    >
      {ids.map((id) => {
        const def = NOTE_VALUES[id];
        return (
          <button
            key={id}
            type="button"
            disabled={disabled}
            aria-label={`${def.label} hinzufügen`}
            onClick={() => {
              if (longPressFired.current) {
                longPressFired.current = false;
                return;
              }
              onAdd(id);
            }}
            onPointerDown={() => {
              if (disabled) return;
              longPressFired.current = false;
              pressTimer.current = window.setTimeout(() => {
                longPressFired.current = true;
                onRemoveLastOf(id);
              }, 420);
            }}
            onPointerUp={clearPressTimer}
            onPointerLeave={clearPressTimer}
            onPointerCancel={clearPressTimer}
            onContextMenu={(e) => e.preventDefault()}
            className={cn(
              "border-rule dark:border-night-rule dark:bg-night-raised flex touch-manipulation flex-col items-center justify-center border p-1.5 transition-colors select-none motion-safe:active:scale-[0.98] md:p-2",
              PALETTE_FELD,
              GAME_FOCUS_RING,
              !disabled && "hover:bg-rule/25 dark:hover:bg-night-rule",
              disabled && "opacity-60",
            )}
          >
            <NoteGlyph id={id} className={PALETTE_GLYPH} />
            {showDescriptions && (
              <>
                <span
                  className={cn(
                    "text-ink dark:text-night-text text-[9px] leading-tight font-bold md:text-[11px]",
                    PALETTE_ABSTAND,
                  )}
                >
                  {def.label}
                </span>
                <span className="text-dark dark:text-night-muted text-[9px] font-semibold md:text-[10px]">
                  {unitsToBeatLabel(def.units)}
                </span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
