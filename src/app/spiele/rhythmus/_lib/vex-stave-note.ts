import { StaveNote } from "vexflow";
import type { RhythmEvent } from "./types";

/**
 * Build a StaveNote for rhythm events. Rests must set `type: 'r'` or VexFlow draws
 * a pitched note (with stem) instead of a rest glyph.
 */
export function staveNoteFromRhythmEvent(e: RhythmEvent): StaveNote {
  if (e.isRest) {
    const base = restBaseDuration(e.noteValue);
    const dots = restDots(e.noteValue);
    return new StaveNote({
      keys: ["b/4"],
      duration: base,
      dots,
      type: "r",
    });
  }

  return new StaveNote({
    keys: [e.key ?? "c/4"],
    duration: e.noteValue,
  });
}

function restBaseDuration(vex: string): string {
  if (vex === "qd") return "q";
  return vex;
}

function restDots(vex: string): number {
  return vex === "qd" ? 1 : 0;
}
