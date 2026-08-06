import { describe, expect, it } from "@jest/globals";
import type { RhythmEvent } from "../types";
import { effectiveToleranceMs, scoreTaps, toleranceMs } from "../scoring";

/** Vier Viertelnoten bei gegebenem Tempo (Onsets bei 0, q, 2q, 3q ms). */
function quarterNotes(count: number, bpm: number): RhythmEvent[] {
  const q = 60000 / bpm;
  return Array.from({ length: count }, () => ({
    noteValue: "q",
    durationMs: q,
    isRest: false,
    key: "c/4",
  }));
}

function sixteenthNotes(count: number, bpm: number): RhythmEvent[] {
  const s = 60000 / bpm / 4;
  return Array.from({ length: count }, () => ({
    noteValue: "16",
    durationMs: s,
    isRest: false,
    key: "c/4",
  }));
}

function allRests(count: number, bpm: number): RhythmEvent[] {
  const q = 60000 / bpm;
  return Array.from({ length: count }, () => ({
    noteValue: "q",
    durationMs: q,
    isRest: true,
    key: "r/4",
  }));
}

const START = 10_000;

describe("scoreTaps", () => {
  it("scores perfect taps as 100 %", () => {
    const bpm = 120;
    const events = quarterNotes(4, bpm);
    const taps = [0, 500, 1000, 1500].map((t) => START + t);
    const res = scoreTaps(events, taps, START, bpm);
    expect(res.percent).toBe(100);
    expect(res.missingCount).toBe(0);
    expect(res.extraCount).toBe(0);
    expect(res.onsetVerdicts).toEqual(["good", "good", "good", "good"]);
    expect(res.medianSignedDeltaMs).toBe(0);
  });

  it("discards count-in taps instead of counting them as extras", () => {
    const bpm = 120;
    const events = quarterNotes(4, bpm);
    const tol = effectiveToleranceMs(bpm, [0, 500, 1000, 1500]);
    // Deutlich vor t=0 (Einzähler): unter -(tol + 120 ms).
    const countInTap = START - (tol + 121);
    const taps = [countInTap, ...[0, 500, 1000, 1500].map((t) => START + t)];
    const res = scoreTaps(events, taps, START, bpm);
    expect(res.extraCount).toBe(0);
    expect(res.missingCount).toBe(0);
    expect(res.percent).toBe(100);
  });

  it("does not pair a tap that is further away than 2× tolerance", () => {
    const bpm = 120;
    const events = quarterNotes(1, bpm);
    const tol = effectiveToleranceMs(bpm, [0]);
    const taps = [START + tol * 3];
    const res = scoreTaps(events, taps, START, bpm);
    expect(res.beats[0]!.tappedMs).toBeNull();
    expect(res.missingCount).toBe(1);
    expect(res.extraCount).toBe(1);
    expect(res.onsetVerdicts).toEqual(["missed"]);
    expect(res.extraTapOffsets).toEqual([tol * 3]);
  });

  it("pairs a tap just inside 2× tolerance (scored as off)", () => {
    const bpm = 120;
    const events = quarterNotes(1, bpm);
    const tol = effectiveToleranceMs(bpm, [0]);
    const taps = [START + tol * 1.5];
    const res = scoreTaps(events, taps, START, bpm);
    expect(res.beats[0]!.tappedMs).not.toBeNull();
    expect(res.extraCount).toBe(0);
    expect(res.onsetVerdicts).toEqual(["off"]);
  });

  it("guards against zero expected onsets (no flat 0 %)", () => {
    const bpm = 120;
    const events = allRests(4, bpm);
    expect(scoreTaps(events, [], START, bpm).percent).toBe(100);
    // Zwei Extra-Tipps → nur die Extra-Strafe (2 × 8 %).
    const res = scoreTaps(events, [START + 100, START + 700], START, bpm);
    expect(res.extraCount).toBe(2);
    expect(res.percent).toBe(84);
  });

  it("caps the tolerance at 45 % of the smallest inter-onset gap", () => {
    const bpm = 200; // Viertel = 300 ms, Sechzehntel = 75 ms
    const events = sixteenthNotes(4, bpm);
    const res = scoreTaps(
      events,
      [0, 75, 150, 225].map((t) => START + t),
      START,
      bpm,
    );
    expect(toleranceMs(bpm)).toBeCloseTo(84, 5);
    expect(res.toleranceMs).toBeCloseTo(75 * 0.45, 5);
    // Bei weiten Abständen bleibt die Basis-Toleranz unangetastet.
    expect(effectiveToleranceMs(120, [0, 500, 1000])).toBeCloseTo(140, 5);
  });

  it("grades verdicts against the effective tolerance", () => {
    const bpm = 120;
    const events = quarterNotes(3, bpm);
    const tol = effectiveToleranceMs(bpm, [0, 500, 1000]);
    const taps = [
      START + tol * 0.4, // good
      START + 500 + tol * 0.8, // ok
      // dritter Schlag: kein Tipp → missed
    ];
    const res = scoreTaps(events, taps, START, bpm);
    expect(res.onsetVerdicts).toEqual(["good", "ok", "missed"]);
    expect(res.missingCount).toBe(1);
  });

  it("reports the signed median delta (consistently late taps)", () => {
    const bpm = 120;
    const events = quarterNotes(4, bpm);
    const taps = [30, 530, 1030, 1530].map((t) => START + t);
    const res = scoreTaps(events, taps, START, bpm);
    expect(res.medianSignedDeltaMs).toBe(30);
    expect(res.medianAbsDeltaMs).toBe(30);
  });
});
