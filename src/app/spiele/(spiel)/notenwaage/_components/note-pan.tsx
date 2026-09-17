"use client";

import { cn } from "@/lib/utils";
import { GAME_FOCUS_RING } from "../../../_lib/focus-ring";
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

/*
 * Höhen wachsen mit dem Fenster, statt fest zu stehen: Bei 1000px Fensterhöhe
 * war unter dem Inhalt fast ein Drittel der Zeile leer. `calc(… dvh - …px)`
 * bildet die Fensterhöhe abzüglich der festen Zeilen (Kopf, Aufgabe, Dock) ab
 * — eine reine dvh-Quote kann das nicht, weil der feste Anteil bei 650px fast
 * die ganze Zeile frisst.
 */
const REIHE_HOEHE =
  "min-h-[max(76px,min(calc(14dvh_-_8px),130px))] md:min-h-[max(76px,min(calc(13dvh_-_13px),150px))]";
// Die Noten wachsen mit der Schale: Sonst lagen in einer 180px hohen Schale
// weiterhin 36px kleine Zeichen, und die gewonnene Fläche blieb leer.
const GLYPH_GROSS =
  "h-[max(24px,min(calc(4.5dvh_-_10px),40px))] w-[max(24px,min(calc(4.5dvh_-_10px),40px))] md:h-[max(28px,min(calc(8dvh_-_30px),56px))] md:w-[max(28px,min(calc(8dvh_-_30px),56px))]";
const GLYPH_KLEIN =
  "h-[max(20px,min(calc(3.5dvh_-_8px),32px))] w-[max(20px,min(calc(3.5dvh_-_8px),32px))] md:h-[max(24px,min(calc(6dvh_-_24px),44px))] md:w-[max(24px,min(calc(6dvh_-_24px),44px))]";

export function NotePan({
  notes,
  title,
  editable = false,
  onRemoveAt,
  headerHint = null,
  slotCount,
}: Props) {
  const cellCount = slotCount ?? notes.length;
  const glyphClass = cellCount >= 6 ? GLYPH_KLEIN : GLYPH_GROSS;
  const emptySlots =
    slotCount != null ? Math.max(0, slotCount - notes.length) : 0;

  return (
    <div className="border-rule bg-rule/25 dark:border-night-rule dark:bg-night-raised border p-1 md:p-1.5">
      <p className="text-ink dark:text-night-text mb-0.5 text-center text-[10px] font-bold md:text-[11px]">
        {title}
        {headerHint && (
          <span className="text-dark dark:text-night-muted font-semibold">
            {" "}
            · {headerHint}
          </span>
        )}
      </p>
      <div
        className={cn(
          "flex flex-wrap items-center justify-center gap-0.5",
          REIHE_HOEHE,
        )}
      >
        {notes.length === 0 && slotCount == null && (
          <span className="text-dark dark:text-night-muted text-xs font-semibold">
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
              className={cn(
                "hover:bg-rule/60 dark:hover:bg-night-rule flex min-h-11 min-w-11 items-center justify-center p-0.5 motion-safe:active:scale-[0.95]",
                GAME_FOCUS_RING,
              )}
            >
              <NoteGlyph id={entry.id} className={glyphClass} />
            </button>
          ) : (
            <span
              key={entry.uid}
              role="img"
              aria-label={NOTE_VALUES[entry.id].label}
              className="flex min-h-11 min-w-11 items-center justify-center p-0.5"
            >
              <NoteGlyph id={entry.id} className={glyphClass} />
            </span>
          ),
        )}
        {Array.from({ length: emptySlots }, (_, i) => (
          <span
            key={`empty-${i}`}
            aria-hidden
            className="border-rule dark:border-night-rule flex min-h-11 min-w-11 items-center justify-center border border-dashed"
          />
        ))}
      </div>
    </div>
  );
}
