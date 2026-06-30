import type { GameModeId } from "../../noten-lesen/_lib/types";

export type { GameModeId };

export type GriffeInstrumentId =
  "trumpet_c" | "trumpet_bb" | "trombone" | "tuba";

export type GriffeDifficultyId = "beginner" | "intermediate" | "advanced";

export type GriffeInstrumentConfig = {
  id: GriffeInstrumentId;
  label: string;
  shortLabel: string;
  /** Trompete/Tuba: valves; Posaune: slide */
  inputKind: "valves3" | "valves4" | "slide";
  description: string;
};

export const GRIFFE_INSTRUMENTS: GriffeInstrumentConfig[] = [
  {
    id: "trumpet_c",
    label: "Trompete in C",
    shortLabel: "Tr. C",
    inputKind: "valves3",
    description:
      "Konzertschrift: was du siehst, ist der klingende Ton; die Griffe sind die der B‑Trompete (Stimmton = Konzert + 2 Halbtöne).",
  },
  {
    id: "trumpet_bb",
    label: "Trompete in B",
    shortLabel: "Tr. B",
    inputKind: "valves3",
    description:
      "Normale B‑Stimm‑Notation: geschriebener Ton wie auf der Stimme — klingend eine große Sekunde tiefer (z. B. geschriebenes F = Es).",
  },
  {
    id: "trombone",
    label: "Posaune",
    shortLabel: "Pos.",
    inputKind: "slide",
    description:
      "Zugpositionen 1–7 (geschriebener Tenor-/Bassschlüssel wie üblich).",
  },
];

export const GRIFFE_DIFFICULTY_LABELS: Record<
  GriffeDifficultyId,
  { title: string; hint: string }
> = {
  beginner: {
    title: "Anfänger",
    hint: "Erste Töne, nur Standard-Griffe",
  },
  intermediate: {
    title: "Mittel",
    hint: "Voller Anfänger-Umfang (ohne Vorzeichen), Standard-Griffe",
  },
  advanced: {
    title: "Fortgeschritten",
    hint: "Voller Umfang mit Vorzeichen; Alternativ-Griffe möglich",
  },
};

export const GRIFFE_MODE_LABELS: Record<
  GameModeId,
  { title: string; hint: string }
> = {
  learn: {
    title: "Lernen",
    hint: "Immer Griff anzeigen, kein Timer",
  },
  quiz: {
    title: "Quiz",
    hint: "Runde mit Auswertung",
  },
  endless: {
    title: "Endlos",
    hint: "Nur Serie zählt",
  },
};

export const STORAGE_GRIFFE_INSTRUMENT_KEY = "pwr-griffe-instrument";
