export type NoteValueId =
  | "whole"
  | "half"
  | "dottedHalf"
  | "dottedWhole"
  | "quarter"
  | "eighth"
  | "dottedEighth"
  | "dottedQuarter"
  | "sixteenth"
  | "dottedSixteenth"
  | "thirtySecond"
  | "restQuarter"
  | "restEighth"
  | "restSixteenth";

export type NoteValueDef = {
  id: NoteValueId;
  label: string;
  units: number;
  isRest?: boolean;
};

export const QUARTER_UNITS = 24;

export const NOTE_VALUES: Record<NoteValueId, NoteValueDef> = {
  whole: { id: "whole", label: "Ganze", units: 96 },
  dottedWhole: { id: "dottedWhole", label: "Punkt. Ganze", units: 144 },
  half: { id: "half", label: "Halbe", units: 48 },
  dottedHalf: { id: "dottedHalf", label: "Punkt. Halbe", units: 72 },
  quarter: { id: "quarter", label: "Viertel", units: 24 },
  dottedQuarter: { id: "dottedQuarter", label: "Punkt. Viertel", units: 36 },
  eighth: { id: "eighth", label: "Achtel", units: 12 },
  dottedEighth: { id: "dottedEighth", label: "Punkt. Achtel", units: 18 },
  sixteenth: { id: "sixteenth", label: "Sechzehntel", units: 6 },
  dottedSixteenth: {
    id: "dottedSixteenth",
    label: "Punkt. Sechzehntel",
    units: 9,
  },
  thirtySecond: { id: "thirtySecond", label: "32tel", units: 3 },
  restQuarter: {
    id: "restQuarter",
    label: "Viertelpause",
    units: 24,
    isRest: true,
  },
  restEighth: {
    id: "restEighth",
    label: "Achtelpause",
    units: 12,
    isRest: true,
  },
  restSixteenth: {
    id: "restSixteenth",
    label: "Sechzehntel\u00ADpause",
    units: 6,
    isRest: true,
  },
};

export type Puzzle = {
  targetUnits: number;
  left: NoteValueId[];
  rightCount: number;
  uniqueOnly: boolean;
  requiredRests?: number;
};
