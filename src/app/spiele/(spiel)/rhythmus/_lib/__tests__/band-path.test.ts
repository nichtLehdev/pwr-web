import { beforeEach, describe, expect, it } from "@jest/globals";
import { LEVELS } from "../../../../_lib/rhythm/levels";
import { barTicks, sumTicks } from "../../../../_lib/rhythm/ticks";
import { bandChallenge, bandMeterFor, BandRunScript, SECTIONS } from "../path";
import { loadProgress, saveProgress } from "../prefs";

describe("Notenband runs", () => {
  it("keep one meter per run, the one most stages know", () => {
    const { ts, levels } = bandMeterFor(LEVELS);
    expect(ts).toEqual({ numerator: 4, denominator: 4 });
    for (const level of levels) expect(level.meters).toContainEqual(ts);
  });

  it("build a valid bar for every stage of every section challenge", () => {
    SECTIONS.forEach((section) => {
      const run = bandChallenge(section.index);
      expect(run.barCount).toBeGreaterThanOrEqual(6);
      for (let i = 0; i < run.barCount; i++) {
        expect(sumTicks(run.barAt(i)!)).toBe(barTicks(run.ts));
      }
    });
  });

  it("completes after the last bar and fails after three bad bars", () => {
    const passing = new BandRunScript(LEVELS.slice(0, 3));
    passing.next(null);
    let spec = passing.next(null);
    while (spec) spec = passing.next(1);
    expect(passing.completed).toBe(true);

    const failing = new BandRunScript(LEVELS.slice(0, 6));
    failing.next(null);
    failing.next(null);
    failing.next(0);
    failing.next(0);
    expect(failing.next(0)).toBeNull();
    expect(failing.completed).toBe(false);
  });
});

describe("separate progress per mode", () => {
  beforeEach(() => {
    const data = new Map<string, string>();
    Object.assign(globalThis, {
      localStorage: {
        getItem: (key: string) => data.get(key) ?? null,
        setItem: (key: string, value: string) => void data.set(key, value),
        removeItem: (key: string) => void data.delete(key),
        clear: () => data.clear(),
        key: (i: number) => [...data.keys()][i] ?? null,
        get length() {
          return data.size;
        },
      },
    });
  });

  it("copies earlier progress once into Notenband, then keeps both apart", () => {
    const entry = {
      stars: 2,
      bestPercent: 80,
      bestPoints: 10,
      bpm: 70,
    } as const;
    saveProgress({ "viertel-halbe": entry }, "answer");
    expect(loadProgress("band")).toEqual({ "viertel-halbe": entry });
    saveProgress({}, "band");
    saveProgress({ "viertel-halbe": entry, achtel: entry }, "answer");
    expect(loadProgress("band")).toEqual({});
    expect(Object.keys(loadProgress("answer"))).toHaveLength(2);
  });
});
