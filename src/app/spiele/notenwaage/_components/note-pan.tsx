"use client";

import { cn } from "@/lib/utils";
import { NOTE_VALUES, type NoteValueId } from "../_lib/types";
import { NoteGlyph } from "./note-glyph-loader";

export type PanEntry = {
  /** Stabiler Schlüssel: bleibt beim Entfernen anderer Einträge erhalten. */
  uid: string | number;
  id: NoteValueId;
};

type Props = {
  notes: PanEntry[];
  title: string;
  editable?: boolean;
  onRemoveAt?: (idx: number) => void;
  headerHint?: string | null;
  /** Rechte Seite: feste Anzahl Felder — leere Felder als gestrichelte Slots. */
  slotCount?: number;
};

export function NotePan({
  notes,
  title,
  editable = false,
  onRemoveAt,
  headerHint = null,
  slotCount,
}: Props) {
  const cellCount = slotCount ?? notes.length;
  const glyphClass = cellCount >= 6 ? "h-5 w-5" : "h-6 w-6";
  const emptySlots =
    slotCount != null ? Math.max(0, slotCount - notes.length) : 0;

  return (
    <div className="border-dark-border/50 dark:border-dark-border dark:bg-dark-surface/40 rounded-sm border bg-white/60 p-1 md:p-1.5">
      <p className="text-dark dark:text-dark-text mb-0.5 text-center text-[10px] font-black md:text-[11px]">
        {title}
        {headerHint && (
          <span className="text-dark dark:text-dark-text-muted font-bold">
            {" "}
            · {headerHint}
          </span>
        )}
      </p>
      <div className="flex min-h-[70px] flex-wrap items-center justify-center gap-0.5 md:min-h-[76px]">
        {notes.length === 0 && slotCount == null && (
          <span className="text-dark dark:text-dark-text-muted text-xs font-semibold">
            leer
          </span>
        )}
        {notes.map((entry, idx) =>
          editable ? (
            <button
              key={entry.uid}
              type="button"
              onClick={() => onRemoveAt?.(idx)}
              aria-label={`${NOTE_VALUES[entry.id].label} entfernen`}
              className="hover:bg-dark-border/20 flex min-h-11 min-w-11 items-center justify-center rounded-sm p-0.5"
            >
              <NoteGlyph
                id={entry.id}
                className={cn(glyphClass, "md:h-8 md:w-8")}
              />
            </button>
          ) : (
            <span
              key={entry.uid}
              role="img"
              aria-label={NOTE_VALUES[entry.id].label}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-sm p-0.5"
            >
              <NoteGlyph
                id={entry.id}
                className={cn(glyphClass, "md:h-8 md:w-8")}
              />
            </span>
          ),
        )}
        {Array.from({ length: emptySlots }, (_, i) => (
          <span
            key={`empty-${i}`}
            aria-hidden
            className="border-dark-border/60 dark:border-dark-border flex min-h-11 min-w-11 items-center justify-center rounded-sm border border-dashed"
          />
        ))}
      </div>
    </div>
  );
}
