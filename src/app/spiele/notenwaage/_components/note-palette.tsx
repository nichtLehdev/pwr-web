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
};

export function NotePalette({ ids, onAdd, onRemoveLastOf, disabled = false }: Props) {
  const pressTimer = useRef<number | null>(null);

  return (
    <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
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
              pressTimer.current = window.setTimeout(() => onRemoveLastOf(id), 420);
            }}
            onPointerUp={() => {
              if (pressTimer.current != null) window.clearTimeout(pressTimer.current);
              pressTimer.current = null;
            }}
            onPointerLeave={() => {
              if (pressTimer.current != null) window.clearTimeout(pressTimer.current);
              pressTimer.current = null;
            }}
            className={cn(
              "border-dark-border/60 dark:border-dark-border flex min-h-[64px] flex-col items-center justify-center rounded-sm border bg-white/80 p-2 transition active:scale-[0.98] dark:bg-dark-surface/60",
              !disabled && "hover:border-primary/50",
              disabled && "opacity-60",
            )}
          >
            <NoteGlyph id={id} className="h-9 w-9 md:h-10 md:w-10" />
            <span className="text-dark dark:text-dark-text mt-1 text-[11px] font-bold leading-tight">
              {def.label}
            </span>
            <span className="text-dark dark:text-dark-text-muted text-[10px] font-semibold">
              {unitsLabel(def.units)} Schlag
            </span>
          </button>
        );
      })}
    </div>
  );
}
