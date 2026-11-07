import { describe, expect, it } from "@jest/globals";
import { TASKS_PER_WEEK, weeklyTasks, type TaskResult } from "../weekly-tasks";

const week = new Date("2026-11-01T23:00:00Z");
const day = (d: Date) => d.toISOString().slice(0, 10);

describe("weeklyTasks", () => {
  it("stays the same all week for one profile", () => {
    const a = weeklyTasks("p1", week, ["tuba"]).map((t) => t.key);
    const b = weeklyTasks("p1", week, ["tuba"]).map((t) => t.key);
    expect(a).toEqual(b);
    expect(a).toHaveLength(TASKS_PER_WEEK);
    expect(new Set(a).size).toBe(TASKS_PER_WEEK);
  });

  it("changes between weeks and profiles", () => {
    const keys = new Set(
      ["p1", "p2", "p3", "p4"].flatMap((p) =>
        weeklyTasks(p, week, ["posaune"]).map((t) => t.key),
      ),
    );
    expect(keys.size).toBeGreaterThan(TASKS_PER_WEEK);
  });

  it("never asks for fingerings an instrument does not have", () => {
    for (let i = 0; i < 50; i++) {
      for (const task of weeklyTasks(`p${i}`, week, ["horn", "tuba"])) {
        expect(task.key.startsWith("instrument:griffe")).toBe(false);
      }
    }
  });

  it("counts daily practice by day, not by round", () => {
    const daily = (iso: string): TaskResult => ({
      game: "notenwaage",
      score: 1,
      maxScore: 1,
      xp: 5,
      createdAt: new Date(iso),
      meta: { kind: "daily" },
    });
    let task;
    for (let i = 0; i < 200 && !task; i++) {
      task = weeklyTasks(`q${i}`, week, []).find((t) =>
        t.key.startsWith("daily-days"),
      );
    }
    expect(
      task!.measure(
        [
          daily("2026-11-02T10:00Z"),
          daily("2026-11-02T18:00Z"),
          daily("2026-11-03T10:00Z"),
        ],
        day,
      ),
    ).toBe(2);
  });
});
