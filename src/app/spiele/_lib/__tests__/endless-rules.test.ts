import { describe, expect, it } from "@jest/globals";
import { answerInTime, NOTE_TIME_MS, plausiblePace } from "../endless-rules";

describe("endless rules", () => {
  it("counts a late or missing answer as wrong", () => {
    expect(answerInTime({ label: "C", ms: NOTE_TIME_MS })).toBe(true);
    expect(answerInTime({ label: "C", ms: NOTE_TIME_MS + 2000 })).toBe(false);
    expect(answerInTime({ label: null, ms: 100 })).toBe(false);
  });

  it("rejects runs faster than a human can play", () => {
    expect(plausiblePace(100, 10_000)).toBe(false);
    expect(plausiblePace(100, 150_000)).toBe(true);
  });

  it("rejects long pauses to look things up", () => {
    expect(plausiblePace(10, 30 * 60 * 1000)).toBe(false);
  });
});
