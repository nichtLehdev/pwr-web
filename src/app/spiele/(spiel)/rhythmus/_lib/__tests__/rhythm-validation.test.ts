import { afterAll, beforeAll, describe, expect, it, jest } from "@jest/globals";
import {
  durationMatchesClock,
  expectedRhythmDurationMs,
  getNotationTickInfo,
  notationFillsBars,
  rhythmIsWellFormed,
  totalDurationMs,
} from "../rhythm-validation";
import type { GeneratedRhythm, RhythmEvent, TimeSignature } from "../types";

beforeAll(() => {
  // vexflow warns about missing canvas contexts when run headless in Node.
  jest.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterAll(() => {
  jest.restoreAllMocks();
});

const note = (noteValue: string, durationMs: number): RhythmEvent => ({
  noteValue,
  durationMs,
  isRest: false,
  key: "c/4",
});

const rest = (noteValue: string, durationMs: number): RhythmEvent => ({
  noteValue,
  durationMs,
  isRest: true,
  key: "r/4",
});

function makeRhythm(
  events: RhythmEvent[],
  timeSignature: TimeSignature = { numerator: 4, denominator: 4 },
  bars = 1,
): GeneratedRhythm {
  return { events, timeSignature, bars, barStartEventIndices: [] };
}

// bpm 120: quarter = 500 ms, eighth = 250 ms, half = 1000 ms.
const BPM = 120;

describe("expectedRhythmDurationMs", () => {
  it("computes bar duration from time signature, bars and bpm", () => {
    expect(
      expectedRhythmDurationMs({ numerator: 4, denominator: 4 }, 1, 120),
    ).toBe(2000);
    expect(
      expectedRhythmDurationMs({ numerator: 3, denominator: 4 }, 2, 60),
    ).toBe(6000);
    expect(
      expectedRhythmDurationMs({ numerator: 6, denominator: 8 }, 1, 120),
    ).toBe(1500);
  });
});

describe("totalDurationMs", () => {
  it("sums event durations", () => {
    expect(totalDurationMs([note("q", 500), rest("8", 250)])).toBe(750);
    expect(totalDurationMs([])).toBe(0);
  });
});

describe("notation tick validation", () => {
  it("accepts a bar that exactly fills 4/4", () => {
    const rhythm = makeRhythm([
      note("q", 500),
      note("q", 500),
      note("q", 500),
      note("q", 500),
    ]);
    const info = getNotationTickInfo(rhythm);
    expect(info).not.toBeNull();
    expect(info!.ok).toBe(true);
    expect(info!.ticksUsed).toBe(info!.totalTicks);
    expect(notationFillsBars(rhythm)).toBe(true);
  });

  it("rejects an underfull bar", () => {
    const rhythm = makeRhythm([note("q", 500), note("q", 500), note("q", 500)]);
    const info = getNotationTickInfo(rhythm);
    expect(info).not.toBeNull();
    expect(info!.ok).toBe(false);
    expect(info!.ticksUsed).toBeLessThan(info!.totalTicks);
    expect(notationFillsBars(rhythm)).toBe(false);
  });

  it("rejects an overfull bar", () => {
    const rhythm = makeRhythm([
      note("q", 500),
      note("q", 500),
      note("q", 500),
      note("q", 500),
      note("q", 500),
    ]);
    const info = getNotationTickInfo(rhythm);
    expect(info).not.toBeNull();
    expect(info!.ok).toBe(false);
    expect(info!.ticksUsed).toBeGreaterThan(info!.totalTicks);
  });

  it("counts rests toward the bar", () => {
    const rhythm = makeRhythm([
      note("h", 1000),
      rest("q", 500),
      note("q", 500),
    ]);
    expect(notationFillsBars(rhythm)).toBe(true);
  });

  it("returns null tick info for empty rhythms", () => {
    const rhythm = makeRhythm([]);
    expect(getNotationTickInfo(rhythm)).toBeNull();
    expect(notationFillsBars(rhythm)).toBe(false);
  });
});

describe("durationMatchesClock", () => {
  it("passes when durations sum to the notated bars", () => {
    const rhythm = makeRhythm([note("h", 1000), note("h", 1000)]);
    expect(durationMatchesClock(rhythm, BPM)).toBe(true);
  });

  it("fails when durations drift from the notated bars", () => {
    const rhythm = makeRhythm([
      note("q", 400),
      note("q", 400),
      note("q", 400),
      note("q", 400),
    ]);
    expect(durationMatchesClock(rhythm, BPM)).toBe(false);
  });
});

describe("rhythmIsWellFormed", () => {
  it("accepts a consistent 4/4 bar", () => {
    const rhythm = makeRhythm([
      note("q", 500),
      note("q", 500),
      note("h", 1000),
    ]);
    expect(rhythmIsWellFormed(rhythm, BPM)).toBe(true);
  });

  it("accepts a 3/4 bar", () => {
    // Note: dotted values ("qd") cannot be validated here — VexFlow's
    // Dot.buildAndAttach requires a DOM document, so headless Node rejects
    // any rhythm containing them. Plain values cover the 3/4 path.
    const rhythm = makeRhythm(
      [note("h", 1000), note("8", 250), note("8", 250)],
      { numerator: 3, denominator: 4 },
    );
    expect(rhythmIsWellFormed(rhythm, BPM)).toBe(true);
  });

  it("accepts an eighth triplet spanning one beat", () => {
    const eachMs = 500 / 3;
    const triplet: RhythmEvent[] = [0, 1, 2].map(() => ({
      noteValue: "8",
      durationMs: eachMs,
      isRest: false,
      key: "c/4",
      tupletGroupId: 1,
      tupletNumNotes: 3,
      tupletNotesOccupied: 2,
    }));
    const rhythm = makeRhythm([...triplet, note("q", 500), note("h", 1000)]);
    expect(rhythmIsWellFormed(rhythm, BPM)).toBe(true);
  });

  it("rejects when notation fits but the clock does not", () => {
    const rhythm = makeRhythm([note("w", 1600)]);
    expect(notationFillsBars(rhythm)).toBe(true);
    expect(rhythmIsWellFormed(rhythm, BPM)).toBe(false);
  });

  it("rejects when the notation does not fill the bar", () => {
    const rhythm = makeRhythm([note("h", 1000)]);
    expect(rhythmIsWellFormed(rhythm, BPM)).toBe(false);
  });
});
