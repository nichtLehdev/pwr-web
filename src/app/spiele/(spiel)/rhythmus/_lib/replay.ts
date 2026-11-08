import type { AudioPort } from "../../../_lib/rhythm/audio";
import type { Rng } from "../../../_lib/rhythm/generator";
import { Conductor, type Press } from "./conductor";
import { EndlessBandScript, EndlessPlan, Lives } from "./endless";
import {
  AnswerScript,
  type SegmentSpec,
  type SessionScript,
} from "./session-script";
import type { RhythmEvent } from "../../../_lib/rhythm/types";

/**
 * Rhythmus-Bestenliste: Das Gerät schickt seine Tastendrücke und die Genauigkeiten,
 * mit denen es entschieden hat. Der Server spielt den Lauf damit nach und zählt selbst.
 */

export type RhythmVariant = `${"answer" | "band"}:${"hold" | "tap"}`;
export const RHYTHM_VARIANTS: readonly RhythmVariant[] = [
  "answer:hold",
  "answer:tap",
  "band:hold",
  "band:tap",
];

/** Kleiner, fester Zufall: gleicher Startwert, gleiche Figuren auf Gerät und Server. */
export function seededRng(seed: number): Rng {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function endlessScript(
  variant: RhythmVariant,
  seed: number,
): {
  script: SessionScript;
  reached: () => number;
  band: EndlessBandScript | null;
} {
  const rng = seededRng(seed);
  if (variant.startsWith("band")) {
    const band = new EndlessBandScript(rng);
    return { script: band, reached: () => band.reached, band };
  }
  const plan = new EndlessPlan(rng);
  return {
    script: new AnswerScript(plan, null),
    reached: () => plan.reached,
    band: null,
  };
}

/** Merkt sich, mit welcher Genauigkeit das Skript jeweils gefragt wurde. */
export class RecordingScript implements SessionScript {
  readonly decisions: (number | null)[] = [];
  constructor(private readonly inner: SessionScript) {}

  next(lastAccuracy: number | null): SegmentSpec | null {
    this.decisions.push(lastAccuracy);
    return this.inner.next(lastAccuracy);
  }

  peekBar(index: number): RhythmEvent[] | undefined {
    return this.inner.peekBar?.(index);
  }

  rewind(from: { kind: SegmentSpec["kind"]; index: number }): void {
    this.inner.rewind?.(from);
  }
}

/** Gibt die Entscheidungen des Geräts weiter und merkt sich, was der Server selbst sah. */
class ReplayScript implements SessionScript {
  readonly seen: (number | null)[] = [];
  private index = 0;
  constructor(
    private readonly inner: SessionScript,
    private readonly decisions: readonly (number | null)[],
  ) {}

  next(lastAccuracy: number | null): SegmentSpec | null {
    this.seen.push(lastAccuracy);
    if (this.index >= this.decisions.length) return null;
    return this.inner.next(this.decisions[this.index++] ?? null);
  }

  peekBar(index: number): RhythmEvent[] | undefined {
    return this.inner.peekBar?.(index);
  }
}

class ReplayAudio implements AudioPort {
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

export type RecordedPress = { atMs: number; durationMs: number | null };

/** Drücke relativ zum Liedanfang, damit Gerät und Server dieselbe Uhr teilen. */
export function relativePresses(
  presses: readonly Press[],
  startSec: number,
): RecordedPress[] {
  return presses.map((p) => ({
    atMs: Math.round(p.atMs - startSec * 1000),
    durationMs: p.durationMs === null ? null : Math.round(p.durationMs),
  }));
}

/** Weicht eine gemeldete Genauigkeit stärker ab, hat jemand nachgeholfen. */
export const DECISION_TOLERANCE = 0.35;
const STEP_SEC = 0.005;
const MAX_SONG_SEC = 3 * 60 * 60;

export type ReplayResult =
  | { valid: true; points: number; reached: number; songMs: number }
  | { valid: false; reason: string };

export function replayRun(input: {
  variant: RhythmVariant;
  seed: number;
  decisions: readonly (number | null)[];
  presses: readonly RecordedPress[];
}): ReplayResult {
  const audio = new ReplayAudio();
  const { script: inner } = endlessScript(input.variant, input.seed);
  const script = new ReplayScript(inner, input.decisions);
  const conductor = new Conductor(audio, script, {
    input: input.variant.endsWith("tap") ? "tap" : "hold",
    leniency: 1,
    latencySec: 0,
  });
  let finished = false;
  const pointsAtStart = new Map<number, number>();
  conductor.subscribe({
    onFinish: () => (finished = true),
    onSegment: (segment) => pointsAtStart.set(segment.id, conductor.points),
  });
  conductor.start(false);
  const origin = conductor.startSec * 1000;

  type Event = { at: number; kind: "press" | "release" };
  const events: Event[] = input.presses
    .flatMap((p): Event[] => [
      { at: origin + p.atMs, kind: "press" },
      ...(p.durationMs === null
        ? []
        : [{ at: origin + p.atMs + p.durationMs, kind: "release" as const }]),
    ])
    .sort((a, b) => a.at - b.at);
  let next = 0;
  while (!finished && audio.time - conductor.startSec < MAX_SONG_SEC) {
    audio.time += STEP_SEC;
    const nowMs = audio.time * 1000;
    while (next < events.length && events[next]!.at <= nowMs) {
      const event = events[next++]!;
      if (event.kind === "press") conductor.press(event.at);
      else conductor.release(event.at);
    }
    conductor.pump(audio.time);
  }
  if (!finished) return { valid: false, reason: "Der Lauf endet nicht." };

  // Gemeldete und selbst gesehene Genauigkeit müssen zusammenpassen.
  for (const [i, reported] of input.decisions.entries()) {
    const seen = script.seen[i];
    if (reported === null || seen === null || seen === undefined) continue;
    if (Math.abs(reported - seen) > DECISION_TOLERANCE) {
      return {
        valid: false,
        reason: "Die Wertung passt nicht zu den Tastendrücken.",
      };
    }
  }

  // Die eigene Wertung entscheidet, wann die Puste wirklich weg war.
  const lives = new Lives();
  let reached = 0;
  let points = conductor.points;
  for (const attempt of conductor.attempts()) {
    const change = lives.register(attempt.accuracy);
    if (lives.lives <= 0) {
      points = pointsAtStart.get(attempt.segmentId + 1) ?? conductor.points;
      break;
    }
    if (change !== "lost") reached++;
  }
  const last = conductor.attempts().at(-1);
  const songMs = last ? Math.max(0, last.startMs - origin) + 1000 : 0;
  return { valid: true, points, reached, songMs };
}
