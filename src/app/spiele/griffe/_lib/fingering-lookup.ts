import { writtenPitchToMidi } from "../../noten-lesen/_lib/pitch";
import { pitchKey } from "../../noten-lesen/_lib/ranges";
import type { WrittenPitch } from "../../noten-lesen/_lib/types";
import type { GriffeDifficultyId, GriffeInstrumentId } from "./types";

export type FingeringEntry = {
  /** Jede innere Liste ist eine gültige Kombination (Ventile „1+2“ als ein String). */
  variants: string[][];
  merkhilfe?: string;
};

function entry(v: string[][], m?: string): FingeringEntry {
  return { variants: v, merkhilfe: m };
}

/**
 * Trompeten-Griffe nach **B‑Trompeten‑Stimm‑/Schreib‑MIDI** (Tabelle = Griffe
 * für den auf der B‑Stimme notierten Ton).
 * **Trompete in C** im Spiel: System zeigt **Konzertton** → Lookup `+2`.
 * **Trompete in B**: System zeigt **geschriebenen B‑Ton** → Lookup ohne Verschiebung.
 */
/**
 * Standard-Griffe geschriebener B‑Trompeten‑Töne (Mittel‑/Oberregister),
 * mit üblichen Alternativen. Nicht jede Intonations‑Variante ist enthalten.
 *
 * **Tieflage:** 42–51 Pedal/Grundtonlage, 52–60 E3–C4 — Alternativen, wo
 * Lehrbücher streuen; sehr tief von Modell und Ansatz abhängig.
 *
 * **Zeilenkommentare:** `MIDI` = Index in dieser Tabelle (= **Stimmton** /
 * geschriebener B‑Trompeten‑Ton). **Konzert:** klingender Ton (eine große
 * Sekunde tiefer, gleiche Benennung wie `midiToWrittenPitch(MIDI − 2)`).
 */
const TRUMPET_BY_MIDI: Partial<Record<number, FingeringEntry>> = {
  // 55 — Stimm Ges3 — Konzert: E3
  54: entry([["1", "2", "3"]]),
  // 57 — Stimm G3 — Konzert: F3
  55: entry([["1", "3"]]),
  // 57 — Stimm As3 — Konzert: Ges3
  56: entry([["2", "3"]]),
  // 58 — Stimm A3 — Konzert: G3
  57: entry([["1", "2"], ["3"]]),
  // 58 — Stimm B3 — Konzert: As3
  58: entry([["1"]]),
  //  — Stimm H3 — Konzert: A3
  59: entry([["2"]]),
  // 60 — Stimm C4 — Konzert: B3
  60: entry([["0"]]),
  // 61 — Stimm Des4 — Konzert: H3
  61: entry([["1", "2", "3"]]),
  // 62 — Stimm D4 — Konzert: C4
  62: entry([["1", "3"]]),
  // 63 — Stimm Es4 — Konzert: Des4
  63: entry([["2", "3"]]),
  // 64 — Stimm E4 — Konzert: D4
  64: entry([["1", "2"], ["3"]]),
  // 65 — Stimm F4 — Konzert: Es4
  65: entry([["1"]]),
  // 66 - Stimm Fis4 - Konzert: E4
  66: entry([["2"]]),
  // 67 — Stimm G4 — Konzert: F4
  67: entry([["0"], ["1", "3"]]),
  // 68 — Stimm As4 — Konzert: Ges4
  68: entry([["2", "3"]]),
  // 69 — Stimm A4 — Konzert: G4
  69: entry([["1", "2"], ["3"]]),
  // 70 — Stimm B4 — Konzert: As4
  70: entry([["1"]]),
  // 71 — Stimm H4 — Konzert: A4
  71: entry([["2"]]),
  // 72 — Stimm C5 — Konzert: B4
  72: entry([["0"]]),
  // 73 — Stimm Des5 — Konzert: H4
  73: entry([["1", "2"], ["3"]]),
  // 74 — Stimm D5 — Konzert: C5
  74: entry([["1"], ["1", "3"]]),
  // 75 — Stimm Es5 — Konzert: Des5
  75: entry([["2", "3"]]),
  // 76 — Stimm E5 — Konzert: D5
  76: entry([["0"], ["1", "2"], ["3"]]),
  // 77 — Stimm F5 — Konzert: Es5
  77: entry([["1"]]),
  // 78 — Stimm Ges5 — Konzert: E5
  78: entry([["2"]]),
  // 79 — Stimm G5 — Konzert: F5
  79: entry([["0"], ["1", "3"]]),
  // 80 — Stimm As5 — Konzert: Ges5
  80: entry([["2", "3"]]),
  // 81 — Stimm A5 — Konzert: G5
  81: entry([["1", "2"], ["3"]]),
  // 82 — Stimm B5 — Konzert: As5
  82: entry([["1"]]),
  // 83 — Stimm H5 — Konzert: A5
  83: entry([["2"]]),
  // 84 — Stimm C6 — Konzert: B5
  84: entry([["0"]]),
  // 85 — Stimm Des6 — Konzert: H5
  85: entry([
    ["1", "2"],
    ["1", "2", "3"],
  ]),
  // 86 — Stimm D6 — Konzert: C6
  86: entry([["1"]]),
  // 87 — Stimm Es6 — Konzert: Des6
  87: entry([["2", "3"]]),
  // 88 — Stimm E6 — Konzert: D6
  88: entry([["0"], ["1", "2"]]),
};

/**
 * BBb‑Tuba (4 Ventile), grobe Standard‑Zuordnung — Intonation stark vom Modell.
 * Nicht jede Lehrbuch‑Alternative ist abgebildet.
 *
 * **MIDI** = Index wie `writtenPitchToMidi` für die im Spiel gezeigte Note
 * (Konzert- bzw. geschriebene Tonhöhe im Bassschlüssel, kein Stimm-Offset in
 * dieser Tabelle).
 */
const TUBA_BY_MIDI: Partial<Record<number, FingeringEntry>> = {
  // 34 — Konzert: B1
  34: entry([["1", "2", "3", "4"]]),
  // 35 — Konzert: H1
  35: entry([["1", "2", "3"]]),
  // 36 — Konzert: C2
  36: entry([["1", "2"]]),
  // 37 — Konzert: Des2
  37: entry([["1", "3", "4"]]),
  // 38 — Konzert: D2
  38: entry([["1", "3"]]),
  // 39 — Konzert: Es2
  39: entry([["1", "2", "4"]]),
  // 40 — Konzert: E2
  40: entry([["1", "2"]]),
  // 41 — Konzert: F2
  41: entry([["1", "4"]]),
  // 42 — Konzert: Ges2
  42: entry([["1"]]),
  // 43 — Konzert: G2
  43: entry([["2", "3", "4"]]),
  // 44 — Konzert: As2
  44: entry([["2", "3"]]),
  // 45 — Konzert: A2
  45: entry([["2", "4"]]),
  // 46 — Konzert: B2
  46: entry([["2"]]),
  // 47 — Konzert: H2
  47: entry([["3", "4"]]),
  // 48 — Konzert: C3
  48: entry([["3"]]),
  // 49 — Konzert: Des3
  49: entry([["4"]]),
  // 50 — Konzert: D3
  50: entry([["0"], ["1", "3"]]),
  // 51 — Konzert: Es3
  51: entry([["2", "3"]]),
  // 52 — Konzert: E3
  52: entry([["1", "2", "4"]]),
  // 53 — Konzert: F3
  53: entry([["1", "2"]]),
  // 54 — Konzert: Ges3
  54: entry([["1", "3"]]),
  // 55 — Konzert: G3
  55: entry([["1"]]),
  // 56 — Konzert: As3
  56: entry([["2", "3"]]),
  // 57 — Konzert: A3
  57: entry([["2"]]),
  // 58 — Konzert: B3
  58: entry([["3"]]),
  // 59 — Konzert: H3
  59: entry([["0"]]),
  // 60 — Konzert: C4
  60: entry([["1", "2"]]),
  // 61 — Konzert: Des4
  61: entry([["1", "3", "4"]]),
  // 62 — Konzert: D4
  62: entry([["1", "3"]]),
  // 63 — Konzert: Es4
  63: entry([["1", "2", "4"]]),
  // 64 — Konzert: E4
  64: entry([["1", "2"]]),
  // 65 — Konzert: F4
  65: entry([
    ["2", "3", "4"],
    ["1", "4"],
  ]),
  // 66 — Konzert: Ges4
  66: entry([["2", "3"]]),
  // 67 — Konzert: G4
  67: entry([["1", "2", "3"]]),
  // 68 — Konzert: As4
  68: entry([["1", "2"]]),
  // 69 — Konzert: A4
  69: entry([["1", "3"]]),
  // 70 — Konzert: B4
  70: entry([["1"]]),
  // 71 — Konzert: H4
  71: entry([["2", "3"]]),
  // 72 — Konzert: C5
  72: entry([["2"]]),
  // 73 — Konzert: Des5
  73: entry([["3"]]),
  // 74 — Konzert: D5
  74: entry([["0"], ["1", "2", "3", "4"]]),
  // 75 — Konzert: Es5
  75: entry([["1", "2", "3"]]),
  // 76 — Konzert: E5
  76: entry([["1", "2"]]),
  // 77 — Konzert: F5
  77: entry([["1", "3"]]),
};

/**
 * Posaune: Scaffold fuer manuelle Zuordnung.
 * Bereich: G4 (MIDI 69) abwaerts bis E2 (MIDI 40).
 *
 * Pro Eintrag:
 * - erste Variante = Standard
 * - weitere Varianten = Alternativen
 * Notation:
 * - `2+` = hoher 2. Platz
 * - `2-` = tiefer 2. Platz
 * - `*1` = 1. Platz mit Quartventil
 * Beispiel: entry([["2+"], ["2-"], ["*1"]])
 */
const TROMBONE_BY_MIDI: Partial<Record<number, FingeringEntry>> = {
  // 69 - Konzert: G4
  67: entry([["2+"], ["4"]]), // TODO
  // 68 - Konzert: Ges4
  66: entry([["3+"]]), // TODO
  // 67 - Konzert: F4
  65: entry([["1"]]), // TODO
  // 66 - Konzert: E4
  64: entry([["2"]]), // TODO
  // 65 - Konzert: Es4
  63: entry([["3"]]), // TODO
  // 64 - Konzert: D4
  62: entry([["1"], ["4"]]), // TODO
  // 63 - Konzert: Des4
  61: entry([["2"]]), // TODO
  // 62 - Konzert: C4
  60: entry([["3"]]), // TODO
  // 61 - Konzert: H3
  59: entry([["4"]]), // TODO
  // 60 - Konzert: B3
  58: entry([["1"]]), // TODO
  // 59 - Konzert: A3
  57: entry([["2"]]), // TODO
  // 58 - Konzert: As3
  56: entry([["3"]]), // TODO
  // 57 - Konzert: G3
  55: entry([["4"]]), // TODO
  // 56 - Konzert: Ges3
  54: entry([["5"]]), // TODO
  // 55 - Konzert: F3
  53: entry([["1"]]), // TODO
  // 54 - Konzert: E3
  52: entry([["2"]]), // TODO
  // 53 - Konzert: Es3
  51: entry([["3"]]), // TODO
  // 52 - Konzert: D3
  50: entry([["4"]]), // TODO
  // 51 - Konzert: Des3
  49: entry([["5"]]), // TODO
  // 50 - Konzert: C3
  48: entry([["6"], ["*1"]]), // TODO
  // 49 - Konzert: H2
  47: entry([["7"], ["*2"]]), // TODO
  // 48 - Konzert: B2
  46: entry([["1"]]), // TODO
  // 47 - Konzert: A2
  45: entry([["2"]]), // TODO
  // 46 - Konzert: As2
  44: entry([["3"]]), // TODO
  // 45 - Konzert: G2
  43: entry([["4"]]), // TODO
  // 44 - Konzert: Ges2
  42: entry([["5"]]), // TODO
  // 43 - Konzert: F2
  41: entry([["6"]]), // TODO
  // 42 - Konzert: E2
  40: entry([["7"]]), // TODO
};

function tableFor(
  inst: GriffeInstrumentId,
): Partial<Record<number, FingeringEntry>> {
  if (inst === "trombone") return TROMBONE_BY_MIDI;
  if (inst === "tuba") return TUBA_BY_MIDI;
  return TRUMPET_BY_MIDI;
}

/** Konzerttonlage auf dem System → MIDI in der B‑Trompeten‑Grifftabelle (+2). */
function trumpetTableMidiFromConcertDisplayMidi(concertMidi: number): number {
  return concertMidi + 2;
}

export function getRawFingeringEntry(
  inst: GriffeInstrumentId,
  p: WrittenPitch,
): FingeringEntry | null {
  const m = writtenPitchToMidi(p);
  const t = tableFor(inst);

  if (inst === "trumpet_c" || inst === "trumpet_bb") {
    const lk =
      inst === "trumpet_c" ? trumpetTableMidiFromConcertDisplayMidi(m) : m;
    return TRUMPET_BY_MIDI[lk] ?? null;
  }

  return t[m] ?? null;
}

/** Für Anfänger/Mittel nur erste Variante; Fortgeschritten alle. */
export function fingeringsForDifficulty(
  inst: GriffeInstrumentId,
  p: WrittenPitch,
  difficulty: GriffeDifficultyId,
): FingeringEntry | null {
  const raw = getRawFingeringEntry(inst, p);
  if (!raw) return null;
  if (difficulty === "advanced") return raw;
  return {
    variants: [raw.variants[0]!],
    merkhilfe: raw.merkhilfe,
  };
}

export function fingeringSetsEqual(a: string[], b: string[]): boolean {
  const norm = (s: string[]) =>
    [...s]
      .map((x) => x.trim())
      .filter((x) => x && x !== "0")
      .sort()
      .join("+");
  return norm(a) === norm(b);
}

/** Spieler-Eingabe „1+2“ oder Posaune eine Ziffer → Stringliste. */
export function parseValveInput(s: string): string[] {
  const t = s.trim().toLowerCase();
  if (t === "0" || t === "offen" || t === "") return [];
  return t
    .split("+")
    .map((x) => x.trim())
    .filter(Boolean);
}

export function formatValveLabel(valves: string[]): string {
  const pressed = [...valves]
    .map((x) => x.trim())
    .filter((x) => x && x !== "0");
  if (pressed.length === 0) return "offen";
  return pressed.sort((a, b) => Number(a) - Number(b)).join("+");
}

export function formatSlideLabel(token: string): string {
  const t = token.trim();
  const quart = t.startsWith("*");
  const raw = quart ? t.slice(1) : t;
  const m = raw.match(/^([1-7])([+-])?$/);
  if (!m) return `${token}. Platz`;
  const pos = m[1]!;
  const sign = m[2];
  if (quart) return `${pos}. Platz (mit Quartventil)`;
  if (sign === "+") return `hoher ${pos}. Platz`;
  if (sign === "-") return `tiefer ${pos}. Platz`;
  return `${pos}. Platz`;
}

export function formatVariantDisplay(
  inst: GriffeInstrumentId,
  combo: string[],
): string {
  if (inst === "trombone") {
    return formatSlideLabel(combo[0] ?? "?");
  }
  return formatValveLabel(combo);
}

export function isAnswerCorrect(
  inst: GriffeInstrumentId,
  pitch: WrittenPitch,
  difficulty: GriffeDifficultyId,
  submitted: string[][],
): boolean {
  const entry = fingeringsForDifficulty(inst, pitch, difficulty);
  if (!entry || submitted.length === 0) return false;
  for (const alt of entry.variants) {
    for (const sub of submitted) {
      if (fingeringSetsEqual(sub, alt)) return true;
    }
  }
  return false;
}

export function isAnswerCorrectAdvancedAll(
  inst: GriffeInstrumentId,
  pitch: WrittenPitch,
  submitted: string[][],
): boolean {
  const raw = getRawFingeringEntry(inst, pitch);
  if (!raw || submitted.length === 0) return false;
  for (const alt of raw.variants) {
    for (const sub of submitted) {
      if (fingeringSetsEqual(sub, alt)) return true;
    }
  }
  return false;
}

export function merkhilfeFor(
  inst: GriffeInstrumentId,
  pitch: WrittenPitch,
): string {
  const raw = getRawFingeringEntry(inst, pitch);
  if (raw?.merkhilfe) return raw.merkhilfe;
  const k = pitchKey(pitch);
  if (inst === "trombone") {
    return `Merke dir die Zugposition für ${k} — gleichbleibender Strich, andere Partialtöne.`;
  }
  if (inst === "tuba") {
    return `Für ${k}: Quart-Ventil (4) wechselt oft die Ebene — mit Lehrkraft abstimmen.`;
  }
  return `Für ${k}: langsam die Ventilkombination vergleichen (1 = Zeigefinger oben).`;
}
