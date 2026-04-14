"use client";

import { cn } from "@/lib/utils";
import type { NoteValueId } from "../_lib/types";
import { NoteGlyph } from "./note-glyph";
import { BeatCounter } from "./beat-counter";

type Props = {
  notes: NoteValueId[];
  targetUnits: number;
  currentUnits: number;
  editable?: boolean;
  onRemoveAt?: (idx: number) => void;
};

export function NotePan({ notes, targetUnits, currentUnits, editable = false, onRemoveAt }: Props) {
  return (
    <div className="border-dark-border/50 dark:border-dark-border rounded-sm border bg-white/60 p-2 dark:bg-dark-surface/40">
      <div className="flex min-h-[56px] flex-wrap items-center justify-center gap-1">
        {notes.length === 0 && (
          <span className="text-dark dark:text-dark-text-muted text-xs font-semibold">leer</span>
        )}
        {notes.map((id, idx) => (
          <button
            key={`${id}-${idx}`}
            type="button"
            disabled={!editable}
            onClick={() => onRemoveAt?.(idx)}
            className={cn("rounded-sm p-1", editable && "hover:bg-dark-border/20")}
          >
            <NoteGlyph id={id} className="h-8 w-8 md:h-9 md:w-9" />
          </button>
        ))}
      </div>
      <BeatCounter currentUnits={currentUnits} targetUnits={targetUnits} className="mt-1" />
    </div>
  );
}
