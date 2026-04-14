"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";
import { NOTE_VALUES, type NoteValueId } from "../_lib/types";
import { unitsLabel } from "../_lib/puzzle-generator";
import { NoteGlyph } from "./note-glyph";

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

  return (
    <div className="grid grid-cols-5 gap-1.5 md:grid-cols-5 md:gap-2">
      {ids.map((id) => {
        const def = NOTE_VALUES[id];
        return (
          <button
            key={id}
            type="button"
            disabled={disabled}
            onClick={() => onAdd(id)}
            onPointerDown={() => {
              if (disabled) return;
              pressTimer.current = window.setTimeout(
                () => onRemoveLastOf(id),
                420,
              );
            }}
            onPointerUp={() => {
              if (pressTimer.current != null)
                window.clearTimeout(pressTimer.current);
              pressTimer.current = null;
            }}
            onPointerLeave={() => {
              if (pressTimer.current != null)
                window.clearTimeout(pressTimer.current);
              pressTimer.current = null;
            }}
            className={cn(
              "border-dark-border/60 dark:border-dark-border dark:bg-dark-surface/60 flex min-h-[56px] flex-col items-center justify-center rounded-sm border bg-white/80 p-1.5 transition active:scale-[0.98] md:min-h-[64px] md:p-2",
              !disabled && "hover:border-primary/50",
              disabled && "opacity-60",
            )}
          >
            <NoteGlyph id={id} className="h-7 w-7 md:h-10 md:w-10" />
            {showDescriptions && (
              <>
                <span className="text-dark dark:text-dark-text mt-0.5 text-[9px] leading-tight font-bold md:mt-1 md:text-[11px]">
                  {def.label}
                </span>
                <span className="text-dark dark:text-dark-text-muted text-[9px] font-semibold md:text-[10px]">
                  {unitsLabel(def.units)} Schläge
                </span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
