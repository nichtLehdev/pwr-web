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
              "border-dark-border/60 dark:border-dark-border dark:bg-dark-surface/60 flex min-h-[56px] touch-manipulation flex-col items-center justify-center rounded-lg border bg-white/80 p-1.5 transition select-none motion-safe:active:scale-[0.98] md:min-h-[64px] md:p-2",
              GAME_FOCUS_RING,
              !disabled && "hover:border-primary/50",
              disabled && "opacity-60",
            )}
          >
            <NoteGlyph id={id} className="h-7 w-7 md:h-10 md:w-10" />
            {showDescriptions && (
              <>
                {/* Glyph-SVG ragt sichtbar unter seine Box (overflow visible) — Abstand statt Überlappung. */}
                <span className="text-dark dark:text-dark-text mt-5 text-[9px] leading-tight font-bold md:mt-6 md:text-[11px]">
                  {def.label}
                </span>
                <span className="text-dark dark:text-dark-text-muted text-[9px] font-semibold md:text-[10px]">
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
