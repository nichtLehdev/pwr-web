import type { GeneratedRhythm, RhythmEvent, TimeSignature } from "./types";

/**
 * Reine Arithmetik-Validierung ohne VexFlow: der Generator arbeitet in exakten
 * Sechzehntel-Einheiten, also reichen Ticksummen + ms-Konsistenz. Der
 * VexFlow-Gegencheck lebt weiter in `rhythm-validation.ts` (nur lazy geladen),
 * damit die Route-Bundle-Größe klein bleibt.
 */

/** Sechzehntel-Einheiten pro Takt (z. B. 4/4 → 16, 3/4 → 12, 6/8 → 12). */
export function barLengthInUnits(ts: TimeSignature): number {
  return (ts.numerator * 16) / ts.denominator;
}

/** Sechzehntel-Einheiten je Notenwert (ohne Triolen-Verzerrung). */
function unitsForNoteValue(noteValue: string): number | null {
  switch (noteValue) {
    case "w":
      return 16;
    case "h":
      return 8;
    case "qd":
      return 6;
    case "q":
      return 4;
    case "8":
      return 2;
    case "16":
      return 1;
    default:
      return null;
  }
}

/**
 * Metronom-Puls: bei x/8-Taktarten zählt man in punktierten Vierteln
 * (6/8 → 2 Schläge pro Takt), sonst im Nenner-Schlag (x/4 → Viertel).
 */
export function pulseInfoForTimeSignature(ts: TimeSignature): {
  /** Sechzehntel-Einheiten pro Puls-Schlag. */
  beatUnits: number;
  /** Puls-Schläge pro Takt. */
  beatsPerBar: number;
} {
  if (ts.denominator === 8 && ts.numerator % 3 === 0) {
    return { beatUnits: 6, beatsPerBar: ts.numerator / 3 };
  }
  return { beatUnits: 16 / ts.denominator, beatsPerBar: ts.numerator };
}

/** Dauer eines Puls-Schlags in ms (bpm ist immer Viertel-bezogen). */
export function pulseMsForTimeSignature(
  ts: TimeSignature,
  bpm: number,
): number {
  const sixteenthMs = 60000 / bpm / 4;
  return pulseInfoForTimeSignature(ts).beatUnits * sixteenthMs;
}

/** Erwartete Klingdauer laut Taktart × Taktzahl (muss zu den Events passen). */
export function expectedRhythmDurationMs(
  timeSignature: TimeSignature,
  bars: number,
  bpm: number,
): number {
  const sixteenthMs = 60000 / bpm / 4;
  return barLengthInUnits(timeSignature) * bars * sixteenthMs;
}

export function totalDurationMs(events: RhythmEvent[]): number {
  return events.reduce((s, e) => s + e.durationMs, 0);
}

/**
 * Tick-Summe eines Event-Abschnitts in Sechzehntel-Einheiten.
 * Triolengruppen zählen als belegter Raum (notesOccupied × Grundwert),
 * nicht als 3 × Einzelnote. Rückgabe null bei unbekanntem Notenwert
 * oder am Taktende zerrissener Triole.
 */
export function eventTickUnits(events: RhythmEvent[]): number | null {
  let units = 0;
  let i = 0;
  while (i < events.length) {
    const ev = events[i]!;
    if (ev.tupletGroupId !== undefined) {
      const gid = ev.tupletGroupId;
      const numNotes = ev.tupletNumNotes ?? 3;
      const occupied = ev.tupletNotesOccupied ?? 2;
      const base = unitsForNoteValue(ev.noteValue);
      if (base === null) return null;
      let count = 0;
      while (i < events.length && events[i]?.tupletGroupId === gid) {
        count++;
        i++;
      }
      if (count !== numNotes) return null;
      units += occupied * base;
    } else {
      const u = unitsForNoteValue(ev.noteValue);
      if (u === null) return null;
      units += u;
      i++;
    }
  }
  return units;
}

/** Events je Takt (erster Takt beginnt bei 0, Rest laut `barStartEventIndices`). */
export function splitEventsIntoBars(rhythm: GeneratedRhythm): RhythmEvent[][] {
  const starts = [0, ...rhythm.barStartEventIndices, rhythm.events.length];
  const barsOut: RhythmEvent[][] = [];
  for (let b = 0; b < starts.length - 1; b++) {
    barsOut.push(rhythm.events.slice(starts[b], starts[b + 1]));
  }
  return barsOut;
}

/** Jeder Takt muss exakt die Taktart füllen (Sechzehntel-Ticksumme). */
export function barsFillTimeSignature(rhythm: GeneratedRhythm): boolean {
  const target = barLengthInUnits(rhythm.timeSignature);
  const perBar = splitEventsIntoBars(rhythm);
  if (perBar.length !== rhythm.bars) return false;
  return perBar.every((events) => eventTickUnits(events) === target);
}

/** Triolen: 3×(spanMs/3) weicht minimal von spanMs ab. */
const MS_EPS = 8;

export function durationMatchesClock(
  rhythm: GeneratedRhythm,
  bpm: number,
): boolean {
  const expected = expectedRhythmDurationMs(
    rhythm.timeSignature,
    rhythm.bars,
    bpm,
  );
  const actual = totalDurationMs(rhythm.events);
  return Math.abs(actual - expected) < MS_EPS;
}

/** Arithmetik-Check: Takte gefüllt + Gesamtdauer passt zum Metronom. */
export function rhythmIsWellFormedArithmetic(
  rhythm: GeneratedRhythm,
  bpm: number,
): boolean {
  if (!barsFillTimeSignature(rhythm)) return false;
  return durationMatchesClock(rhythm, bpm);
}
