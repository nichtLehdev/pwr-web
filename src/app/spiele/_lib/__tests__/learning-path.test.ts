import { describe, expect, it } from "@jest/globals";
import {
  celebrationSteps,
  createLearningPath,
  mergePathEntry,
  parsePathStore,
  recordPathRun,
} from "../learning-path";

const stage = (id: string) => ({ id, title: id, hint: id });
const path = createLearningPath([
  { title: "Eins", stages: [stage("a"), stage("b")] },
  { title: "Zwei", stages: [stage("c")] },
  { title: "Drei", stages: [stage("d"), stage("e"), stage("f")] },
]);

describe("createLearningPath", () => {
  it("locks sections until the previous challenge is passed", () => {
    expect(path.isSectionUnlocked(0, {})).toBe(true);
    expect(path.isSectionUnlocked(1, {})).toBe(false);
    const passed = { "challenge-0": { stars: 2, passed: true } };
    expect(path.isSectionUnlocked(1, passed)).toBe(true);
    expect(path.isSectionUnlocked(2, passed)).toBe(false);
  });

  it("samples earlier stages and fills short challenges", () => {
    const first = path.challengeStages(0, { min: 5, max: 8 });
    expect(first).toHaveLength(5);
    expect(first.every((s) => ["a", "b"].includes(s.id))).toBe(true);
    const last = path.challengeStages(2, { min: 2, max: 4 });
    expect(last).toHaveLength(4);
    for (const s of path.sections[2]!.stages) expect(last).toContain(s);
    expect(last.some((s) => ["a", "b", "c"].includes(s.id))).toBe(true);
  });
});

describe("recordPathRun", () => {
  it("rewards a lesson and walks on from two stars", () => {
    const run = recordPathRun(path, {}, "a", { percent: 80, completed: true });
    expect(run.stars).toBe(2);
    expect(run.progress.a?.stars).toBe(2);
    expect(run.celebration?.toId).toBe("b");
  });

  it("needs a finished run with 70 percent for a challenge", () => {
    const lost = recordPathRun(path, {}, "challenge-0", {
      percent: 90,
      completed: false,
    });
    expect(lost.passed).toBe(false);
    expect(lost.celebration).toBeNull();
    const won = recordPathRun(path, {}, "challenge-0", {
      percent: 70,
      completed: true,
    });
    expect(won.passed).toBe(true);
    expect(won.celebration?.toId).toBe("c");
    expect(won.celebration?.unlockedSection).toBe(1);
  });

  it("keeps the best result", () => {
    expect(mergePathEntry({ stars: 3, passed: true }, 1, false)).toEqual({
      stars: 3,
      passed: true,
    });
  });
});

describe("parsePathStore", () => {
  it("survives broken or foreign storage", () => {
    expect(parsePathStore("{nope", path).selectedId).toBe("a");
    expect(parsePathStore(null, path).selectedId).toBe("a");
    expect(parsePathStore('{"selectedId":"gibtsnicht"}', path).selectedId).toBe(
      "a",
    );
  });

  it("moves a selection out of a locked section", () => {
    expect(parsePathStore('{"selectedId":"c"}', path).selectedId).toBe("a");
  });
});

describe("celebrationSteps", () => {
  it("ends with a walk only when there is a next stage", () => {
    const base = { fromId: "a", stars: 1, before: {}, unlockedSection: null };
    expect(celebrationSteps({ ...base, toId: null }).at(-1)?.stage).toBe(
      "stars",
    );
    expect(celebrationSteps({ ...base, toId: "b" }).at(-1)?.stage).toBe("walk");
  });
});
