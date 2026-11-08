import { describe, expect, it } from "@jest/globals";
import { parseCell } from "../../../../_lib/rhythm/generator";
import { LEVELS, levelById } from "../../../../_lib/rhythm/levels";
import { barKey, barTicks, sumTicks } from "../../../../_lib/rhythm/ticks";
import { seededRng } from "../replay";
import { BAND_BARS, bandBpmFor, createBandBars } from "../session-script";

describe("Notenband levels", () => {
  const level = levelById("sechzehntel-synkopen")!;
  const ts = level.meters[0]!;
  const focusKeys = level.cells
    .filter((c) => c.focus)
    .map((c) => barKey(parseCell(c.pattern)));
  const hasFocus = (bar: ReturnType<typeof parseCell>) => {
    const key = barKey(bar);
    return focusKeys.some((f) => key.includes(f));
  };

  it("are eight full bars", () => {
    const bars = createBandBars(level, ts, seededRng(3));
    expect(bars).toHaveLength(BAND_BARS);
    expect(BAND_BARS).toBe(8);
    for (const bar of bars) expect(sumTicks(bar)).toBe(barTicks(ts));
  });

  it("bring the new pattern in every other bar and fewer in between", () => {
    let strict = 0;
    let relaxed = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const bars = createBandBars(level, ts, seededRng(seed));
      bars.forEach((bar, i) => {
        if (i % 2 === 0) strict += hasFocus(bar) ? 1 : 0;
        else relaxed += hasFocus(bar) ? 1 : 0;
      });
    }
    expect(strict).toBe(30 * (BAND_BARS / 2));
    expect(relaxed).toBeLessThan(strict);
  });

  it("run a little slower than the level, never below its minimum", () => {
    for (const l of LEVELS) {
      expect(bandBpmFor(l)).toBeLessThan(l.bpm.start);
      expect(bandBpmFor(l)).toBeGreaterThanOrEqual(l.bpm.min);
    }
  });
});
