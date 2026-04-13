import { StaveNote } from "vexflow";
import type { RhythmEvent } from "./types";

/**
 * Build a StaveNote for rhythm events.
 * Pausen: Für ungepunktete Werte nutzen wir VexFlows kombinierte Dauer-Strings (`8r`, `qr`, …).
 * Das ist zuverlässiger als `duration: "8"` + `type: "r"` (Achtelpause hat Stem/Flag-Glyphen).
 */
export function staveNoteFromRhythmEvent(e: RhythmEvent): StaveNote {
  if (e.isRest) {
    const base = restBaseDuration(e.noteValue);
    const dots = restDots(e.noteValue);
    if (dots > 0) {
      return new StaveNote({
        keys: ["b/4"],
        duration: base,
        dots,
        type: "r",
      });
    }
    const duration = restDurationToken(base);
    return new StaveNote({
      keys: ["b/4"],
      duration,
    });
  }

  return new StaveNote({
    keys: [e.key ?? "c/4"],
    duration: e.noteValue,
  });
}

/** z. B. qd → Grundnote `q` + Punkt (kein `qdr`-Token nötig). */
function restBaseDuration(vex: string): string {
  if (vex === "qd") return "q";
  return vex;
}

function restDots(vex: string): number {
  return vex === "qd" ? 1 : 0;
}

function restDurationToken(base: string): string {
  switch (base) {
    case "w":
      return "wr";
    case "h":
      return "hr";
    case "q":
      return "qr";
    case "8":
      return "8r";
    case "16":
      return "16r";
    default:
      return `${base}r`;
  }
}
