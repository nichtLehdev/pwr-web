import type { GermanLetter, WrittenPitch } from "./types";

const STEP: Record<GermanLetter, string> = {
  C: "c",
  D: "d",
  E: "e",
  F: "f",
  G: "g",
  A: "a",
  H: "b",
};

/** VexFlow `Accidental`-Typ oder `null` bei Naturtönen. */
export type VexAccidentalGlyph = "#" | "b";

/**
 * Notenkopf-Position ohne eingebettetes `#`/`b` im Key-String — Vorzeichen
 * als `Accidental`-Modifier setzen (VexFlow 5 zeigt sonst oft kein Kreuz/Be).
 */
export function writtenPitchToVexNoteKeyAndAccidental(p: WrittenPitch): {
  vexKey: string;
  accidental: VexAccidentalGlyph | null;
} {
  const s = STEP[p.letter];
  const o = p.octave;
  if (p.alter === 0) {
    return { vexKey: `${s}/${o}`, accidental: null };
  }
  if (p.alter === 1) {
    return { vexKey: `${s}/${o}`, accidental: "#" };
  }
  /* H mit Be → Vex-„b“-Stelle; übrige Halbtöne: Buchstabe mit b */
  if (p.letter === "H") {
    return { vexKey: `b/${o}`, accidental: "b" };
  }
  return { vexKey: `${s}/${o}`, accidental: "b" };
}

/**
 * Ein Key-String mit eingebettetem `#`/`b` (für `Accidental.applyAccidentals` + Vorzeichen).
 */
export function writtenPitchToVexKeyEmbedded(p: WrittenPitch): string {
  const s = STEP[p.letter];
  const o = p.octave;
  if (p.alter === 1) return `${s}#/${o}`;
  if (p.alter === -1) {
    if (p.letter === "H") return `bb/${o}`;
    return `${s}b/${o}`;
  }
  return `${s}/${o}`;
}
