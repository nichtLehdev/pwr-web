import { describe, expect, it } from "@jest/globals";
import { LiveJudge, type ExpectedNote } from "../judge";

const PULSE = 500;

function note(
  onsetMs: number,
  durationMs = 500,
  extra: Partial<ExpectedNote> = {},
): ExpectedNote {
  return {
    barIndex: 0,
    eventIndex: 0,
    tick: 0,
    onsetMs,
    durationMs,
    judgeLength: durationMs >= 500,
    nextIsRest: false,
    ...extra,
  };
}

function judge(notes: ExpectedNote[], judgeLengths = true) {
  const j = new LiveJudge({ judgeLengths, leniency: 1 });
  j.addSegment({ id: 1, startMs: 0, endMs: 2000, pulseMs: PULSE, notes });
  return j;
}

describe("LiveJudge", () => {
  it("grades a press by its distance to the note", () => {
    const j = judge([note(0), note(500), note(1000), note(1500)]);
    j.press(5);
    j.press(500 + 60);
    j.press(1000 - 100);
    j.advance(3000);
    const verdicts = j.segment(1)!.notes.map((n) => n.verdict);
    expect(verdicts).toEqual(["exact", "close", "off", "missed"]);
    expect(j.segment(1)!.notes[1]!.deltaMs).toBe(60);
  });

  it("scores all exact as 100 % and missing notes as 0", () => {
    const perfect = judge([note(0), note(500)]);
    perfect.press(0);
    perfect.press(500);
    expect(perfect.accuracy(1)).toBe(1);

    const silent = judge([note(0), note(500)]);
    silent.advance(3000);
    expect(silent.accuracy(1)).toBe(0);
  });

  it("does not punish one miss on a short figure beyond its share", () => {
    const j = judge([note(0, 1000), note(1000, 1000)], false);
    j.press(0);
    j.advance(3000);
    expect(j.accuracy(1)).toBe(0.5);
  });

  it("counts a press without a note as extra inside the segment only", () => {
    const j = judge([note(0)]);
    expect(j.press(1000)?.type).toBe("extra");
    expect(j.segment(1)!.extras).toBe(1);
    // Beim Vorspielen (außerhalb des Abschnitts) darf man mitspielen.
    expect(j.press(5000)).toBeNull();
    expect(j.segment(1)!.extras).toBe(1);
  });

  it("assigns each note to the nearest press, never twice", () => {
    const j = judge([note(0, 125), note(125, 125)]);
    expect(j.press(5)?.type).toBe("note");
    expect(j.press(100)?.type).toBe("note");
    const [first, second] = j.segment(1)!.notes;
    expect(first!.deltaMs).toBe(5);
    expect(second!.deltaMs).toBe(100 - 125);
  });

  it("keeps windows of fast notes from overlapping", () => {
    const j = judge([note(0, 100), note(100, 100)]);
    const [first] = j.segment(1)!.notes;
    expect(first!.offMs).toBeLessThanOrEqual(48);
  });

  describe("note lengths", () => {
    it("flags a long note released far too early", () => {
      const j = judge([note(0, 1000)]);
      j.press(0);
      j.release(300);
      const n = j.segment(1)!.notes[0]!;
      expect(n.length).toBe("short");
      expect(j.accuracy(1)).toBeCloseTo(0.6);
    });

    it("tells a half note from a quarter note plus rest", () => {
      const half = judge([note(0, 1000)]);
      half.press(0);
      half.release(980);
      expect(half.segment(1)!.notes[0]!.length).toBe("ok");
      expect(half.accuracy(1)).toBe(1);

      const heldThroughRest = judge([note(0, 500, { nextIsRest: true })]);
      heldThroughRest.press(0);
      heldThroughRest.advance(800);
      expect(heldThroughRest.segment(1)!.notes[0]!.length).toBe("long");
    });

    it("forgives a late release when another note follows anyway", () => {
      const j = judge([note(0, 500, { nextIsRest: false })]);
      j.press(0);
      j.release(620);
      expect(j.segment(1)!.notes[0]!.length).toBe("ok");
    });

    it("never judges short values or tap input", () => {
      const eighth = judge([note(0, 250)]);
      eighth.press(0);
      eighth.release(40);
      expect(eighth.segment(1)!.notes[0]!.length).toBeNull();

      const tap = judge([note(0, 1000)], false);
      tap.press(0);
      tap.release(40);
      expect(tap.segment(1)!.notes[0]!.length).toBeNull();
    });
  });

  it("tracks streaks over hits and resets on misses", () => {
    const j = judge([note(0), note(500), note(1000), note(1500)]);
    j.press(0);
    j.press(500);
    j.advance(1200);
    j.press(1500);
    expect(j.bestStreak).toBe(2);
    expect(j.currentStreak).toBe(1);
  });
});
