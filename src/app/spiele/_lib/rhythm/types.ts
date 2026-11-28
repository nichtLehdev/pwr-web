/** VexFlow-Notenwerte; Triolen-Achtel sind `8` mit `tupletId`. */
export type NoteValue = "w" | "hd" | "h" | "qd" | "q" | "8d" | "8" | "16";

export type RhythmEvent = {
  value: NoteValue;
  ticks: number;
  isRest: boolean;
  tupletId?: number;
};

export type TimeSignature = {
  numerator: number;
  denominator: number;
};

/** Tempo-unabhängig in Ticks, damit das Spiel das Tempo zwischen Figuren ändern kann. */
export type Figure = {
  timeSignature: TimeSignature;
  bars: RhythmEvent[][];
};
