import type { ClefKind, GermanLetter, WrittenPitch } from "./types";

const PC: Record<GermanLetter, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  H: 11,
};

/** Scientific octave (c′ = 4). */
export function writtenPitchToMidi(p: WrittenPitch): number {
  return (p.octave + 1) * 12 + PC[p.letter] + p.alter;
}

/** Diatonischer Buchstaben-Index (C=0 … H=6) für vorzeichenlose Stufenrechnung. */
const LETTER_DIATONIC_INDEX: Record<GermanLetter, number> = {
  C: 0,
  D: 1,
  E: 2,
  F: 3,
  G: 4,
  A: 5,
  H: 6,
};

/** Absoluter diatonischer Wert (Buchstabe + 7 × Oktave), Vorzeichen egal. */
function diatonicValue(letter: GermanLetter, octave: number): number {
  return LETTER_DIATONIC_INDEX[letter] + 7 * octave;
}

/**
 * Half-line index from bottom staff line (diatonic steps from bottom-line pitch).
 * Signiert: negative Werte für Töne unterhalb der untersten Linie.
 * Anker = Tonhöhe der untersten Linie (VexFlow):
 * Treble: E4; Bass: G2; Alto: F3 (C4 auf Linie 3); Tenor: D3 (C4 auf Linie 4).
 */
export function staffHalfLineIndex(p: WrittenPitch, clef: ClefKind): number {
  let anchor: [GermanLetter, number];
  switch (clef) {
    case "treble":
      anchor = ["E", 4];
      break;
    case "bass":
      anchor = ["G", 2];
      break;
    case "alto":
      anchor = ["F", 3];
      break;
    case "tenor":
      anchor = ["D", 3];
      break;
  }
  return (
    diatonicValue(p.letter, p.octave) - diatonicValue(anchor[0], anchor[1])
  );
}

/** Distance between staff positions (same accidental base line/space). */
export function staffDistance(
  a: WrittenPitch,
  b: WrittenPitch,
  clef: ClefKind,
): number {
  return Math.abs(staffHalfLineIndex(a, clef) - staffHalfLineIndex(b, clef));
}

export function answerLabelForPitch(p: WrittenPitch): string {
  const base = p.letter;
  if (p.alter === 1) {
    switch (base) {
      case "C":
        return "Cis";
      case "D":
        return "Dis";
      case "E":
        return "Eis";
      case "F":
        return "Fis";
      case "G":
        return "Gis";
      case "A":
        return "Ais";
      case "H":
        return "His";
    }
  }
  if (p.alter === -1) {
    if (p.letter === "H") return "B";
    if (p.letter === "A") return "As";
    if (p.letter === "E") return "Es";
    if (p.letter === "D") return "Des";
    if (p.letter === "G") return "Ges";
    if (p.letter === "C") return "Ces";
    if (p.letter === "F") return "Fes";
    return `${base}es`;
  }
  return base;
}

export function labelsMatchAnswer(
  tapped: string,
  pitch: WrittenPitch,
): boolean {
  return (
    normalizeAnswerLabel(tapped) ===
    normalizeAnswerLabel(answerLabelForPitch(pitch))
  );
}

/** Gleiche Bedeutung für Tipp-Vergleich (deutsch / Unicode). */
export function normalizeAnswerLabel(s: string): string {
  const t = s
    .replace(/\s+/g, "")
    .replace("♯", "#")
    .replace("♭", "b")
    .toLowerCase();

  const toCanon: Record<string, string> = {
    cis: "c#",
    des: "db",
    dis: "d#",
    es: "eb",
    eis: "e#",
    fis: "f#",
    ges: "gb",
    gis: "g#",
    as: "ab",
    ais: "a#",
    his: "h#",
    ces: "cb",
    fes: "fb",
    b: "bb",
  };
  return toCanon[t] ?? t;
}

/** Expanded bank for advanced UI (German conventions). */
export const ADVANCED_ANSWER_BANK: string[] = [
  "C",
  "D",
  "E",
  "F",
  "G",
  "A",
  "H",
  "Cis",
  "Dis",
  "Eis",
  "Fis",
  "Gis",
  "Ais",
  "His",
  "Ces",
  "Des",
  "Es",
  "Fes",
  "Ges",
  "As",
  "B",
];

export const NATURAL_ANSWER_BANK: string[] = [
  "C",
  "D",
  "E",
  "F",
  "G",
  "A",
  "H",
];
