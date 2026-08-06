import type { GameModeId } from "../../noten-lesen/_lib/types";

export type { GameModeId };

export type GriffeInstrumentId =
  "trumpet_c" | "trumpet_bb" | "trombone" | "tuba";

export type GriffeDifficultyId = "beginner" | "intermediate" | "advanced";

/**
 * Auswahl im Setup: feste Stufen oder „Eigenes Set" aus der öffentlichen
 * Notenset-Bibliothek. Die Grifftabellen-Funktionen kennen weiterhin nur
 * die festen Stufen — Custom bewertet wie Fortgeschritten (alle Varianten).
 */
export type GriffeDifficultyChoice = GriffeDifficultyId | "custom";

/** Persistierte Referenz auf das aktive Notenset (Details per publicId laden). */
export type StoredCustomSetRef = { publicId: string; name: string };

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
    label: "Trompete in B — C-Stimme",
    shortLabel: "Tr. C-St.",
    inputKind: "valves3",
    description:
      "Konzertnotation (Posaunenchor-C-Stimme): was du siehst, ist der klingende Ton — gegriffen auf der B‑Trompete (Stimmton = Konzert + 2 Halbtöne).",
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
    hint: "Erste Töne rund um B-Dur, nur Standard-Griffe",
  },
  intermediate: {
    title: "Mittel",
    hint: "Erweiterter Tonumfang (B-Dur-orientiert), Standard-Griffe",
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
    hint: "Griff und Erklärung bleiben stehen — weiter im eigenen Tempo, kein Timer",
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

/** Alt (nur noch Migration): einzelner Instrument-Key aus früheren Versionen. */
export const STORAGE_GRIFFE_INSTRUMENT_KEY = "pwr-griffe-instrument";

/** Neu: Instrument + Schwierigkeit + Modus als ein JSON-Blob. */
export const STORAGE_GRIFFE_SETTINGS_KEY = "pwr-griffe-settings";
