import { describe, expect, it } from "@jest/globals";
import { harmonyFor, type AudioPort } from "../../../../_lib/rhythm/audio";
import { parseCell } from "../../../../_lib/rhythm/generator";
import { LEVELS, levelById } from "../../../../_lib/rhythm/levels";
import { onsetsOf, secPerTick } from "../../../../_lib/rhythm/ticks";
import { Conductor, type Attempt } from "../conductor";
import { summarize } from "../feedback";
import {
  AnswerPlan,
  AnswerScript,
  BandScript,
  createBandBars,
} from "../session-script";

const level = levelById("achtel")!;
const ts = level.meters[0]!;

class FakeAudio implements AudioPort {
  time = 100;
  clicks: { at: number; accent: boolean }[] = [];
  notes: { at: number; durationSec: number }[] = [];
  cancelled = 0;
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
  scheduleClick(at: number, accent: boolean) {
    this.clicks.push({ at, accent });
  }
  scheduleNote(at: number, durationSec: number) {
    this.notes.push({ at, durationSec });
  }
  scheduleBass() {}
  startHeld() {
    return { stop: () => undefined };
  }
  playShort() {}
  cancelScheduled() {
    this.cancelled++;
  }
}

/** Spielt die Sitzung durch: Der Roboter trifft jede Note um `errorMs` versetzt. */
function play(
  conductor: Conductor,
  audio: FakeAudio,
  errorMs: (note: number) => number,
  hits = true,
  latencySec = 0,
) {
  let attempts: Attempt[] | null = null;
  const done = new Set<string>();
  conductor.subscribe({ onFinish: (a) => (attempts = a) });
  conductor.start(false);
  let noteCounter = 0;
  for (let step = 0; step < 200_000 && !attempts; step++) {
    audio.time += 0.005;
    const nowMs = audio.time * 1000;
    if (hits) {
      for (const attempt of conductor.attempts()) {
        attempt.notes.forEach((note) => {
          const key = `${attempt.segmentId}:${note.eventIndex}:${note.barIndex}`;
          if (done.has(key)) return;
          const at = note.onsetMs + errorMs(noteCounter);
          if (nowMs >= at) {
            done.add(key);
            noteCounter++;
            conductor.press(at);
            conductor.release(at + note.durationMs * 0.9);
          }
        });
      }
    }
    conductor.pump(audio.time - latencySec);
  }
  return attempts as unknown as Attempt[];
}

function answerConductor(audio: FakeAudio, total = 4, fixed = false, bpm = 90) {
  const plan = new AnswerPlan(level, ts, total, { start: bpm, fixed });
  return {
    plan,
    conductor: new Conductor(audio, new AnswerScript(plan, total), {
      input: "hold",
      leniency: 1,
      latencySec: 0,
    }),
  };
}

describe("AnswerPlan", () => {
  const make = (fixed = false) =>
    new AnswerPlan(level, ts, 10, { start: 80, fixed });

  it("repeats a failed figure once, then moves on", () => {
    const plan = make();
    const first = plan.first();
    const retry = plan.afterAnswer(0.3)!;
    expect(retry.announcement).toBe("again");
    expect(retry.figure).toBe(first.figure);
    expect(retry.index).toBe(0);
    const moved = plan.afterAnswer(0.3)!;
    expect(moved.index).toBe(1);
  });

  it("speeds up after two solid answers and slows after two failures", () => {
    const plan = make();
    plan.afterAnswer(0.95);
    const faster = plan.afterAnswer(0.95)!;
    expect(faster.announcement).toBe("faster");
    expect(faster.bpm).toBe(84);

    plan.afterAnswer(0.1);
    const slower = plan.afterAnswer(0.1)!;
    expect(slower.announcement).toBe("slower");
    expect(slower.bpm).toBe(80);
  });

  it("keeps a fixed tempo", () => {
    const plan = make(true);
    plan.afterAnswer(0.95);
    expect(plan.afterAnswer(0.95)!.bpm).toBe(80);
  });

  it("stays inside the level's tempo range", () => {
    const fast = new AnswerPlan(level, ts, 100, {
      start: level.bpm.max,
      fixed: false,
    });
    for (let i = 0; i < 10; i++)
      expect(fast.afterAnswer(1)!.bpm).toBe(level.bpm.max);
    const slow = new AnswerPlan(level, ts, 100, {
      start: level.bpm.min,
      fixed: false,
    });
    for (let i = 0; i < 10; i++) {
      expect(slow.afterAnswer(0)!.bpm).toBe(level.bpm.min);
    }
  });

  it("ends after the last figure", () => {
    const plan = new AnswerPlan(level, ts, 1, { start: 80, fixed: false });
    expect(plan.afterAnswer(1)).toBeNull();
  });
});

describe("Conductor", () => {
  it("plays a whole answer session: perfect robot gets three stars", () => {
    const audio = new FakeAudio();
    const { conductor } = answerConductor(audio);
    const attempts = play(conductor, audio, () => 0);
    expect(attempts).toHaveLength(4);
    expect(attempts.every((a) => a.accuracy === 1)).toBe(true);
    const summary = summarize(attempts);
    expect(summary.percent).toBe(100);
    expect(summary.stars).toBe(3);
  });

  it("keeps segments seamless: every click stays on the pulse grid", () => {
    const audio = new FakeAudio();
    const { conductor } = answerConductor(audio, 3, true);
    play(conductor, audio, () => 0);
    const pulse = 60 / 90;
    audio.clicks.forEach((click, i) => {
      expect(click.at - audio.clicks[0]!.at).toBeCloseTo(i * pulse, 6);
    });
  });

  it("repeats a figure when nobody plays, and still terminates", () => {
    const audio = new FakeAudio();
    const { conductor } = answerConductor(audio, 3);
    const attempts = play(conductor, audio, () => 0, false);
    expect(attempts).toHaveLength(6);
    expect(summarize(attempts).stars).toBe(0);
  });

  it("corrects for output latency before judging", () => {
    const audio = new FakeAudio();
    const plan = new AnswerPlan(level, ts, 1, { start: 90, fixed: true });
    const conductor = new Conductor(audio, new AnswerScript(plan, 1), {
      input: "tap",
      leniency: 1,
      latencySec: 0.2,
    });
    // Der Spieler hört alles 200 ms später und tippt genau dann.
    const attempts = play(conductor, audio, () => 200, true, 0.2);
    expect(attempts[0]!.notes.every((n) => n.verdict === "exact")).toBe(true);
  });

  it("schedules the call's notes on their onsets, one bar before the answer", () => {
    const audio = new FakeAudio();
    const { conductor, plan } = answerConductor(audio, 1, true);
    const figure = plan.first().figure;
    const attempts = play(conductor, audio, () => 0);
    const barSec = secPerTick(90) * 192;
    const callStart = attempts[0]!.startMs / 1000 - barSec;
    const onsets = onsetsOf(figure.bars[0]!);
    expect(audio.notes).toHaveLength(onsets.length);
    onsets.forEach((onset, i) => {
      expect(audio.notes[i]!.at).toBeCloseTo(
        callStart + onset.tick * secPerTick(90),
        6,
      );
    });
  });

  it("runs the band through all bars at one tempo", () => {
    const audio = new FakeAudio();
    const bars = createBandBars(level, ts).slice(0, 4);
    const conductor = new Conductor(audio, new BandScript(bars, ts, 100), {
      input: "tap",
      leniency: 1,
      latencySec: 0,
    });
    const attempts = play(conductor, audio, () => 10);
    expect(attempts.map((a) => a.index)).toEqual([0, 1, 2, 3]);
    expect(attempts.every((a) => a.bpm === 100)).toBe(true);
    expect(summarize(attempts).percent).toBe(100);
  });

  it("sounds a bar's first note in that bar's pitch, also when pressed early", () => {
    const four = { numerator: 4, denominator: 4 };
    const bars = [0, 1, 2].map(() => parseCell("q q q q"));
    for (const early of [0, 40]) {
      const audio = new FakeAudio();
      const pitches: number[] = [];
      audio.playShort = ((hz: number) => {
        pitches.push(hz);
      }) as unknown as FakeAudio["playShort"];
      const conductor = new Conductor(audio, new BandScript(bars, four, 100), {
        input: "tap",
        leniency: 1,
        latencySec: 0,
      });
      const attempts = play(conductor, audio, () => -early);
      [0, 1, 2].forEach((bar) => {
        expect(pitches.slice(bar * 4, bar * 4 + 4)).toEqual(
          Array(4).fill(harmonyFor({ index: bar }).melodyHz),
        );
      });
      expect(attempts.every((a) => a.extras === 0)).toBe(true);
    }
  });

  describe("pause", () => {
    /** Wie `play`, hält aber nach `pauseAt` Sekunden an und spielt nach einer Weile weiter. */
    function playWithPause(
      conductor: Conductor,
      audio: FakeAudio,
      pauseAt: number,
    ) {
      let attempts: Attempt[] | null = null;
      const kinds: string[] = [];
      const done = new Set<string>();
      conductor.subscribe({
        onFinish: (a) => (attempts = a),
        onSegment: (segment) => kinds.push(segment.kind),
      });
      conductor.start(false);
      const t0 = audio.time;
      let pausedOnce = false;
      for (let step = 0; step < 200_000 && !attempts; step++) {
        audio.time += 0.005;
        if (!pausedOnce && audio.time - t0 >= pauseAt) {
          pausedOnce = true;
          expect(conductor.pause(audio.time)).toBe(true);
          audio.time += 3;
          conductor.resume();
          kinds.push("|");
        }
        const nowMs = audio.time * 1000;
        for (const attempt of conductor.attempts()) {
          attempt.notes.forEach((note) => {
            const key = `${attempt.segmentId}:${note.eventIndex}:${note.barIndex}`;
            if (done.has(key) || nowMs < note.onsetMs + 5) return;
            done.add(key);
            conductor.press(note.onsetMs + 5);
            conductor.release(note.onsetMs + 5 + note.durationMs * 0.9);
          });
        }
        conductor.pump(audio.time);
      }
      return { attempts: attempts as unknown as Attempt[], kinds };
    }

    it("repeats the interrupted figure after a count-in and scores each once", () => {
      const audio = new FakeAudio();
      const { conductor } = answerConductor(audio, 3, true);
      // Mitten in der ersten Antwort: Einzählen, Vorspielen, dann ein Stück Antwort.
      const barSec = 4 * (60 / 90);
      const { attempts, kinds } = playWithPause(
        conductor,
        audio,
        0.15 + barSec * 2.5,
      );
      const afterPause = kinds.slice(kinds.indexOf("|") + 1);
      expect(afterPause.slice(0, 3)).toEqual(["count", "call", "answer"]);
      expect(attempts.map((a) => a.index)).toEqual([0, 1, 2]);
      expect(summarize(attempts).percent).toBe(100);
    });

    it("lets the band count in again and goes on from the cut bar", () => {
      const audio = new FakeAudio();
      const bars = createBandBars(level, ts).slice(0, 4);
      const conductor = new Conductor(audio, new BandScript(bars, ts, 100), {
        input: "tap",
        leniency: 1,
        latencySec: 0,
      });
      const barSec = 4 * (60 / 100);
      const { attempts, kinds } = playWithPause(
        conductor,
        audio,
        0.15 + barSec * 2.4,
      );
      expect(kinds.slice(kinds.indexOf("|") + 1)[0]).toBe("count");
      expect(attempts.map((a) => a.index)).toEqual([0, 1, 2, 3]);
      expect(summarize(attempts).percent).toBe(100);
    });

    it("takes back the points of the cut part", () => {
      const audio = new FakeAudio();
      const bars = createBandBars(level, ts).slice(0, 2);
      const conductor = new Conductor(audio, new BandScript(bars, ts, 100), {
        input: "tap",
        leniency: 1,
        latencySec: 0,
      });
      const plainAudio = new FakeAudio();
      const plain = new Conductor(plainAudio, new BandScript(bars, ts, 100), {
        input: "tap",
        leniency: 1,
        latencySec: 0,
      });
      const barSec = 4 * (60 / 100);
      playWithPause(conductor, audio, 0.15 + barSec * 1.6);
      playWithPause(plain, plainAudio, 999);
      expect(plain.points).toBeGreaterThan(0);
      expect(conductor.points).toBe(plain.points);
    });
  });

  it("does not count presses during the call", () => {
    const audio = new FakeAudio();
    const { conductor } = answerConductor(audio, 1, true);
    let attempts: Attempt[] | null = null;
    conductor.subscribe({ onFinish: (a) => (attempts = a) });
    let pressed = false;
    conductor.subscribe({
      onSegment: (segment) => {
        if (segment.kind === "call" && !pressed) {
          pressed = true;
          conductor.press(segment.startSec * 1000 + 37);
          conductor.release(segment.startSec * 1000 + 60);
        }
      },
    });
    conductor.start(false);
    for (let i = 0; i < 20_000 && !attempts; i++) {
      audio.time += 0.005;
      conductor.pump(audio.time);
    }
    expect(pressed).toBe(true);
    expect(attempts![0]!.extras).toBe(0);
  });

  it("silences planned sound when stopped", () => {
    const audio = new FakeAudio();
    const { conductor } = answerConductor(audio);
    conductor.start(false);
    conductor.stop();
    expect(audio.cancelled).toBe(1);
    conductor.press(0);
    expect(conductor.attempts().every((a) => a.presses.length === 0)).toBe(
      true,
    );
  });
});

describe("summaries", () => {
  it.each(LEVELS.map((l) => [l.id, l] as const))(
    "%s plays through without sloppy timing marking perfect play down",
    (_, each) => {
      const audio = new FakeAudio();
      const meter = each.meters[0]!;
      const plan = new AnswerPlan(each, meter, 2, {
        start: each.bpm.start,
        fixed: true,
      });
      const conductor = new Conductor(audio, new AnswerScript(plan, 2), {
        input: "hold",
        leniency: each.leniency,
        latencySec: 0,
      });
      const attempts = play(conductor, audio, () => 0);
      expect(summarize(attempts).percent).toBe(100);
    },
  );

  it("names a tendency to rush", () => {
    const audio = new FakeAudio();
    const { conductor } = answerConductor(audio, 4, true);
    const tips = summarize(play(conductor, audio, () => -45)).tips;
    expect(tips.join(" ")).toContain("eilst");
  });

  it("names a tendency to drag", () => {
    const audio = new FakeAudio();
    const { conductor } = answerConductor(audio, 4, true);
    const tips = summarize(play(conductor, audio, () => 45)).tips;
    expect(tips.join(" ")).toContain("schleppst");
  });

  it("praises clean timing and never mentions milliseconds", () => {
    const audio = new FakeAudio();
    const { conductor } = answerConductor(audio, 4, true);
    const { tips } = summarize(play(conductor, audio, () => 0));
    expect(tips.join(" ")).toContain("sitzt");
    expect(tips.join(" ")).not.toMatch(/\bms\b/);
  });
});
