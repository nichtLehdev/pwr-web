import { Dot, StaveNote } from "vexflow";
import type { RhythmEvent } from "./types";

/**
 * VexFlow erwartet wie in `EasyScore.commitPiece`: Punkt(e) als `Dot`-Modifier,
 * nicht nur `duration: "qd"` oder `dots:` im Struct — sonst fehlen die Punkte.
 */
function attachAugmentationDots(sn: StaveNote, count: number): void {
  const existing = sn.getModifiersByType("Dot").length;
  const need = Math.max(0, count - existing);
  for (let i = 0; i < need; i++) {
    Dot.buildAndAttach([sn], { all: true });
  }
}

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
      const sn = new StaveNote({
        keys: ["b/4"],
        duration: base,
        dots,
        type: "r",
      });
      attachAugmentationDots(sn, dots);
      return sn;
    }
    const duration = restDurationToken(base);
    return new StaveNote({
      keys: ["b/4"],
      duration,
    });
  }

  if (e.noteValue === "qd") {
    const sn = new StaveNote({
      keys: [e.key ?? "c/4"],
      duration: "q",
      dots: 1,
    });
    attachAugmentationDots(sn, 1);
    return sn;
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
