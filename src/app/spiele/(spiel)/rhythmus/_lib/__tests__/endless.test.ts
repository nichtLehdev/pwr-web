import { describe, expect, it } from "@jest/globals";
import type { AudioPort } from "../../../../_lib/rhythm/audio";
import { generateBar } from "../../../../_lib/rhythm/generator";
import { barTicks, onsetsOf, sumTicks } from "../../../../_lib/rhythm/ticks";
import { Conductor, type Attempt } from "../conductor";
import {
  EndlessBandScript,
  EndlessPlan,
  endlessLevelAt,
  LONG_FROM_BPM,
  ENDLESS_METER,
  ENDLESS_STAGES,
  MAX_LIVES,
  mergeEndlessRecord,
} from "../endless";
import { AnswerScript } from "../session-script";

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

describe("endlessLevelAt", () => {
  it("generates valid bars at every stage and beyond", () => {
    for (let stage = 0; stage < ENDLESS_STAGES + 3; stage++) {
      const level = endlessLevelAt(stage);
      for (let run = 0; run < 100; run++) {
        const bar = generateBar(level, ENDLESS_METER);
        expect(sumTicks(bar)).toBe(barTicks(ENDLESS_METER));
        expect(onsetsOf(bar).length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("only ever adds rhythms", () => {
    let previous = new Set<string>();
    for (let stage = 0; stage < ENDLESS_STAGES; stage++) {
      const current = new Set(
        endlessLevelAt(stage).cells.map((c) => c.pattern),
      );
      for (const pattern of previous) expect(current.has(pattern)).toBe(true);
      previous = current;
    }
    expect(previous.has("t t t")).toBe(true);
  });
});

describe("EndlessPlan", () => {
  it("costs a life for a bad figure and ends at zero", () => {
    const plan = new EndlessPlan();
    plan.first();
    expect(plan.afterAnswer(0.2)?.announcement).toBe("lost");
    expect(plan.lives).toBe(MAX_LIVES - 1);
    expect(plan.afterAnswer(0.2)).not.toBeNull();
    expect(plan.afterAnswer(0.2)).toBeNull();
    expect(plan.reached).toBe(0);
  });

  it("does not punish a shaky but acceptable answer", () => {
    const plan = new EndlessPlan();
    plan.first();
    plan.afterAnswer(0.6);
    expect(plan.lives).toBe(MAX_LIVES);
    expect(plan.reached).toBe(1);
  });

  it("wins a life back after a long clean run, never above the maximum", () => {
    const plan = new EndlessPlan();
    plan.first();
    plan.afterAnswer(0.1);
    const announcements = [];
    for (let i = 0; i < 8; i++) {
      announcements.push(plan.afterAnswer(1)?.announcement);
    }
    expect(plan.lives).toBe(MAX_LIVES);
    expect(announcements.at(-1)).toBe("gained");
    for (let i = 0; i < 20; i++) plan.afterAnswer(1);
    expect(plan.lives).toBe(MAX_LIVES);
  });

  it("gets faster, keeps a playable limit and announces new rhythms", () => {
    const plan = new EndlessPlan();
    plan.first();
    const seen = new Set<string>();
    let last = plan.bpm;
    for (let i = 0; i < 400; i++) {
      const step = plan.afterAnswer(1)!;
      if (step.announcement) seen.add(step.announcement);
      expect(step.bpm).toBeGreaterThanOrEqual(last);
      last = step.bpm;
    }
    expect(last).toBe(150);
    expect(seen.has("fresh")).toBe(true);
    expect(seen.has("faster")).toBe(true);
  });
});

describe("EndlessBandScript", () => {
  it("can read ahead: bars stay fixed once looked at", () => {
    const script = new EndlessBandScript();
    const ahead = script.barAt(5);
    expect(script.barAt(5)).toBe(ahead);
  });

  it("speeds up in steps and announces them", () => {
    const script = new EndlessBandScript();
    expect(script.bpmAt(7)).toBe(72);
    expect(script.bpmAt(8)).toBe(76);
    expect(script.bpmAt(100_000)).toBe(150);
    script.next(null);
    const announcements = [];
    for (let i = 0; i < 9; i++)
      announcements.push(script.next(1)?.announcement);
    expect(announcements[8]).toBe("faster");
    expect(script.reached).toBe(9);
  });

  it("ends after three failed bars", () => {
    const script = new EndlessBandScript();
    script.next(null);
    script.next(null);
    expect(script.next(0)?.lives).toBe(2);
    expect(script.next(0)?.lives).toBe(1);
    expect(script.next(0)).toBeNull();
  });
});

function run(conductor: Conductor, audio: FakeAudio, hit: boolean) {
  let attempts: Attempt[] | null = null;
  conductor.subscribe({ onFinish: (a) => (attempts = a) });
  conductor.start(false);
  const done = new Set<string>();
  for (let step = 0; step < 400_000 && !attempts; step++) {
    audio.time += 0.005;
    const nowMs = audio.time * 1000;
    if (hit) {
      for (const attempt of conductor.attempts()) {
        attempt.notes.forEach((note) => {
          const key = `${attempt.segmentId}:${note.eventIndex}`;
          if (done.has(key) || nowMs < note.onsetMs) return;
          done.add(key);
          conductor.press(note.onsetMs);
          conductor.release(note.onsetMs + note.durationMs * 0.9);
        });
      }
    }
    conductor.pump(audio.time);
    if (hit && conductor.points > 800) break;
  }
  return attempts as Attempt[] | null;
}

describe("whole runs", () => {
  it("nobody plays: a run ends after three lost lives", () => {
    const audio = new FakeAudio();
    const plan = new EndlessPlan();
    const conductor = new Conductor(audio, new AnswerScript(plan, null), {
      input: "tap",
      leniency: 1,
      latencySec: 0,
    });
    const attempts = run(conductor, audio, false);
    expect(attempts).toHaveLength(MAX_LIVES);
    expect(plan.lives).toBe(0);
  });

  it("a perfect player does not lose breath", () => {
    const audio = new FakeAudio();
    const plan = new EndlessPlan();
    const conductor = new Conductor(audio, new AnswerScript(plan, null), {
      input: "hold",
      leniency: 1,
      latencySec: 0,
    });
    run(conductor, audio, true);
    expect(plan.lives).toBe(MAX_LIVES);
    expect(plan.reached).toBeGreaterThan(3);
    conductor.stop();
  });

  it("band: nobody plays, ends after three bars", () => {
    const audio = new FakeAudio();
    const script = new EndlessBandScript();
    const conductor = new Conductor(audio, script, {
      input: "tap",
      leniency: 1,
      latencySec: 0,
    });
    const attempts = run(conductor, audio, false);
    expect(attempts!.length).toBeLessThanOrEqual(MAX_LIVES + 1);
    expect(script.lives).toBe(0);
  });
});

describe("mergeEndlessRecord", () => {
  it("does not call the very first run a record, but keeps it", () => {
    const first = mergeEndlessRecord({}, "answer", { points: 10, reached: 2 });
    expect(first.isRecord).toBe(false);
    const second = mergeEndlessRecord(first.records, "answer", {
      points: 20,
      reached: 1,
    });
    expect(second.isRecord).toBe(true);
    expect(second.records.answer).toEqual({ points: 20, reached: 2 });
    expect(second.records.band).toBeUndefined();
  });
});

describe("longer figures and separate triplets", () => {
  it("never mixes triplets and sixteenths in one figure", () => {
    for (let stage = 0; stage < ENDLESS_STAGES + 2; stage++) {
      for (const family of ["straight", "triplet"] as const) {
        const patterns = endlessLevelAt(stage, family).cells.map(
          (c) => c.pattern,
        );
        const triplet = patterns.some((p) => p.split(" ").includes("t"));
        const sixteenth = patterns.some((p) => p.includes("16"));
        expect(triplet && sixteenth).toBe(false);
      }
    }
  });

  it("switches to two bars at a calm tempo and holds the tempo for a while", () => {
    let seed = 1;
    const plan = new EndlessPlan(
      () => (seed = (seed * 16807) % 2147483647) / 2147483647,
    );
    let step = plan.first();
    const seen: { bars: number; bpm: number; announcement: unknown }[] = [];
    for (let i = 0; i < 60; i++) {
      seen.push({
        bars: step.figure.bars.length,
        bpm: step.bpm,
        announcement: step.announcement,
      });
      step = plan.afterAnswer(1)!;
    }
    const switchAt = seen.findIndex((s) => s.bars === 2);
    expect(switchAt).toBeGreaterThan(0);
    expect(seen[switchAt]!.announcement).toBe("longer");
    expect(seen[switchAt]!.bpm).toBeGreaterThanOrEqual(LONG_FROM_BPM);
    expect(seen[switchAt]!.bpm).toBeLessThan(LONG_FROM_BPM + 3);
    expect(seen.slice(0, switchAt).every((s) => s.bars === 1)).toBe(true);
    expect(seen.slice(switchAt).every((s) => s.bars === 2)).toBe(true);
    const held = seen.slice(switchAt, switchAt + 7).map((s) => s.bpm);
    expect(new Set(held).size).toBe(1);
    expect(seen.at(-1)!.bpm).toBeGreaterThan(held[0]!);
  });

  it("keeps two-bar blocks in one family in Notenband", () => {
    let seed = 3;
    const band = new EndlessBandScript(
      () => (seed = (seed * 16807) % 2147483647) / 2147483647,
    );
    const isTripletBar = (bar: { tupletId?: number }[]) =>
      bar.some((e) => e.tupletId !== undefined);
    const isSixteenthBar = (bar: { ticks: number; tupletId?: number }[]) =>
      bar.some((e) => e.tupletId === undefined && e.ticks === 12);
    for (let i = 0; i < 400; i += 2) {
      const pair = [band.barAt(i), band.barAt(i + 1)];
      const triplet = pair.some(isTripletBar);
      const sixteenth = pair.some(isSixteenthBar);
      expect(triplet && sixteenth).toBe(false);
    }
  });

  it("slows the tempo rise in Notenband from the calm limit on", () => {
    const band = new EndlessBandScript();
    const early = band.bpmAt(8) - band.bpmAt(0);
    const at = Array.from({ length: 400 }, (_, i) => band.bpmAt(i)).findIndex(
      (bpm) => bpm >= LONG_FROM_BPM,
    );
    expect(band.bpmAt(at + 16) - band.bpmAt(at)).toBeLessThan(early);
  });
});
