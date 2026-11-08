import { describe, expect, it } from "@jest/globals";
import { generateFigure } from "../../../../_lib/rhythm/generator";
import { TICKS_PER_QUARTER } from "../../../../_lib/rhythm/ticks";
import type { Figure } from "../../../../_lib/rhythm/types";
import {
  CALM_FIGURES,
  ENDLESS_METER,
  ENDLESS_STAGES,
  EndlessPlan,
  endlessLevelAt,
} from "../endless";
import { seededRng } from "../replay";

/** Anteil der Töne, die kürzer als eine Viertel sind. */
function busyShare(figures: Figure[]): number {
  const notes = figures.flatMap((f) => f.bars.flat()).filter((e) => !e.isRest);
  const short = notes.filter((e) => e.ticks < TICKS_PER_QUARTER).length;
  return short / notes.length;
}

describe("Endlos warms up when the second bar arrives", () => {
  const stage = ENDLESS_STAGES - 1;

  it("prefers quarters, halves and wholes while calm", () => {
    const sample = (calm: number) => {
      const rng = seededRng(7);
      const level = endlessLevelAt(stage, "straight", 2, calm);
      return busyShare(
        Array.from({ length: 200 }, () =>
          generateFigure(level, ENDLESS_METER, { rng }),
        ),
      );
    };
    expect(sample(1)).toBeLessThan(sample(0) * 0.6);
  });

  it("starts calm right after the switch and returns to the normal mix", () => {
    const early: Figure[] = [];
    const late: Figure[] = [];
    for (let seed = 1; seed <= 40; seed++) {
      const plan = new EndlessPlan(seededRng(seed));
      let step = plan.first();
      let sinceLong = -1;
      for (let i = 0; i < 200 && sinceLong < CALM_FIGURES + 4; i++) {
        step = plan.afterAnswer(1)!;
        if (step.announcement === "longer") sinceLong = 0;
        else if (sinceLong >= 0) sinceLong++;
        if (sinceLong >= 0 && sinceLong < 2) early.push(step.figure);
        if (sinceLong >= CALM_FIGURES + 2) late.push(step.figure);
      }
    }
    expect(early.length).toBeGreaterThan(40);
    expect(early.every((f) => f.bars.length === 2)).toBe(true);
    expect(busyShare(early)).toBeLessThan(busyShare(late));
  });
});
