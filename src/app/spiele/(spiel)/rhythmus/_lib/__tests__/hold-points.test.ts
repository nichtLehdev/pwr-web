import { describe, expect, it } from "@jest/globals";
import type { AudioPort } from "../../../../_lib/rhythm/audio";
import type { RhythmEvent } from "../../../../_lib/rhythm/types";
import { Conductor } from "../conductor";
import { BandScript } from "../session-script";

class FakeAudio implements AudioPort {
  time = 5;
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

const half: RhythmEvent = { value: "h", ticks: 96, isRest: false };
const bars: RhythmEvent[][] = [
  [half, half],
  [half, half],
];

/** Jede Note pünktlich angespielt, nur unterschiedlich lange gehalten. */
function play(input: "hold" | "tap", heldFraction: number) {
  const audio = new FakeAudio();
  const conductor = new Conductor(
    audio,
    new BandScript(bars, { numerator: 4, denominator: 4 }, 60),
    { input, leniency: 1, latencySec: 0 },
  );
  let done = false;
  conductor.subscribe({ onFinish: () => (done = true) });
  conductor.start(false);
  const pressed = new Set<string>();
  for (let i = 0; i < 20_000 && !done; i++) {
    audio.time += 0.005;
    for (const attempt of conductor.attempts()) {
      for (const note of attempt.notes) {
        const key = `${attempt.segmentId}:${note.barIndex}:${note.eventIndex}`;
        if (pressed.has(key) || audio.time * 1000 < note.onsetMs) continue;
        pressed.add(key);
        conductor.press(note.onsetMs);
        conductor.release(note.onsetMs + note.durationMs * heldFraction);
      }
    }
    conductor.pump(audio.time);
  }
  return conductor.points;
}

describe("held length counts for points", () => {
  it("gives fewer points for notes released too early", () => {
    const held = play("hold", 0.9);
    const short = play("hold", 0.2);
    expect(held).toBeGreaterThan(0);
    expect(short).toBeLessThan(held * 0.7);
  });

  it("leaves tapping unchanged", () => {
    expect(play("tap", 0.2)).toBe(play("tap", 0.9));
  });
});
