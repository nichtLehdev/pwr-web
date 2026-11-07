import { describe, expect, it } from "@jest/globals";
import type { AudioPort } from "../../../../_lib/rhythm/audio";
import { LEVELS } from "../../../../_lib/rhythm/levels";
import { Conductor, type Attempt } from "../conductor";
import {
  buildChallengeSteps,
  celebrationSteps,
  challengeCelebration,
  challengeId,
  challengePassed,
  ChallengePlan,
  clampSelection,
  isSectionUnlocked,
  levelCelebration,
  nextAfterLevel,
  parseChallengeId,
  SECTIONS,
} from "../path";
import type { LevelProgress, Progress } from "../prefs";
import { AnswerScript } from "../session-script";

const entry = (extra: Partial<LevelProgress>): LevelProgress => ({
  stars: 0,
  bestPercent: 0,
  bestPoints: 0,
  bpm: 60,
  ...extra,
});

describe("section locks", () => {
  it("opens only the first section at the start", () => {
    expect(isSectionUnlocked(0, {})).toBe(true);
    expect(isSectionUnlocked(1, {})).toBe(false);
  });

  it("opens the next section only with a passed challenge", () => {
    const failed: Progress = { [challengeId(0)]: entry({ stars: 1 }) };
    expect(isSectionUnlocked(1, failed)).toBe(false);
    const passed: Progress = { [challengeId(0)]: entry({ passed: true }) };
    expect(isSectionUnlocked(1, passed)).toBe(true);
    expect(isSectionUnlocked(2, passed)).toBe(false);
  });

  it("keeps sections open for players who already earned stars there", () => {
    const old: Progress = { [SECTIONS[2]!.levels[0]!.id]: entry({ stars: 2 }) };
    expect(isSectionUnlocked(2, old)).toBe(true);
  });

  it("moves a stored selection out of locked sections", () => {
    const locked = SECTIONS[1]!.levels[0]!.id;
    expect(clampSelection(locked, {})).toBe(LEVELS[0]!.id);
    expect(clampSelection(challengeId(1), {})).toBe(LEVELS[0]!.id);
    expect(clampSelection(challengeId(0), {})).toBe(challengeId(0));
    expect(clampSelection("endlos", {})).toBe("endlos");
  });

  it("parses only real challenge ids", () => {
    expect(parseChallengeId(challengeId(1))).toBe(1);
    expect(parseChallengeId("challenge-99")).toBeNull();
    expect(parseChallengeId("achtel")).toBeNull();
  });

  it("leads from the last lesson of a section to its challenge", () => {
    const section = SECTIONS[0]!;
    expect(nextAfterLevel(section.levels[0]!)).toBe(section.levels[1]!.id);
    expect(nextAfterLevel(section.levels.at(-1)!)).toBe(challengeId(0));
  });
});

describe.each(SECTIONS.map((s) => [s.title, s] as const))(
  "%s",
  (_, section) => {
    const steps = buildChallengeSteps(section.index);

    it("covers every level of the section", () => {
      for (const level of section.levels) {
        expect(steps.some((step) => step.level === level)).toBe(true);
      }
    });

    it("reflects earlier sections and nothing from later ones", () => {
      const allowed = SECTIONS.slice(0, section.index + 1).flatMap(
        (s) => s.levels,
      );
      for (const step of steps) expect(allowed).toContain(step.level);
      for (const earlier of SECTIONS.slice(0, section.index)) {
        expect(steps.some((s) => earlier.levels.includes(s.level))).toBe(true);
      }
      expect(steps.length).toBeLessThanOrEqual(12);
      expect(steps.length).toBeGreaterThanOrEqual(8);
    });

    it("plays each level in a meter it supports, grouped together", () => {
      const keys = steps.map((s) => `${s.ts.numerator}/${s.ts.denominator}`);
      const changes = keys.filter((key, i) => i > 0 && key !== keys[i - 1]);
      expect(changes.length).toBeLessThan(new Set(keys).size);
      for (const { level, ts } of steps)
        expect(level.meters).toContainEqual(ts);
    });
  },
);

describe("ChallengePlan", () => {
  it("ends failed after three bad figures", () => {
    const plan = new ChallengePlan(0);
    plan.first();
    plan.afterAnswer(0);
    plan.afterAnswer(0);
    expect(plan.afterAnswer(0)).toBeNull();
    expect(plan.completed).toBe(false);
  });

  it("completes after the last figure, without repeating any step", () => {
    const plan = new ChallengePlan(1);
    const indices = [plan.first().index];
    for (;;) {
      const step = plan.afterAnswer(1);
      if (!step) break;
      indices.push(step.index);
    }
    expect(plan.completed).toBe(true);
    expect(indices).toEqual(Array.from({ length: plan.total }, (_, i) => i));
  });

  it("needs both the whole run and 70 percent to pass", () => {
    expect(challengePassed(true, 70)).toBe(true);
    expect(challengePassed(true, 69)).toBe(false);
    expect(challengePassed(false, 100)).toBe(false);
  });
});

class FakeAudio implements AudioPort {
  time = 10;
  now() {
    return this.time;
  }
  latencySec() {
    return 0;
  }
  wallToAudio(ms: number) {
    return ms / 1000;
  }
  syncClock() {}
  scheduleClick() {}
  scheduleNote() {}
  scheduleBass() {}
  startHeld() {
    return { stop: () => undefined };
  }
  playShort() {}
  cancelScheduled() {}
}

function run(sectionIndex: number, hit: boolean) {
  const audio = new FakeAudio();
  const plan = new ChallengePlan(sectionIndex);
  const kinds: string[] = [];
  const conductor = new Conductor(audio, new AnswerScript(plan, plan.total), {
    input: "hold",
    leniency: 1,
    latencySec: 0,
  });
  let attempts: Attempt[] | null = null;
  conductor.subscribe({
    onFinish: (a) => (attempts = a),
    onSegment: (s) => kinds.push(`${s.kind}:${s.timeSignature.numerator}`),
  });
  conductor.start(false);
  const done = new Set<string>();
  for (let i = 0; i < 300_000 && !attempts; i++) {
    audio.time += 0.005;
    if (hit) {
      for (const attempt of conductor.attempts()) {
        for (const note of attempt.notes) {
          const key = `${attempt.segmentId}:${note.barIndex}:${note.eventIndex}`;
          if (done.has(key) || audio.time * 1000 < note.onsetMs) continue;
          done.add(key);
          conductor.press(note.onsetMs);
          conductor.release(note.onsetMs + note.durationMs * 0.9);
        }
      }
    }
    conductor.pump(audio.time);
  }
  return { plan, kinds, attempts: attempts as Attempt[] | null };
}

describe("whole challenges", () => {
  it("nobody plays: fails after three lost Puste", () => {
    const { plan, attempts } = run(0, false);
    expect(plan.completed).toBe(false);
    expect(attempts).toHaveLength(3);
  });

  it("the last section can be finished, with a fresh count-in on meter changes", () => {
    const { plan, attempts, kinds } = run(SECTIONS.length - 2, true);
    expect(plan.completed).toBe(true);
    expect(attempts!.every((a) => a.accuracy === 1)).toBe(true);
    const meters = kinds.map((k) => k.split(":")[1]);
    kinds.forEach((kind, i) => {
      if (i > 0 && meters[i] !== meters[i - 1]) {
        expect(kind.startsWith("count")).toBe(true);
      }
    });
    expect(new Set(meters).size).toBeGreaterThan(1);
  });
});

describe("celebration on the path", () => {
  const section = SECTIONS[0]!;
  const level = section.levels[0]!;
  const last = section.levels.at(-1)!;
  const earned = (id: string, stars: 1 | 2 | 3): Progress => ({
    [id]: entry({ stars }),
  });

  it("stays out of the way after a run without stars", () => {
    expect(levelCelebration(level, {}, {}, 0)).toBeNull();
    expect(challengeCelebration(0, {}, false)).toBeNull();
  });

  it("walks to the next stage from two stars on", () => {
    expect(levelCelebration(level, {}, earned(level.id, 2), 2)?.toId).toBe(
      section.levels[1]!.id,
    );
    expect(
      levelCelebration(level, {}, earned(level.id, 1), 1)?.toId,
    ).toBeNull();
    expect(levelCelebration(last, {}, earned(last.id, 3), 3)?.toId).toBe(
      challengeId(0),
    );
  });

  it("reveals the best stars one by one", () => {
    const best = levelCelebration(level, {}, earned(level.id, 3), 1)!;
    expect(best.stars).toBe(3);
    const steps = celebrationSteps(best).filter((s) => s.stage === "stars");
    expect(steps.map((s) => s.revealed)).toEqual([1, 2, 3]);
  });

  it("only ends in a walk when there is somewhere to go", () => {
    const stay = levelCelebration(level, {}, earned(level.id, 1), 1)!;
    expect(celebrationSteps(stay).at(-1)?.stage).toBe("stars");
    const go = levelCelebration(level, {}, earned(level.id, 2), 2)!;
    expect(celebrationSteps(go).at(-1)?.stage).toBe("walk");
  });

  it("opens the next section after a passed challenge", () => {
    const first = challengeCelebration(0, {}, true)!;
    expect(first.toId).toBe(SECTIONS[1]!.levels[0]!.id);
    expect(first.unlockedSection).toBe(1);
    const again = challengeCelebration(
      0,
      { [challengeId(0)]: entry({ passed: true }) },
      true,
    )!;
    expect(again.unlockedSection).toBeNull();
    const end = challengeCelebration(SECTIONS.length - 1, {}, true)!;
    expect(end.toId).toBeNull();
  });
});
