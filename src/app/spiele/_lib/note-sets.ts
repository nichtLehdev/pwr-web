import type {
  ClefKind,
  GermanLetter,
  WrittenPitch,
} from "../(spiel)/noten-lesen/_lib/types";
import { pitchKey } from "../(spiel)/noten-lesen/_lib/ranges";
import {
  answerLabelForPitch,
  writtenPitchToMidi,
} from "../(spiel)/noten-lesen/_lib/pitch";

/**
 * Gemeinsames Client-Modell für Notensets aus der öffentlichen Bibliothek.
 * Ein Set = benannte Liste geschriebener Tonhöhen in einem Schlüssel; jedes
 * Spiel entscheidet selbst, ob und wie es das Set spielen kann.
 */

export type NoteSetSummary = {
  id: string;
  publicId: string;
  name: string;
  description: string | null;
  clef: ClefKind;
  pitches: WrittenPitch[];
  timesUsed: number;
  createdAt: Date | string;
  creatorId: string | null;
  creator: { displayName: string | null; username: string | null } | null;
};

export const NOTE_SET_CLEFS: ClefKind[] = ["treble", "bass", "alto", "tenor"];

export const CLEF_LABELS: Record<ClefKind, string> = {
  treble: "Violinschlüssel",
  bass: "Bassschlüssel",
  alto: "Altschlüssel",
  tenor: "Tenorschlüssel",
};

/** Wählbarer Tonvorrat je Schlüssel (≈ max. 3–4 Hilfslinien, wie Experten-Pools). */
export const NOTE_SET_CLEF_MIDI_BOUNDS: Record<
  ClefKind,
  { lo: number; hi: number }
> = {
  treble: { lo: 50, hi: 86 },
  bass: { lo: 34, hi: 71 },
  alto: { lo: 46, hi: 76 },
  tenor: { lo: 43, hi: 74 },
};

const LETTERS: GermanLetter[] = ["C", "D", "E", "F", "G", "A", "H"];

/**
 * Alle wählbaren Schreibweisen im Schlüsselbereich, gruppiert nach Oktave.
 * Jede Schreibweise (Es4, E4, Eis4 …) ist ein eigener Eintrag — genau die
 * Granularität, mit der Sets gebaut werden.
 */
export function selectablePitchesByOctave(
  clef: ClefKind,
): { octave: number; pitches: WrittenPitch[] }[] {
  const { lo, hi } = NOTE_SET_CLEF_MIDI_BOUNDS[clef];
  const byOctave = new Map<number, WrittenPitch[]>();
  for (let octave = 1; octave <= 7; octave++) {
    for (const letter of LETTERS) {
      for (const alter of [-1, 0, 1] as const) {
        const p: WrittenPitch = { letter, octave, alter };
        const midi = writtenPitchToMidi(p);
        if (midi < lo || midi > hi) continue;
        const list = byOctave.get(octave) ?? [];
        list.push(p);
        byOctave.set(octave, list);
      }
    }
  }
  return [...byOctave.entries()]
    .sort(([a], [b]) => a - b)
    .map(([octave, pitches]) => ({ octave, pitches }));
}

/** Anzeigename inkl. Oktave, z. B. „Es4", „H3". */
export function pitchLabelWithOctave(p: WrittenPitch): string {
  return `${answerLabelForPitch(p)}${p.octave}`;
}

export function noteSetPitchKey(p: WrittenPitch): string {
  return pitchKey(p);
}

/** Server-Payload (Json) defensiv in WrittenPitch[] umwandeln. */
export function parseNoteSetPitches(raw: unknown): WrittenPitch[] {
  if (!Array.isArray(raw)) return [];
  const out: WrittenPitch[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const { letter, alter, octave } = item as Record<string, unknown>;
    if (
      typeof letter === "string" &&
      (LETTERS as string[]).includes(letter) &&
      (alter === -1 || alter === 0 || alter === 1) &&
      typeof octave === "number" &&
      octave >= 1 &&
      octave <= 7
    ) {
      out.push({
        letter: letter as GermanLetter,
        alter,
        octave,
      });
    }
  }
  return out;
}

export function isValidClef(value: unknown): value is ClefKind {
  return (
    typeof value === "string" && (NOTE_SET_CLEFS as string[]).includes(value)
  );
}

/** Sortierung für stabile Anzeige: aufsteigend nach MIDI, bei Gleichstand ♭ vor ♯. */
export function sortPitchesForDisplay(pitches: WrittenPitch[]): WrittenPitch[] {
  return [...pitches].sort((a, b) => {
    const d = writtenPitchToMidi(a) - writtenPitchToMidi(b);
    if (d !== 0) return d;
    return a.alter - b.alter;
  });
}

/**
 * Rohe Set-Zeile, wie sie die tRPC-Prozeduren liefern (setListSelect):
 * `clef` ist ein unvalidierter String, `pitches` rohes JSON aus der DB.
 */
export type NoteSetRow = {
  id: string;
  publicId: string;
  name: string;
  description: string | null;
  clef: string;
  pitches: unknown;
  timesUsed: number;
  createdAt: Date | string;
  creatorId: string | null;
  creator: { displayName: string | null; username: string | null } | null;
};

/**
 * tRPC-Zeile defensiv ins Client-Modell überführen.
 * Liefert null bei kaputten Daten (unbekannter Schlüssel, leere Notenliste),
 * damit die UI solche Zeilen still überspringen kann.
 */
export function toNoteSetSummary(row: NoteSetRow): NoteSetSummary | null {
  if (!isValidClef(row.clef)) return null;
  const pitches = parseNoteSetPitches(row.pitches);
  if (pitches.length === 0) return null;
  return {
    id: row.id,
    publicId: row.publicId,
    name: row.name,
    description: row.description,
    clef: row.clef,
    pitches,
    timesUsed: row.timesUsed,
    createdAt: row.createdAt,
    creatorId: row.creatorId,
    creator: row.creator,
  };
}

/** Anzeigename der erstellenden Person (Fallback „Unbekannt"). */
export function noteSetCreatorLabel(set: NoteSetSummary): string {
  return set.creator?.displayName ?? set.creator?.username ?? "Unbekannt";
}
