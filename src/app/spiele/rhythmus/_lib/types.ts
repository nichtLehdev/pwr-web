export type Difficulty = "beginner" | "intermediate" | "advanced";

/** VexFlow duration token (e.g. q, 8, 16, qd, w, h) */
export type VexDuration = string;

export interface RhythmEvent {
  noteValue: VexDuration;
  durationMs: number;
  isRest: boolean;
  /** Pitch for display; rests use r/4 */
  key?: string;
  /** When set, consecutive events with same id form one tuplet (advanced). */
  tupletGroupId?: number;
  tupletNumNotes?: number;
  tupletNotesOccupied?: number;
}

export interface TimeSignature {
  numerator: number;
  denominator: number;
}

export interface GeneratedRhythm {
  events: RhythmEvent[];
  timeSignature: TimeSignature;
  bars: number;
}
