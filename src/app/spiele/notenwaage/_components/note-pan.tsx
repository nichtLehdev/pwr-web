"use client";

import { cn } from "@/lib/utils";
import type { NoteValueId } from "../_lib/types";
import { NoteGlyph } from "./note-glyph";

type Props = {
  notes: NoteValueId[];
  editable?: boolean;
  onRemoveAt?: (idx: number) => void;
  headerHint?: string | null;
};

export function NotePan({
  notes,
  editable = false,
  onRemoveAt,
  headerHint = null,
}: Props) {
  const mobileGlyphClass =
    notes.length >= 8
      ? "h-4 w-4"
      : notes.length >= 7
        ? "h-[18px] w-[18px]"
        : notes.length >= 6
          ? "h-5 w-5"
          : "h-6 w-6";

  return (
    <div className="border-dark-border/50 dark:border-dark-border dark:bg-dark-surface/40 rounded-sm border bg-white/60 p-1 md:p-1.5">
      {headerHint && (
        <p className="text-dark dark:text-dark-text-muted mb-0.5 text-center text-[10px] font-bold md:text-[11px]">
          {headerHint}
        </p>
      )}
      <div className="flex min-h-[70px] flex-nowrap items-center justify-center gap-0.5 overflow-hidden md:min-h-[76px]">
        {notes.length === 0 && (
          <span className="text-dark dark:text-dark-text-muted text-xs font-semibold">
            leer
          </span>
        )}
        {notes.map((id, idx) => (
          <button
            key={`${id}-${idx}`}
            type="button"
            disabled={!editable}
            onClick={() => onRemoveAt?.(idx)}
            className={cn(
              "rounded-sm p-0.5",
              editable && "hover:bg-dark-border/20",
            )}
          >
            <NoteGlyph
              id={id}
              className={cn(mobileGlyphClass, "md:h-8 md:w-8")}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
