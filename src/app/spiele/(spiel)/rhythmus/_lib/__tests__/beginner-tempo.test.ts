import { describe, expect, it } from "@jest/globals";
import { hasSteadyTempo, LEVELS } from "../../../../_lib/rhythm/levels";
import { parseCell } from "../../../../_lib/rhythm/generator";
import { barTicks } from "../../../../_lib/rhythm/ticks";
import { noteTutorialFor, TUTORIALS } from "../../../../_lib/tutorials";
import { startBpm } from "../prefs";
import { AnswerPlan, AnswerScript, figuresForLevel } from "../session-script";

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

describe("steady tempo where a section brings something new", () => {
  it("holds the tempo for the first two levels of every section", () => {
    const groups = [...new Set(LEVELS.map((l) => l.group))];
    for (const group of groups) {
      const levels = LEVELS.filter((l) => l.group === group);
      levels.forEach((level, i) => {
        expect(hasSteadyTempo(level)).toBe(group === groups[0] || i < 2);
      });
    }
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

describe("count-in bar before answering", () => {
  const kinds = (gap: boolean) => {
    const plan = new AnswerPlan(first, first.meters[0]!, 2, {
      start: 60,
      fixed: false,
    });
    const script = new AnswerScript(plan, 2, true, gap);
    const out: string[] = [];
    for (let spec = script.next(null); spec; spec = script.next(1)) {
      out.push(spec.kind);
    }
    return out;
  };

  it("adds one empty bar between listening and playing for beginners", () => {
    expect(kinds(true)).toEqual([
      "count",
      "call",
      "ready",
      "answer",
      "call",
      "ready",
      "answer",
    ]);
  });

  it("goes straight on without it", () => {
    expect(kinds(false)).toEqual(["count", "call", "answer", "call", "answer"]);
  });
});
