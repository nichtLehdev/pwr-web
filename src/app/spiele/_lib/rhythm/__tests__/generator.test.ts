import { describe, expect, it } from "@jest/globals";
import { describeFigure } from "../describe";
import {
  generateBar,
  generateBarSequence,
  generateDistractors,
  generateFigure,
  parseCell,
} from "../generator";
import { LEVELS } from "../levels";
import {
  barKey,
  barTicks,
  figureKey,
  onsetsOf,
  pulseOf,
  sumTicks,
} from "../ticks";

const RUNS = 300;

describe("level ladder", () => {
  it.each(LEVELS.map((l) => [l.id, l] as const))(
    "%s: every cell spans whole pulses",
    (_, level) => {
      for (const ts of level.meters) {
        const { pulseTicks } = pulseOf(ts);
        for (const cell of level.cells) {
          const ticks = sumTicks(parseCell(cell.pattern));
          if (ticks > barTicks(ts)) continue;
          expect(ticks % pulseTicks).toBe(0);
        }
      }
    },
  );

  it("has unique ids and sensible tempo ranges", () => {
    expect(new Set(LEVELS.map((l) => l.id)).size).toBe(LEVELS.length);
    for (const { bpm } of LEVELS) {
      expect(bpm.min).toBeLessThanOrEqual(bpm.start);
      expect(bpm.start).toBeLessThanOrEqual(bpm.max);
    }
  });
});

describe.each(LEVELS.map((l) => [l.id, l] as const))("%s", (_, level) => {
  it("fills every bar exactly and meets the level's rules", () => {
    for (let run = 0; run < RUNS; run++) {
      for (const ts of level.meters) {
        const bar = generateBar(level, ts);
        expect(sumTicks(bar)).toBe(barTicks(ts));
        expect(onsetsOf(bar).length).toBeGreaterThanOrEqual(level.minOnsets);
      }
    }
  });

  it("practises its topic in every bar", () => {
    const focus = level.cells.filter((c) => c.focus).map((c) => c.pattern);
    if (focus.length === 0) return;
    const plain = new Set(level.meters.map((ts) => barKey(fallback(ts))));
    for (let run = 0; run < RUNS; run++) {
      const ts = level.meters[run % level.meters.length]!;
      const key = barKey(generateBar(level, ts));
      const hasFocus = focus.some((pattern) =>
        key.includes(barKey(parseCell(pattern))),
      );
      expect(hasFocus || plain.has(key)).toBe(true);
      expect(plain.has(key)).toBe(false);
    }
  });

  it("starts tuplets only on a pulse and never in compound meter", () => {
    for (let run = 0; run < RUNS; run++) {
      for (const ts of level.meters) {
        const { pulseTicks } = pulseOf(ts);
        let tick = 0;
        let lastTuplet: number | undefined;
        for (const event of generateBar(level, ts)) {
          if (event.tupletId !== undefined && event.tupletId !== lastTuplet) {
            expect(tick % pulseTicks).toBe(0);
            expect(ts.denominator).toBe(4);
          }
          lastTuplet = event.tupletId;
          tick += event.ticks;
        }
      }
    }
  });
});

function fallback(ts: { numerator: number; denominator: number }) {
  const { pulseTicks, pulsesPerBar } = pulseOf(ts);
  return Array.from({ length: pulsesPerBar }, () => ({
    value: (pulseTicks === 72 ? "qd" : "q") as "qd" | "q",
    ticks: pulseTicks,
    isRest: false,
  }));
}

describe("generateFigure", () => {
  it("avoids recent figures when there are alternatives", () => {
    const level = LEVELS[0]!;
    const ts = level.meters[0]!;
    const first = generateFigure(level, ts);
    for (let run = 0; run < 100; run++) {
      const next = generateFigure(level, ts, {
        avoid: new Set([figureKey(first)]),
      });
      expect(figureKey(next)).not.toBe(figureKey(first));
    }
  });

  it("creates two-bar figures where the level asks for them", () => {
    const level = LEVELS.find((l) => l.bars === 2)!;
    expect(generateFigure(level, level.meters[0]!).bars).toHaveLength(2);
  });

  it("describes figures in German", () => {
    const text = describeFigure({
      timeSignature: { numerator: 4, denominator: 4 },
      bars: [parseCell("q rq h")],
    });
    expect(text).toBe("4/4-Takt: Viertelnote, Viertelpause, halbe Note.");
  });
});

describe("generateBarSequence", () => {
  it("does not repeat a bar back to back", () => {
    const level = LEVELS.find((l) => l.id === "achtel")!;
    const bars = generateBarSequence(level, level.meters[0]!, 200);
    let repeats = 0;
    for (let i = 1; i < bars.length; i++) {
      if (barKey(bars[i]!) === barKey(bars[i - 1]!)) repeats++;
    }
    expect(repeats).toBeLessThan(2);
  });
});

describe("generateDistractors", () => {
  it.each(LEVELS.map((l) => [l.id, l] as const))(
    "%s: offers options that sound different from the target and each other",
    (_, level) => {
      for (let run = 0; run < 10; run++) {
        const ts = level.meters[0]!;
        const target = generateFigure(level, ts);
        const options = [target, ...generateDistractors(target, level, 2)];
        expect(options).toHaveLength(3);
        const sounds = options.map((figure) =>
          figure.bars
            .map((bar) =>
              onsetsOf(bar)
                .map((o) => `${o.tick}:${o.ticks}`)
                .join(),
            )
            .join("|"),
        );
        expect(new Set(sounds).size).toBe(3);
      }
    },
  );
});
