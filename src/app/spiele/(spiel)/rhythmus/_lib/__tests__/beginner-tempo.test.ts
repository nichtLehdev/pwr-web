import { describe, expect, it } from "@jest/globals";
import { hasSteadyTempo, LEVELS } from "../../../../_lib/rhythm/levels";
import { parseCell } from "../../../../_lib/rhythm/generator";
import { barTicks } from "../../../../_lib/rhythm/ticks";
import { noteTutorialFor, TUTORIALS } from "../../../../_lib/tutorials";
import { startBpm } from "../prefs";
import { AnswerPlan, figuresForLevel } from "../session-script";

const first = LEVELS[0]!;

describe("Grundlagen tempo", () => {
  it("starts the first level short and slow", () => {
    expect(figuresForLevel(first)).toBe(5);
    expect(first.bpm.start).toBe(60);
  });

  it("never speeds up during a beginner level, but still slows down", () => {
    const plan = new AnswerPlan(first, first.meters[0]!, 20, {
      start: 60,
      fixed: false,
      steady: hasSteadyTempo(first),
    });
    plan.first();
    for (let i = 0; i < 10; i++) plan.afterAnswer(1);
    expect(plan.bpm).toBe(60);
    for (let i = 0; i < 4; i++) plan.afterAnswer(0);
    expect(plan.bpm).toBeLessThan(60);
  });

  it("ignores a stored faster tempo in the Grundlagen only", () => {
    const fast = { stars: 3, bestPercent: 99, bestPoints: 1, bpm: 96 } as const;
    expect(startBpm(first, { [first.id]: fast })).toBe(first.bpm.start);
    const later = LEVELS.find((l) => !hasSteadyTempo(l))!;
    expect(startBpm(later, { [later.id]: fast })).toBe(
      Math.min(later.bpm.max, 96),
    );
  });
});

describe("note tutorials", () => {
  it("explain the notes before the first three levels", () => {
    for (const level of LEVELS.slice(0, 3)) {
      expect(noteTutorialFor(level.id)).not.toBeNull();
    }
    expect(noteTutorialFor("meister")).toBeNull();
  });

  it("show exactly one full bar in each demo", () => {
    for (const steps of Object.values(TUTORIALS)) {
      for (const step of steps) {
        if (typeof step.demo !== "object") continue;
        const [numerator, denominator] = (step.demo.meter ?? "4/4")
          .split("/")
          .map(Number) as [number, number];
        const ticks = parseCell(step.demo.notes).reduce(
          (sum, e) => sum + e.ticks,
          0,
        );
        expect(ticks).toBe(barTicks({ numerator, denominator }));
      }
    }
  });
});
