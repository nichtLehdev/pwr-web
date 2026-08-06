import { describe, expect, test } from "@jest/globals";
import { EXPERT_CLEF_MIDI_BOUNDS, expertPoolForClef } from "../ranges";
import { writtenPitchToMidi } from "../pitch";
import type { ClefKind } from "../types";

const CLEFS: ClefKind[] = ["treble", "bass", "alto", "tenor"];

describe("expertPoolForClef", () => {
  test.each(CLEFS)("%s: alle Töne innerhalb der Schlüssel-Grenzen", (clef) => {
    const { lo, hi } = EXPERT_CLEF_MIDI_BOUNDS[clef];
    const pool = expertPoolForClef(clef);
    expect(pool.length).toBeGreaterThan(0);
    for (const p of pool) {
      const m = writtenPitchToMidi(p);
      expect(m).toBeGreaterThanOrEqual(lo);
      expect(m).toBeLessThanOrEqual(hi);
    }
  });

  test("Violinschlüssel enthält kein tiefes B1 mehr (MIDI 34)", () => {
    const midis = expertPoolForClef("treble").map(writtenPitchToMidi);
    expect(Math.min(...midis)).toBeGreaterThanOrEqual(50);
  });

  test("Bassschlüssel bleibt unter dem hohen D6 (MIDI 86)", () => {
    const midis = expertPoolForClef("bass").map(writtenPitchToMidi);
    expect(Math.max(...midis)).toBeLessThanOrEqual(71);
  });
});
