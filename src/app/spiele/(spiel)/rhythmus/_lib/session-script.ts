import {
  generateBarSequence,
  generateFigure,
  type Rng,
} from "../../../_lib/rhythm/generator";
import type { Level } from "../../../_lib/rhythm/levels";
import { figureKey } from "../../../_lib/rhythm/ticks";
import type {
  Figure,
  RhythmEvent,
  TimeSignature,
} from "../../../_lib/rhythm/types";

/** `ready`: ein leerer Takt zwischen Vorspielen und Nachspielen, nur für Einsteiger. */
export type SegmentKind = "count" | "call" | "ready" | "answer" | "read";
export type Announcement =
  "again" | "faster" | "slower" | "fresh" | "lost" | "gained" | "longer" | null;

export type SegmentSpec = {
  kind: SegmentKind;
  bpm: number;
  timeSignature: TimeSignature;
  bars: RhythmEvent[][];
  /** Figur (Antworten) bzw. Takt (Notenband): auch Basis für die Harmonie. */
  index: number;
  /** `null`: Endlos. */
  total: number | null;
  announcement: Announcement;
  /** Nur Endlos: verbleibende Puste. */
  lives?: number;
  /** Alle Figuren auf demselben Ton, siehe `harmonyFor`. */
  steadyPitch?: boolean;
};

/** Der Dirigent fragt kurz vor Ablauf des Laufenden nach dem nächsten Abschnitt. */
export interface SessionScript {
  /** `lastAccuracy`: Ergebnis des zuletzt angelegten Spielabschnitts. */
  next(lastAccuracy: number | null): SegmentSpec | null;
  /** Falls Takte vorab feststehen: nötig, um zu wissen, ob nach einer Note Pause kommt. */
  peekBar?(index: number): RhythmEvent[] | undefined;
}

/** Was das Notenband wissen muss, um im Voraus zu zeichnen und mitzulaufen. */
export interface BandSource {
  barAt(index: number): RhythmEvent[] | undefined;
  bpmAt(index: number): number;
  /** `null`: Endlos. */
  readonly barCount: number | null;
  readonly steadyPitch?: boolean;
}

/** Was das Nachspielen von seinen Regeln braucht; Stufen und Endlos füllen es verschieden. */
export interface AnswerRules {
  first(): AnswerStep;
  afterAnswer(accuracy: number): AnswerStep | null;
  readonly lives?: number;
}

const PASS_ACCURACY = 0.65;
const SOLID_ACCURACY = 0.85;
const MAX_ATTEMPTS = 2;
const TEMPO_STEP = 4;
const RECENT_FIGURES = 3;

export function figuresForLevel(level: Level): number {
  return level.figures ?? (level.bars === 2 ? 6 : 10);
}

export const BAND_BARS = 16;

export type AnswerStep = {
  figure: Figure;
  bpm: number;
  index: number;
  announcement: Announcement;
};

/** Regeln fürs Antworten: Wiederholung bei Patzern, Tempo folgt dem Können. */
export class AnswerPlan implements AnswerRules {
  bpm: number;
  private index = 0;
  private attempt = 1;
  private cleanRun = 0;
  private failRun = 0;
  private recent: string[] = [];
  private figure: Figure;

  constructor(
    private readonly level: Level,
    private readonly ts: TimeSignature,
    private readonly total: number,
    /** `steady`: nie schneller, langsamer aber schon, wenn es hakt. */
    private readonly tempo: { start: number; fixed: boolean; steady?: boolean },
    private readonly rng: Rng = Math.random,
  ) {
    this.bpm = tempo.start;
    this.figure = this.newFigure();
  }

  private newFigure(): Figure {
    const figure = generateFigure(this.level, this.ts, {
      rng: this.rng,
      avoid: new Set(this.recent),
    });
    this.recent = [...this.recent, figureKey(figure)].slice(-RECENT_FIGURES);
    return figure;
  }

  first(): AnswerStep {
    return {
      figure: this.figure,
      bpm: this.bpm,
      index: 0,
      announcement: null,
    };
  }

  afterAnswer(accuracy: number): AnswerStep | null {
    const passed = accuracy >= PASS_ACCURACY;
    let announcement: Announcement = null;

    if (passed) {
      this.failRun = 0;
      this.cleanRun = accuracy >= SOLID_ACCURACY ? this.cleanRun + 1 : 0;
      if (this.cleanRun >= 2 && !this.tempo.fixed && !this.tempo.steady) {
        this.cleanRun = 0;
        if (this.bpm < this.level.bpm.max) {
          this.bpm = Math.min(this.level.bpm.max, this.bpm + TEMPO_STEP);
          announcement = "faster";
        }
      }
    } else {
      this.cleanRun = 0;
      this.failRun++;
      if (this.failRun >= 2 && !this.tempo.fixed) {
        this.failRun = 0;
        if (this.bpm > this.level.bpm.min) {
          this.bpm = Math.max(this.level.bpm.min, this.bpm - TEMPO_STEP);
          announcement = "slower";
        }
      }
    }

    if (!passed && this.attempt < MAX_ATTEMPTS) {
      this.attempt++;
      return {
        figure: this.figure,
        bpm: this.bpm,
        index: this.index,
        announcement: announcement ?? "again",
      };
    }

    this.index++;
    this.attempt = 1;
    if (this.index >= this.total) return null;
    this.figure = this.newFigure();
    return {
      figure: this.figure,
      bpm: this.bpm,
      index: this.index,
      announcement,
    };
  }
}

/** Antworten: Einzählen, dann immer Vorspielen und Nachspielen. */
export class AnswerScript implements SessionScript {
  private step: AnswerStep | null = null;
  private stage: "count" | "call" | "ready" | "answer" | "decide" = "count";

  constructor(
    private readonly plan: AnswerRules,
    private readonly total: number | null,
    private readonly steadyPitch = false,
    /** Einen Takt zum Einzählen zwischen Vorspielen und Nachspielen. */
    private readonly gap = false,
  ) {}

  next(lastAccuracy: number | null): SegmentSpec | null {
    if (this.stage === "count") {
      this.step = this.plan.first();
      this.stage = "call";
      return this.spec("count", this.step, [emptyBar()]);
    }
    if (this.stage === "call") {
      this.stage = this.gap ? "ready" : "answer";
      return this.spec("call", this.step!, this.step!.figure.bars);
    }
    if (this.stage === "ready") {
      this.stage = "answer";
      return this.spec("ready", this.step!, [emptyBar()]);
    }
    if (this.stage === "answer") {
      this.stage = "decide";
      return this.spec("answer", this.step!, this.step!.figure.bars);
    }
    const previous = this.step!.figure.timeSignature;
    const step = this.plan.afterAnswer(lastAccuracy ?? 0);
    if (!step) return null;
    this.step = step;
    // Neue Taktart: erst neu einzählen, sonst fehlt der Puls.
    const { numerator, denominator } = step.figure.timeSignature;
    if (
      numerator !== previous.numerator ||
      denominator !== previous.denominator
    ) {
      this.stage = "call";
      return this.spec("count", step, [emptyBar()]);
    }
    this.stage = this.gap ? "ready" : "answer";
    return this.spec("call", step, step.figure.bars);
  }

  private spec(
    kind: SegmentKind,
    step: AnswerStep,
    bars: RhythmEvent[][],
  ): SegmentSpec {
    return {
      kind,
      bpm: step.bpm,
      timeSignature: step.figure.timeSignature,
      bars,
      index: step.index,
      total: this.total,
      announcement: kind === "call" ? step.announcement : null,
      lives: this.plan.lives,
      steadyPitch: this.steadyPitch,
    };
  }
}

/** Notenband: Einzählen, dann durchgehend vom Blatt, fest im Tempo. */
export class BandScript implements SessionScript, BandSource {
  private cursor = -1;

  constructor(
    readonly bars: RhythmEvent[][],
    readonly ts: TimeSignature,
    readonly bpm: number,
    readonly steadyPitch = false,
  ) {}

  peekBar(index: number): RhythmEvent[] | undefined {
    return this.bars[index];
  }

  barAt(index: number): RhythmEvent[] | undefined {
    return this.bars[index];
  }

  bpmAt(): number {
    return this.bpm;
  }

  get barCount(): number {
    return this.bars.length;
  }

  next(): SegmentSpec | null {
    const index = this.cursor++;
    if (index === -1) {
      return this.spec("count", [emptyBar()], 0);
    }
    const bar = this.bars[index];
    return bar ? this.spec("read", [bar], index) : null;
  }

  private spec(
    kind: SegmentKind,
    bars: RhythmEvent[][],
    index: number,
  ): SegmentSpec {
    return {
      kind,
      bpm: this.bpm,
      timeSignature: this.ts,
      bars,
      index,
      total: this.bars.length,
      announcement: null,
      steadyPitch: this.steadyPitch,
    };
  }
}

export function createBandBars(
  level: Level,
  ts: TimeSignature,
  rng: Rng = Math.random,
): RhythmEvent[][] {
  return generateBarSequence(level, ts, BAND_BARS, rng);
}

function emptyBar(): RhythmEvent[] {
  return [];
}
