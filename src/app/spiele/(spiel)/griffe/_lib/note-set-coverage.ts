import type { WrittenPitch } from "../../noten-lesen/_lib/types";
import type { NoteSetSummary } from "../../../_lib/note-sets";
import { griffeClef } from "./clef";
import { getRawFingeringEntry } from "./fingering-lookup";
import { GRIFFE_INSTRUMENTS, type GriffeInstrumentId } from "./types";

/**
 * Deckungsprüfung für Notensets aus der öffentlichen Bibliothek.
 *
 * Ein Set-Ton ist „spielbar", wenn das Spiel ihn für das gewählte Instrument
 * bewerten kann — also über denselben Lookup-Pfad wie die regulären Pools
 * (`getRawFingeringEntry`; für „Trompete in B — C-Stimme" ist der angezeigte
 * Ton Konzert, der Lookup verschiebt intern +2). Stimmt der Schlüssel des
 * Sets nicht mit dem Schlüssel des Instruments überein, ist nichts abgedeckt
 * (ein Violinschlüssel-Set ist auf der Posaune komplett unbrauchbar).
 */

/** Minimale Set-Sicht, die für die Abdeckung nötig ist. */
export type CoverageNoteSet = Pick<NoteSetSummary, "clef" | "pitches">;

export type GriffeNoteSetCoverage = {
  /** Töne mit Griff für das Instrument — der spielbare Pool. */
  covered: WrittenPitch[];
  /** Töne ohne Griff (oder falscher Schlüssel) — werden ausgelassen. */
  dropped: WrittenPitch[];
  total: number;
};

/** Struktur-kompatibel zu `NoteSetUsability` der Bibliothek. */
export type GriffeNoteSetUsability =
  { usable: true } | { usable: false; reason: string };

/** Unter 2 spielbaren Tönen ergibt kein Frage-Pool Sinn (Wiederholungs-Schutz). */
export const MIN_COVERED_PITCHES = 2;

export function griffeInstrumentLabel(instrument: GriffeInstrumentId): string {
  return (
    GRIFFE_INSTRUMENTS.find((i) => i.id === instrument)?.label ?? instrument
  );
}

export function noteSetCoverageForInstrument(
  set: CoverageNoteSet,
  instrument: GriffeInstrumentId,
): GriffeNoteSetCoverage {
  if (set.clef !== griffeClef(instrument)) {
    return {
      covered: [],
      dropped: [...set.pitches],
      total: set.pitches.length,
    };
  }
  const covered: WrittenPitch[] = [];
  const dropped: WrittenPitch[] = [];
  for (const p of set.pitches) {
    if (getRawFingeringEntry(instrument, p) != null) covered.push(p);
    else dropped.push(p);
  }
  return { covered, dropped, total: set.pitches.length };
}

/** Nutzbarkeit fürs Bibliotheks-Overlay: unter 2 spielbaren Tönen gesperrt. */
export function noteSetUsabilityForInstrument(
  set: CoverageNoteSet,
  instrument: GriffeInstrumentId,
): GriffeNoteSetUsability {
  const cov = noteSetCoverageForInstrument(set, instrument);
  const n = cov.covered.length;
  if (n < MIN_COVERED_PITCHES) {
    return {
      usable: false,
      reason: `Nur ${n} von ${cov.total} Noten ${
        n === 1 ? "hat" : "haben"
      } einen Griff für ${griffeInstrumentLabel(instrument)}`,
    };
  }
  return { usable: true };
}

/** Persistenter Setup-Hinweis, wenn bei Aktivierung Töne ausgelassen wurden. */
export function droppedNotesHint(
  droppedCount: number,
  instrument: GriffeInstrumentId,
): string {
  const label = griffeInstrumentLabel(instrument);
  return droppedCount === 1
    ? `1 Note ohne Griff für ${label} wurde ausgelassen.`
    : `${droppedCount} Noten ohne Griff für ${label} wurden ausgelassen.`;
}
