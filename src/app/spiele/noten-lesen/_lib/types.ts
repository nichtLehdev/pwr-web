export type GermanLetter = "C" | "D" | "E" | "F" | "G" | "A" | "H";

/** Written pitch as on the part (German H, never English B for naturals). */
export type WrittenPitch = {
  letter: GermanLetter;
  octave: number;
  alter: -1 | 0 | 1;
};

export type ClefKind = "treble" | "bass" | "alto" | "tenor";

export type InstrumentId = "trumpet_c" | "horn_f" | "trombone" | "tuba";

export type DifficultyId =
  | "beginner"
  | "intermediate"
  | "alto_beginner"
  | "alto_intermediate"
  | "tenor_beginner"
  | "tenor_intermediate"
  | "advanced"
  | "expert"
  | "hardcore";

/** Chromatic pool, 12-option grid, random key / explicit accidentals. */
export function isChromaticDifficulty(d: DifficultyId): boolean {
  return d === "advanced" || d === "expert" || d === "hardcore";
}

/** Hauptauswahl im Setup (Violin-/Bass-instrumentbezogen). */
export const DIFFICULTY_ORDER_PRIMARY: DifficultyId[] = [
  "beginner",
  "intermediate",
  "advanced",
  "expert",
];

/** Einklappbare Gruppe: C-Schlüssel üben + Hardcore. */
export const DIFFICULTY_ORDER_EXTRA: DifficultyId[] = [
  "alto_beginner",
  "alto_intermediate",
  "tenor_beginner",
  "tenor_intermediate",
  "hardcore",
];

/** Alle Stufen (z. B. für Migration / Vollständigkeit). */
export const DIFFICULTY_ORDER: DifficultyId[] = [
  ...DIFFICULTY_ORDER_PRIMARY,
  ...DIFFICULTY_ORDER_EXTRA,
];

export function isExtraSectionDifficulty(id: DifficultyId): boolean {
  return DIFFICULTY_ORDER_EXTRA.includes(id);
}

/** Altschlüssel / Tenorschlüssel nur üben (fester Schlüssel, kein Instrument). */
export function fixedLearningClef(d: DifficultyId): "alto" | "tenor" | null {
  if (d === "alto_beginner" || d === "alto_intermediate") return "alto";
  if (d === "tenor_beginner" || d === "tenor_intermediate") return "tenor";
  return null;
}

export function hidesInstrumentForDifficulty(d: DifficultyId): boolean {
  return fixedLearningClef(d) != null || d === "expert" || d === "hardcore";
}

export type GameModeId = "learn" | "quiz" | "endless";

export type InstrumentConfig = {
  id: InstrumentId;
  label: string;
  shortLabel: string;
  clef: ClefKind;
  /** Written range on the staff; answers are German written pitch names. */
  description: string;
};

export const INSTRUMENTS: InstrumentConfig[] = [
  {
    id: "trumpet_c",
    label: "Trompete",
    shortLabel: "Tr.",
    clef: "treble",
    description:
      "Violinschlüssel — gleicher geschriebener Tonumfang wie z. B. Trompete in C oder B (nur Lesen).",
  },
  {
    id: "horn_f",
    label: "Horn in F",
    shortLabel: "Hr. F",
    clef: "treble",
    description:
      "Violinschlüssel — geschriebene Notation (klingt eine Quinte tiefer); typischer Lese-Umfang für Horn.",
  },
  {
    id: "trombone",
    label: "Posaune",
    shortLabel: "Pos.",
    clef: "bass",
    description: "Bassschlüssel, keine Transposition.",
  },
  {
    id: "tuba",
    label: "Tuba",
    shortLabel: "Tu.",
    clef: "bass",
    description: "Bassschlüssel, keine Transposition.",
  },
];

export const DIFFICULTY_LABELS: Record<
  DifficultyId,
  { title: string; hint: string }
> = {
  beginner: {
    title: "Anfänger",
    hint: "Grundtonumfang, keine Vorzeichen",
  },
  intermediate: {
    title: "Mittel",
    hint: "Mehr Lagen, keine Vorzeichen",
  },
  alto_beginner: {
    title: "Altschlüssel (Anfänger)",
    hint: "Mittlerer Tonumfang, keine Vorzeichen",
  },
  alto_intermediate: {
    title: "Altschlüssel (Mittel)",
    hint: "Größerer Umfang, keine Vorzeichen",
  },
  tenor_beginner: {
    title: "Tenorschlüssel (Anfänger)",
    hint: "Mittlerer Tonumfang, keine Vorzeichen",
  },
  tenor_intermediate: {
    title: "Tenorschlüssel (Mittel)",
    hint: "Größerer Umfang, keine Vorzeichen",
  },
  advanced: {
    title: "Fortgeschritten",
    hint: "Großer Tonumfang mit Halbtönen (Cis, Des, Es …)",
  },
  expert: {
    title: "Experte",
    hint: "Violin- und Bassschlüssel wechseln; voller Umfang mit Vorzeichen",
  },
  hardcore: {
    title: "Hardcore",
    hint: "Violin-, Bass-, Altschlüssel und Tenorschlüssel wechseln; voller Umfang mit Vorzeichen",
  },
};

export const GAME_MODE_LABELS: Record<
  GameModeId,
  { title: string; hint: string }
> = {
  learn: {
    title: "Lernen",
    hint: "Erklärung nach jeder Note, kein Timer",
  },
  quiz: {
    title: "Quiz",
    hint: "Timer + feste Rundenlänge, Auswertung",
  },
  endless: {
    title: "Endlos",
    hint: "Ohne Timer — nur Streak",
  },
};

/** Alter Key (nur noch Migrationsquelle) — Instrument als roher String. */
export const STORAGE_INSTRUMENT_KEY = "pwr-noten-lesen-instrument";

/** Neuer Key: ein JSON-Blob mit Instrument, Schwierigkeit und Modus. */
export const STORAGE_SETTINGS_KEY = "pwr-noten-lesen-settings";
