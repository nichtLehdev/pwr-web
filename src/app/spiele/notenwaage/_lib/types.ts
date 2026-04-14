export type NoteValueId =
  | "whole"
  | "half"
  | "quarter"
  | "eighth"
  | "dottedQuarter"
  | "sixteenth"
  | "tripletEighth"
  | "restQuarter"
  | "restEighth";

export type DifficultyId = "beginner" | "intermediate" | "advanced";
export type TimeSigId = "4/4" | "3/4" | "6/8";

export type NoteValueDef = {
  id: NoteValueId;
  label: string;
  units: number;
  isRest?: boolean;
};

export const QUARTER_UNITS = 12;

export const NOTE_VALUES: Record<NoteValueId, NoteValueDef> = {
  whole: { id: "whole", label: "Ganze", units: 48 },
  half: { id: "half", label: "Halbe", units: 24 },
  quarter: { id: "quarter", label: "Viertel", units: 12 },
  eighth: { id: "eighth", label: "Achtel", units: 6 },
  dottedQuarter: { id: "dottedQuarter", label: "Punkt. Viertel", units: 18 },
  sixteenth: { id: "sixteenth", label: "Sechzehntel", units: 3 },
  tripletEighth: { id: "tripletEighth", label: "Triolen-Achtel", units: 4 },
  restQuarter: { id: "restQuarter", label: "Viertelpause", units: 12, isRest: true },
  restEighth: { id: "restEighth", label: "Achtelpause", units: 6, isRest: true },
};

export const TARGET_UNITS: Record<TimeSigId, number> = {
  "4/4": 48,
  "3/4": 36,
  "6/8": 36,
};

export const DIFFICULTY_LABELS: Record<DifficultyId, { title: string; hint: string }> = {
  beginner: {
    title: "Anfänger",
    hint: "Ganze, Halbe, Viertel · immer 4/4",
  },
  intermediate: {
    title: "Mittel",
    hint: "plus Achtel und punktierte Noten · 4/4 & 3/4",
  },
  advanced: {
    title: "Fortgeschritten",
    hint: "plus Sechzehntel, Triolen und Pausen · 4/4, 3/4, 6/8",
  },
};

export const DIFFICULTY_VALUES: Record<DifficultyId, NoteValueId[]> = {
  beginner: ["whole", "half", "quarter"],
  intermediate: ["whole", "half", "quarter", "eighth", "dottedQuarter"],
  advanced: [
    "whole",
    "half",
    "quarter",
    "eighth",
    "dottedQuarter",
    "sixteenth",
    "tripletEighth",
    "restQuarter",
    "restEighth",
  ],
};

export const DIFFICULTY_SIGS: Record<DifficultyId, TimeSigId[]> = {
  beginner: ["4/4"],
  intermediate: ["4/4", "3/4"],
  advanced: ["4/4", "3/4", "6/8"],
};

export type Puzzle = {
  timeSig: TimeSigId;
  targetUnits: number;
  left: NoteValueId[];
  uniqueOnly: boolean;
};
