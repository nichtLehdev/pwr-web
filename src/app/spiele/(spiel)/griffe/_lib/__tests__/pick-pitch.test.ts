import { describe, expect, it } from "@jest/globals";
import { writtenPitchToMidi } from "../../../noten-lesen/_lib/pitch";
import { getRawFingeringEntry } from "../fingering-lookup";
import { pickRandomGriffePitch } from "../pick-pitch";
import type { GriffeDifficultyId, GriffeInstrumentId } from "../types";

const INSTRUMENTS: GriffeInstrumentId[] = [
  "trumpet_c",
  "trumpet_bb",
  "trombone",
];
const DIFFICULTIES: GriffeDifficultyId[] = [
  "beginner",
  "intermediate",
  "advanced",
];
const ITERATIONS = 50;

describe("pickRandomGriffePitch", () => {
  for (const instrument of INSTRUMENTS) {
    for (const difficulty of DIFFICULTIES) {
      it(`always picks a fingerable pitch for ${instrument}/${difficulty}`, () => {
        for (let i = 0; i < ITERATIONS; i++) {
          const picked = pickRandomGriffePitch(instrument, difficulty, null);
          const entry = getRawFingeringEntry(instrument, picked);
          expect(entry).not.toBeNull();
          expect(entry!.variants.length).toBeGreaterThan(0);
        }
      });

      it(`avoids repeating lastMidi for ${instrument}/${difficulty}`, () => {
        let lastMidi: number | null = null;
        for (let i = 0; i < ITERATIONS; i++) {
          const picked = pickRandomGriffePitch(
            instrument,
            difficulty,
            lastMidi,
          );
          const midi = writtenPitchToMidi(picked);
          if (lastMidi != null) {
            expect(midi).not.toBe(lastMidi);
          }
          lastMidi = midi;
        }
      });
    }
  }
});
