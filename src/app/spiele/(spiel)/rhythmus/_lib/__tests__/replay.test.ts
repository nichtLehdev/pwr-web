import { describe, expect, it } from "@jest/globals";
import type { AudioPort } from "../../../../_lib/rhythm/audio";
import { Conductor, type Attempt } from "../conductor";
import {
  endlessScript,
  RecordingScript,
  relativePresses,
  replayRun,
  type RhythmVariant,
} from "../replay";

class FakeAudio implements AudioPort {
  time = 3;
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

/** Spielt wie ein Gerät: unregelmäßige Bildwechsel, Drücke mit kleinen Abweichungen. */
function playOnDevice(
  variant: RhythmVariant,
  seed: number,
  skill: (i: number) => boolean,
) {
  const audio = new FakeAudio();
  const { script, reached } = endlessScript(variant, seed);
  const recording = new RecordingScript(script);
  const conductor = new Conductor(audio, recording, {
    input: variant.endsWith("tap") ? "tap" : "hold",
    leniency: 1,
    latencySec: 0,
  });
  let attempts: Attempt[] | null = null;
  conductor.subscribe({ onFinish: (a) => (attempts = a) });
  conductor.start(false);
  const done = new Set<string>();
  let frame = 0;
  let noteIndex = 0;
  for (let i = 0; i < 40_000 && !attempts; i++) {
    audio.time += 0.011 + ((frame++ * 7) % 11) / 1000;
    for (const attempt of conductor.attempts().slice(-2)) {
      for (const note of attempt.notes) {
        const key = `${attempt.segmentId}:${note.barIndex}:${note.eventIndex}`;
        if (done.has(key) || audio.time * 1000 < note.onsetMs) continue;
        done.add(key);
        if (!skill(noteIndex++)) continue;
        const jitter = ((noteIndex * 37) % 50) - 25;
        conductor.press(note.onsetMs + jitter);
        conductor.release(note.onsetMs + jitter + note.durationMs * 0.85);
      }
    }
    conductor.pump(audio.time);
  }
  return {
    attempts: attempts as Attempt[] | null,
    reached: reached(),
    points: conductor.points,
    decisions: recording.decisions,
    presses: relativePresses(conductor.pressLog(), conductor.startSec),
  };
}

describe.each(["answer:hold", "band:tap"] as RhythmVariant[])(
  "%s",
  (variant) => {
    it("replays a run to the same score on the server", () => {
      const device = playOnDevice(
        variant,
        4242,
        (i) => i < 70 && (i % 9 !== 0 || i < 30),
      );
      expect(device.attempts).not.toBeNull();
      const server = replayRun({
        variant,
        seed: 4242,
        decisions: device.decisions,
        presses: device.presses,
      });
      expect(server.valid).toBe(true);
      if (!server.valid) return;
      expect(server.points).toBe(device.points);
      expect(server.reached).toBe(device.reached);
    });

    it("rejects a run whose decisions were faked", () => {
      const device = playOnDevice(variant, 7, (i) => i < 12);
      const faked = device.decisions.map((d) => (d === null ? null : 1));
      const server = replayRun({
        variant,
        seed: 7,
        decisions: faked,
        presses: device.presses,
      });
      expect(server.valid).toBe(false);
    });
  },
);
