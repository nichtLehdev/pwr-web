import type {
  DifficultyId,
  GermanLetter,
  InstrumentId,
  WrittenPitch,
} from "../../noten-lesen/_lib/types";
import { midiToWrittenPitch, pitchPool } from "../../noten-lesen/_lib/ranges";
import type { GriffeDifficultyId, GriffeInstrumentId } from "./types";

/** B‑Trompete nutzt denselben geschriebenen Pool wie die C‑Stimme. */
export function griffeToNotenInstrumentId(
  id: GriffeInstrumentId,
): InstrumentId {
  if (id === "trumpet_bb") return "trumpet_c";
  return id as InstrumentId;
}

function p(
  letter: GermanLetter,
  octave: number,
  alter: -1 | 0 | 1 = 0,
): WrittenPitch {
  return { letter, octave, alter };
}

/**
 * Griffe-eigene Pools, B-Dur-orientiert wie Bläserschulen beginnen — bewusst
 * unabhängig vom Noten-Lese-Spiel (dessen Lese-Umfänge ergäben z. B. einen
 * Posaunen-Anfänger rund um den 2. Zug statt um B2).
 */

/** Posaune (Konzert, Bassschlüssel): Anfänger = B2–F3 in B-Dur. */
const TROMBONE_BEGINNER: WrittenPitch[] = [
  p("H", 2, -1), // B2 — 1. Zug
  p("C", 3), // C3 — 6. Zug
  p("D", 3), // D3 — 4. Zug
  p("E", 3, -1), // Es3 — 3. Zug
  p("F", 3), // F3 — 1. Zug
];

/** Mittel: dazu As3/G3/A3/B3 — obere B-Dur-Umgebung. */
const TROMBONE_INTERMEDIATE: WrittenPitch[] = [
  ...TROMBONE_BEGINNER,
  p("G", 3), // G3 — 4. Zug
  p("A", 3, -1), // As3 — 3. Zug
  p("A", 3), // A3 — 2. Zug
  p("H", 3, -1), // B3 — 1. Zug
];

/**
 * Trompete (geschriebene B-Lage; für die C-Stimme wird in `pick-pitch` −2
 * nach Konzert gewandelt → dort B3, C4, D4, Es4, F4 in B-Dur).
 * Anfänger: geschriebenes C4–G4 diatonisch.
 */
const TRUMPET_BEGINNER: WrittenPitch[] = [
  p("C", 4), // C4 — offen
  p("D", 4), // D4 — 1+3
  p("E", 4), // E4 — 1+2
  p("F", 4), // F4 — 1
  p("G", 4), // G4 — offen
];

/** Mittel: dazu Fis4/B4-Region sowie A4, H4, C5. */
const TRUMPET_INTERMEDIATE: WrittenPitch[] = [
  ...TRUMPET_BEGINNER,
  p("F", 4, 1), // Fis4 — 2
  p("A", 4), // A4 — 1+2
  p("H", 4, -1), // B4 — 1
  p("H", 4), // H4 — 2
  p("C", 5), // C5 — offen
];

/**
 * Fortgeschritten: kompletter chromatischer Bereich der jeweiligen
 * Grifftabelle in **Anzeige-MIDI** (C-Stimme = Konzert = Stimmton − 2).
 */
export function griffeAdvancedDisplayMidiRange(
  instrument: GriffeInstrumentId,
): {
  lo: number;
  hi: number;
} {
  if (instrument === "trombone") return { lo: 40, hi: 67 }; // E2–G4 (Konzert)
  if (instrument === "tuba") return { lo: 34, hi: 65 }; // B1–F4 (Konzert)
  if (instrument === "trumpet_c") return { lo: 52, hi: 86 }; // Konzert E3–D6
  return { lo: 54, hi: 88 }; // geschriebenes Ges3–E6
}

/** Kreuz-Schreibweise zu den schwarzen Tasten (Cis, Dis, Fis, Gis, Ais). */
function sharpEnharmonic(midi: number): WrittenPitch | null {
  const pc = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  switch (pc) {
    case 1:
      return { letter: "C", octave, alter: 1 };
    case 3:
      return { letter: "D", octave, alter: 1 };
    case 6:
      return { letter: "F", octave, alter: 1 };
    case 8:
      return { letter: "G", octave, alter: 1 };
    case 10:
      return { letter: "A", octave, alter: 1 };
    default:
      return null;
  }
}

/**
 * Übliche Schreibweisen eines MIDI-Tons: erst die Flach-Schreibweise
 * (Des, Es, …), bei schwarzen Tasten zusätzlich die Kreuz-Variante.
 * Auswahl geschieht in `pick-pitch` **nach** dem gleichverteilten MIDI-Wurf,
 * damit schwarze Tasten nicht doppelt gewichtet werden.
 */
export function spellingsForMidi(midi: number): WrittenPitch[] {
  const flat = midiToWrittenPitch(midi);
  const sharp = sharpEnharmonic(midi);
  return sharp ? [flat, sharp] : [flat];
}

/**
 * Anfänger/Mittel: kleine feste Pools (oben). Fortgeschritten wird in
 * `pick-pitch` über `griffeAdvancedDisplayMidiRange` chromatisch gewürfelt.
 * Tuba ist (noch) nicht auswählbar und bleibt auf dem Noten-Lese-Pool.
 */
export function griffePitchPool(
  instrument: GriffeInstrumentId,
  difficulty: GriffeDifficultyId,
): WrittenPitch[] {
  if (instrument === "tuba") {
    const ni = griffeToNotenInstrumentId(instrument);
    if (difficulty === "beginner") {
      return pitchPool(ni, "beginner" as DifficultyId).slice(0, 6);
    }
    return pitchPool(ni, "beginner" as DifficultyId);
  }
  if (instrument === "trombone") {
    return difficulty === "intermediate"
      ? TROMBONE_INTERMEDIATE
      : TROMBONE_BEGINNER;
  }
  return difficulty === "intermediate"
    ? TRUMPET_INTERMEDIATE
    : TRUMPET_BEGINNER;
}
