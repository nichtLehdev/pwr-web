import { describe, expect, it } from "@jest/globals";
import type { Difficulty } from "../types";
import { generateRhythm } from "../rhythm-generator";
import {
  barLengthInUnits,
  barsFillTimeSignature,
  durationMatchesClock,
  eventTickUnits,
  splitEventsIntoBars,
} from "../rhythm-arithmetic";

const DIFFICULTIES: Difficulty[] = ["beginner", "intermediate", "advanced"];
const BPMS = [60, 96, 132, 180];
const RUNS_PER_COMBO = 25;

describe("generateRhythm", () => {
  it.each(DIFFICULTIES)(
    "%s: every bar fills the time signature exactly (tick sums)",
    (difficulty) => {
      for (const bpm of BPMS) {
        for (let run = 0; run < RUNS_PER_COMBO; run++) {
          const rhythm = generateRhythm(difficulty, bpm);
          const target = barLengthInUnits(rhythm.timeSignature);
          expect(barsFillTimeSignature(rhythm)).toBe(true);
          for (const barEvents of splitEventsIntoBars(rhythm)) {
            expect(eventTickUnits(barEvents)).toBe(target);
          }
          expect(durationMatchesClock(rhythm, bpm)).toBe(true);
        }
      }
    },
  );

  it.each(DIFFICULTIES)(
    "%s: every bar has at least one onset",
    (difficulty) => {
      for (const bpm of BPMS) {
        for (let run = 0; run < RUNS_PER_COMBO; run++) {
          const rhythm = generateRhythm(difficulty, bpm);
          for (const barEvents of splitEventsIntoBars(rhythm)) {
            const onsets = barEvents.filter((e) => !e.isRest).length;
            expect(onsets).toBeGreaterThanOrEqual(1);
          }
        }
      }
    },
  );

  it("beginner (Leicht): every bar has at least two onsets", () => {
    for (const bpm of BPMS) {
      for (let run = 0; run < RUNS_PER_COMBO; run++) {
        const rhythm = generateRhythm("beginner", bpm);
        for (const barEvents of splitEventsIntoBars(rhythm)) {
          const onsets = barEvents.filter((e) => !e.isRest).length;
          expect(onsets).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });
});
