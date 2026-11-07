import { describe, expect, it } from "@jest/globals";
import { estimateLatency } from "../latency";

const clicks = Array.from({ length: 16 }, (_, i) => i * 0.75);

describe("estimateLatency", () => {
  it("finds a constant offset, ignoring the first taps", () => {
    const taps = clicks.map((c, i) => c + (i < 2 ? 0.4 : 0.18));
    expect(estimateLatency(taps, clicks)).toEqual({ ok: true, latencyMs: 180 });
  });

  it("tolerates a stray tap", () => {
    const taps = clicks.map((c, i) => c + (i === 7 ? 0.3 : 0.05));
    expect(estimateLatency(taps, clicks)).toEqual({ ok: true, latencyMs: 50 });
  });

  it("wants enough taps", () => {
    expect(estimateLatency(clicks.slice(0, 4), clicks)).toEqual({
      ok: false,
      reason: "too-few",
    });
  });

  it("refuses random tapping", () => {
    const taps = clicks.map((c, i) => c + [0.3, -0.3, 0.1, -0.1][i % 4]!);
    expect(estimateLatency(taps, clicks)).toEqual({
      ok: false,
      reason: "scattered",
    });
  });
});
