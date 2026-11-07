import {
  harmonyAt,
  type AudioPort,
  type HeldTone,
} from "../../../_lib/rhythm/audio";
import {
  barTicks,
  onsetsOf,
  pulseOf,
  secPerTick,
  TICKS_PER_QUARTER,
} from "../../../_lib/rhythm/ticks";
import type { TimeSignature } from "../../../_lib/rhythm/types";
import {
  LiveJudge,
  type ExpectedNote,
  type JudgedNote,
  type JudgeEvent,
} from "./judge";
import type { SegmentSpec, SessionScript } from "./session-script";

/** Vorlauf beim Planen. Kürzer heißt: spätere Entscheidung über die nächste Figur. */
const SCHEDULE_AHEAD_SEC = 0.16;
const START_DELAY_SEC = 0.15;
/** Nach dem letzten Abschnitt noch auslaufen lassen: späte Tipps zählen mit. */
const FINISH_TAIL_SEC = 0.35;

export type InputMode = "hold" | "tap";

export type Segment = SegmentSpec & {
  id: number;
  startSec: number;
  endSec: number;
};

export type Press = {
  /** Liedzeit in ms, spätere Korrekturen braucht es nicht. */
  atMs: number;
  durationMs: number | null;
};

/** Ein gespielter Abschnitt: daraus entstehen Wertung, Tipps und das Abspielen. */
export type Attempt = {
  segmentId: number;
  kind: "answer" | "read";
  index: number;
  bpm: number;
  timeSignature: TimeSignature;
  bars: SegmentSpec["bars"];
  startMs: number;
  accuracy: number;
  notes: JudgedNote[];
  extras: number;
  presses: Press[];
};

export type ConductorListener = {
  onSegment?: (segment: Segment) => void;
  onJudge?: (event: JudgeEvent) => void;
  onPress?: (press: Press, segment: Segment | null) => void;
  onRelease?: (press: Press, segment: Segment | null) => void;
  onFrame?: (songSec: number) => void;
  onFinish?: (attempts: Attempt[]) => void;
};

const VERDICT_POINTS = { exact: 10, close: 6, off: 2, missed: 0 } as const;
const STREAK_PER_MULTIPLIER = 8;
const MAX_MULTIPLIER = 4;

function segmentSeconds(spec: SegmentSpec): number {
  const bars = Math.max(1, spec.bars.length);
  return barTicks(spec.timeSignature) * bars * secPerTick(spec.bpm);
}

/**
 * Taktgeber einer Sitzung, nach dem Muster „lange im Voraus planen“: Audiozeit ist die einzige
 * Uhr, Timer wecken nur noch das Planen. Bildschirm und Eingabe rechnen sich auf diese Uhr um.
 */
export class Conductor {
  readonly judge: LiveJudge;
  private readonly listeners = new Set<ConductorListener>();
  private readonly segments: Segment[] = [];
  private readonly presses: Press[] = [];
  private activeSegment: Segment | null = null;
  private announced = 0;
  private cursorSec = 0;
  private lastSpec: SegmentSpec | null = null;
  private lastPlayable: Segment | null = null;
  private scriptDone = false;
  private running = false;
  private finished = false;
  private timer: number | null = null;
  private raf: number | null = null;
  private held: HeldTone | null = null;
  private openPress: Press | null = null;
  startSec = 0;
  points = 0;

  constructor(
    private readonly audio: AudioPort,
    private readonly script: SessionScript,
    private readonly options: {
      input: InputMode;
      leniency: number;
      /** Kalibrierter Wert hat Vorrang vor dem, was der Browser meldet. */
      latencySec: number | null;
    },
  ) {
    this.judge = new LiveJudge({
      judgeLengths: options.input === "hold",
      leniency: options.leniency,
    });
  }

  subscribe(listener: ConductorListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit<K extends keyof ConductorListener>(
    key: K,
    ...args: Parameters<NonNullable<ConductorListener[K]>>
  ): void {
    for (const listener of this.listeners) {
      (listener[key] as ((...a: typeof args) => void) | undefined)?.(...args);
    }
  }

  get latency(): number {
    return this.options.latencySec ?? this.audio.latencySec();
  }

  /** Serie lohnt sich: alle acht Treffer zählt jede Note mehr. */
  get multiplier(): number {
    return Math.min(
      MAX_MULTIPLIER,
      1 + Math.floor(this.judge.currentStreak / STREAK_PER_MULTIPLIER),
    );
  }

  private forward(event: JudgeEvent): void {
    if (event.type === "note" && event.note.verdict) {
      this.points += VERDICT_POINTS[event.note.verdict] * this.multiplier;
    }
    this.emit("onJudge", event);
  }

  /** Was man gerade hört (Audiozeit minus Ausgabeweg). */
  songSec(): number {
    return this.audio.wallToAudio(performance.now()) - this.latency;
  }

  /** Ohne `autoRun` treibt der Aufrufer per `pump` (Tests). */
  start(autoRun = true): void {
    this.running = true;
    this.startSec = this.audio.now() + START_DELAY_SEC;
    this.cursorSec = this.startSec;
    this.scheduleAhead();
    if (!autoRun) return;
    this.timer = window.setInterval(() => this.scheduleAhead(), 25);
    const frame = () => {
      this.pump(this.songSec());
      if (this.running) this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  private scheduleAhead(): void {
    while (
      this.running &&
      !this.scriptDone &&
      this.cursorSec - this.audio.now() < SCHEDULE_AHEAD_SEC
    ) {
      const accuracy = this.lastPlayable
        ? this.judge.accuracy(this.lastPlayable.id)
        : null;
      const spec = this.script.next(accuracy);
      if (!spec) {
        this.scriptDone = true;
        return;
      }
      this.place(spec);
    }
  }

  private place(spec: SegmentSpec): void {
    const startSec = this.cursorSec;
    const endSec = startSec + segmentSeconds(spec);
    const segment: Segment = {
      ...spec,
      id: this.segments.length + 1,
      startSec,
      endSec,
    };
    this.segments.push(segment);
    this.cursorSec = endSec;
    this.lastSpec = spec;
    this.scheduleSound(segment);

    if (spec.kind === "answer" || spec.kind === "read") {
      this.lastPlayable = segment;
      this.judge.addSegment({
        id: segment.id,
        startMs: startSec * 1000,
        endMs: endSec * 1000,
        pulseMs:
          pulseOf(spec.timeSignature).pulseTicks * secPerTick(spec.bpm) * 1000,
        notes: this.expectedNotes(segment),
      });
    }
  }

  private expectedNotes(segment: Segment): ExpectedNote[] {
    const tickSec = secPerTick(segment.bpm);
    const ticksPerBar = barTicks(segment.timeSignature);
    const nextBarStartsWithRest =
      segment.kind === "read"
        ? (this.nextReadBarStartsWithRest(segment) ?? true)
        : true;
    return segment.bars.flatMap((events, barIndex) =>
      onsetsOf(events).map((onset) => {
        const nextInFigure = segment.bars[barIndex + 1]?.[0];
        const nextIsRest = onset.isLastInBar
          ? nextInFigure
            ? nextInFigure.isRest
            : nextBarStartsWithRest
          : onset.nextIsRest;
        return {
          barIndex,
          eventIndex: onset.eventIndex,
          tick: onset.tick,
          onsetMs:
            (segment.startSec +
              (barIndex * ticksPerBar + onset.tick) * tickSec) *
            1000,
          durationMs: onset.ticks * tickSec * 1000,
          judgeLength: onset.ticks >= TICKS_PER_QUARTER,
          nextIsRest,
        };
      }),
    );
  }

  /** Beim Notenband sind alle Takte vorab bekannt. */
  private nextReadBarStartsWithRest(segment: Segment): boolean | null {
    const bars = (this.script as { bars?: SegmentSpec["bars"] }).bars;
    return bars?.[segment.index + 1]?.[0]?.isRest ?? null;
  }

  private scheduleSound(segment: Segment): void {
    const { audio } = this;
    const tickSec = secPerTick(segment.bpm);
    const { pulseTicks, pulsesPerBar } = pulseOf(segment.timeSignature);
    const pulseSec = pulseTicks * tickSec;
    const pulses = Math.round((segment.endSec - segment.startSec) / pulseSec);
    const harmony = harmonyAt(segment.index);

    for (let k = 0; k < pulses; k++) {
      const accent = k % pulsesPerBar === 0;
      const at = segment.startSec + k * pulseSec;
      audio.scheduleClick(at, accent);
      if (accent && segment.kind !== "count") {
        audio.scheduleBass(at, pulseSec * pulsesPerBar * 0.9, harmony.bassHz);
      }
    }

    if (segment.kind === "call") {
      const ticksPerBar = barTicks(segment.timeSignature);
      segment.bars.forEach((events, barIndex) => {
        for (const onset of onsetsOf(events)) {
          audio.scheduleNote(
            segment.startSec + (barIndex * ticksPerBar + onset.tick) * tickSec,
            onset.ticks * tickSec,
            harmony.melodyHz,
          );
        }
      });
    }
  }

  /** Ein Bildschirm-Takt: Uhr nachführen, Abschnitte melden, Überfälliges urteilen. */
  pump(songSec: number): void {
    if (!this.running) return;
    this.audio.syncClock();
    this.scheduleAhead();

    while (
      this.announced < this.segments.length &&
      this.segments[this.announced]!.startSec <= songSec
    ) {
      const segment = this.segments[this.announced]!;
      this.announced++;
      this.activeSegment = segment;
      this.emit("onSegment", segment);
    }

    for (const event of this.judge.advance(songSec * 1000)) {
      this.forward(event);
    }
    this.emit("onFrame", songSec);

    if (this.scriptDone && songSec > this.cursorSec + FINISH_TAIL_SEC) {
      this.finish();
    }
  }

  /** `wallMs`: Zeitstempel des Eingabe-Ereignisses, nicht der Moment der Verarbeitung. */
  press(wallMs: number): void {
    if (!this.running) return;
    const songMs = (this.audio.wallToAudio(wallMs) - this.latency) * 1000;
    const hz = harmonyAt(this.activeSegment?.index ?? 0).melodyHz;
    if (this.options.input === "hold") {
      this.held?.stop();
      this.held = this.audio.startHeld(hz);
    } else {
      this.audio.playShort(hz);
    }
    const press: Press = { atMs: songMs, durationMs: null };
    this.presses.push(press);
    this.openPress = press;
    const event = this.judge.press(songMs);
    this.emit("onPress", press, this.segmentAt(songMs));
    if (event) this.forward(event);
  }

  release(wallMs: number): void {
    this.held?.stop();
    this.held = null;
    if (!this.running) return;
    const songMs = (this.audio.wallToAudio(wallMs) - this.latency) * 1000;
    const press = this.openPress;
    if (press) {
      press.durationMs = Math.max(0, songMs - press.atMs);
      this.openPress = null;
      this.emit("onRelease", press, this.segmentAt(press.atMs));
    }
    const event = this.judge.release(songMs);
    if (event) this.forward(event);
  }

  /** Takt- bzw. Figurnummer eines Abschnitts: Der Richter kennt nur dessen id. */
  indexOfSegment(segmentId: number): number {
    return this.segments[segmentId - 1]?.index ?? -1;
  }

  private segmentAt(songMs: number): Segment | null {
    return (
      this.segments.find(
        (s) =>
          (s.kind === "answer" || s.kind === "read") &&
          songMs >= s.startSec * 1000 - 120 &&
          songMs < s.endSec * 1000,
      ) ?? null
    );
  }

  private finish(): void {
    if (this.finished) return;
    this.finished = true;
    this.halt();
    this.emit("onFinish", this.attempts());
  }

  attempts(): Attempt[] {
    return this.segments.flatMap((segment) => {
      if (segment.kind !== "answer" && segment.kind !== "read") return [];
      const judged = this.judge.segment(segment.id);
      if (!judged) return [];
      const startMs = segment.startSec * 1000;
      const endMs = segment.endSec * 1000;
      return [
        {
          segmentId: segment.id,
          kind: segment.kind,
          index: segment.index,
          bpm: segment.bpm,
          timeSignature: segment.timeSignature,
          bars: segment.bars,
          startMs,
          accuracy: this.judge.accuracy(segment.id),
          notes: judged.notes,
          extras: judged.extras,
          presses: this.presses.filter(
            (p) => p.atMs >= startMs - 120 && p.atMs < endMs,
          ),
        },
      ];
    });
  }

  private halt(): void {
    this.running = false;
    if (this.timer !== null) window.clearInterval(this.timer);
    if (this.raf !== null) cancelAnimationFrame(this.raf);
    this.timer = null;
    this.raf = null;
    this.held?.stop();
    this.held = null;
  }

  /** Abbrechen: auch bereits eingeplante Töne müssen verstummen. */
  stop(): void {
    this.halt();
    this.audio.cancelScheduled();
  }
}
