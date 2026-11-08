import { notifyProgressChanged, scopedKey } from "../../../_lib/profiles/scope";
import {
  generateBar,
  generateFigure,
  type Rng,
} from "../../../_lib/rhythm/generator";
import { LEVELS, type Cell, type Level } from "../../../_lib/rhythm/levels";
import { figureKey } from "../../../_lib/rhythm/ticks";
import type { RhythmEvent, TimeSignature } from "../../../_lib/rhythm/types";
import type {
  Announcement,
  AnswerRules,
  AnswerStep,
  BandSource,
  SegmentSpec,
  SessionScript,
} from "./session-script";

export const ENDLESS_ID = "endlos";
export const MAX_LIVES = 3;

/** Unterhalb davon ist die Figur daneben gegangen und kostet Puste. */
const LOSE_LIFE_BELOW = 0.5;
const CLEAN_ACCURACY = 0.85;
const CLEAN_RUN_FOR_LIFE = 8;
const START_BPM = 72;
/** Bei Sechzehnteln bleiben hier noch knapp 100 ms je Note: gerade noch spielbar. */
const MAX_BPM = 150;
const FIGURES_PER_STAGE = 3;
const BARS_PER_STAGE = 6;
const BARS_PER_TEMPO_STEP = 8;
const BAND_TEMPO_STEP = 4;
/** Ab hier werden Figuren länger statt nur schneller. */
export const LONG_FROM_BPM = 96;
/** Nach dem Wechsel auf zwei Takte bleibt das Tempo so viele Figuren stehen. */
const TEMPO_HOLD_FIGURES = 6;
/** Notenband oberhalb von LONG_FROM_BPM: seltener und kleiner schneller. */
const BAND_LATE_BARS_PER_STEP = 16;
const BAND_LATE_TEMPO_STEP = 2;
/** Nach dem Wechsel auf zwei Takte: so viele Figuren mit mehr langen Noten, abnehmend. */
export const CALM_FIGURES = 8;
/** Notenwerte, die man in der ruhigen Phase bevorzugt: Viertel, Halbe, Ganze und ihre Pausen. */
const CALM_TOKENS = new Set(["w", "hd", "h", "q", "rw", "rh", "rq"]);
/** So viele Figuren sind Triolen, sobald es welche gibt. */
const TRIPLET_SHARE = 0.35;
const RECENT_FIGURES = 3;

export const ENDLESS_METER: TimeSignature = { numerator: 4, denominator: 4 };

const SOURCE_LEVELS = LEVELS.filter((level) =>
  level.meters.some(
    (m) =>
      m.numerator === ENDLESS_METER.numerator &&
      m.denominator === ENDLESS_METER.denominator,
  ),
);

export const ENDLESS_STAGES = SOURCE_LEVELS.length;

/** Triolen und Sechzehntel in einer Figur sind zu viel Umdenken auf einmal. */
export type EndlessFamily = "all" | "straight" | "triplet";

function isTriplet(pattern: string): boolean {
  return pattern.split(" ").some((token) => token === "t" || token === "rt");
}

function isCalm(pattern: string): boolean {
  return pattern.split(" ").every((token) => CALM_TOKENS.has(token));
}

function isSixteenth(pattern: string): boolean {
  return pattern.includes("16");
}

export function hasTriplets(stage: number): boolean {
  return endlessLevelAt(stage).cells.some((cell) => isTriplet(cell.pattern));
}

/**
 * Alles bisher Gelernte; das Neueste kommt am häufigsten, damit man es auch übt.
 * `calm` (0 bis 1) verschiebt das Gewicht zu langen Noten, etwa wenn die Figur länger wird.
 */
export function endlessLevelAt(
  stage: number,
  family: EndlessFamily = "all",
  bars: 1 | 2 = 1,
  calm = 0,
): Level {
  const index = Math.min(stage, SOURCE_LEVELS.length - 1);
  const newest = SOURCE_LEVELS[index]!;
  const cells = new Map<string, Cell>();
  for (const level of SOURCE_LEVELS.slice(0, index + 1)) {
    for (const cell of level.cells) {
      cells.set(cell.pattern, {
        pattern: cell.pattern,
        strong: cell.strong,
        weight: cell.weight ?? 1,
      });
    }
  }
  for (const cell of newest.cells) {
    if (cell.focus) {
      cells.set(cell.pattern, { ...cell, weight: (cell.weight ?? 1) * 2 });
    }
  }
  const fits = (cell: Cell) =>
    family === "all" ||
    (family === "triplet"
      ? !isSixteenth(cell.pattern)
      : !isTriplet(cell.pattern));
  const settled = [...cells.values()].map((cell) =>
    calm <= 0
      ? cell
      : {
          pattern: cell.pattern,
          strong: cell.strong,
          // Nicht jedes Mal das Neueste erzwingen, solange man sich an zwei Takte gewöhnt.
          weight:
            (cell.weight ?? 1) *
            (isCalm(cell.pattern) ? 1 + 3 * calm : 1 - 0.85 * calm),
        },
  );
  return {
    id: ENDLESS_ID,
    title: "Endlos",
    hint: "",
    group: "Endlos",
    meters: [ENDLESS_METER],
    cells: settled.filter(fits),
    bpm: { min: START_BPM, start: START_BPM, max: MAX_BPM },
    bars,
    minOnsets: 2,
    leniency: 1,
  };
}

/** Puste: geteilte Regel beider Spielarten. */
export class Lives {
  lives = MAX_LIVES;
  private cleanRun = 0;

  /** Liefert, ob sich die Puste geändert hat. */
  register(accuracy: number): "lost" | "gained" | null {
    this.cleanRun = accuracy >= CLEAN_ACCURACY ? this.cleanRun + 1 : 0;
    if (accuracy < LOSE_LIFE_BELOW) {
      this.lives--;
      return "lost";
    }
    if (this.cleanRun >= CLEAN_RUN_FOR_LIFE) {
      this.cleanRun = 0;
      if (this.lives < MAX_LIVES) {
        this.lives++;
        return "gained";
      }
    }
    return null;
  }
}

/** Nachspielen ohne Ende: Erst neue Rhythmen, dann nur noch mehr Tempo. */
export class EndlessPlan implements AnswerRules {
  private readonly health = new Lives();
  private cleared = 0;
  private index = 0;
  private recent: string[] = [];
  private holdLeft = 0;
  /** Figurnummer, ab der es zwei Takte gibt. */
  private longFrom = 0;
  bpm = START_BPM;
  /** Ab LONG_FROM_BPM zwei Takte je Figur. */
  long = false;

  constructor(private readonly rng: Rng = Math.random) {}

  get lives(): number {
    return this.health.lives;
  }

  /** Geschaffte Figuren: das Ergebnis eines Laufs. */
  get reached(): number {
    return this.cleared;
  }

  private stage(): number {
    return Math.floor(this.cleared / FIGURES_PER_STAGE);
  }

  private step(announcement: Announcement): AnswerStep {
    const stage = this.stage();
    const family: EndlessFamily = !hasTriplets(stage)
      ? "straight"
      : this.rng() < TRIPLET_SHARE
        ? "triplet"
        : "straight";
    const calm = this.long
      ? Math.max(0, 1 - (this.index - this.longFrom) / CALM_FIGURES)
      : 0;
    const level = endlessLevelAt(stage, family, this.long ? 2 : 1, calm);
    const figure = generateFigure(level, ENDLESS_METER, {
      rng: this.rng,
      avoid: new Set(this.recent),
    });
    this.recent = [...this.recent, figureKey(figure)].slice(-RECENT_FIGURES);
    return { figure, bpm: this.bpm, index: this.index, announcement };
  }

  first(): AnswerStep {
    return this.step(null);
  }

  afterAnswer(accuracy: number): AnswerStep | null {
    const change = this.health.register(accuracy);
    if (this.lives <= 0) return null;
    this.index++;
    if (change === "lost") return this.step("lost");

    const stageBefore = this.stage();
    this.cleared++;
    const allStagesOpen = this.stage() >= ENDLESS_STAGES;
    const tempoStep = allStagesOpen ? 2 : 1;
    const bpmBefore = this.bpm;
    if (!this.long && this.bpm >= LONG_FROM_BPM) {
      this.long = true;
      this.longFrom = this.index;
      this.holdLeft = TEMPO_HOLD_FIGURES;
      return this.step("longer");
    }
    if (this.holdLeft > 0) this.holdLeft--;
    else this.bpm = Math.min(MAX_BPM, this.bpm + tempoStep);

    if (change === "gained") return this.step("gained");
    if (this.stage() !== stageBefore && !allStagesOpen) {
      return this.step("fresh");
    }
    // Nicht jede kleine Stufe ansagen: alle paar Figuren reicht als Signal.
    const crossedTen = Math.floor(this.bpm / 10) !== Math.floor(bpmBefore / 10);
    return this.step(crossedTen ? "faster" : null);
  }
}

/** Notenband ohne Ende: Takte sind vorab festgelegt, weil man sie im Voraus lesen muss. */
export class EndlessBandScript implements SessionScript, BandSource {
  readonly barCount = null;

  private readonly health = new Lives();
  private readonly bars: RhythmEvent[][] = [];
  private cursor = -1;
  private cleared = 0;
  private family: EndlessFamily = "straight";

  constructor(private readonly rng: Rng = Math.random) {}

  get lives(): number {
    return this.health.lives;
  }

  get reached(): number {
    return this.cleared;
  }

  bpmAt(index: number): number {
    const early =
      START_BPM + Math.floor(index / BARS_PER_TEMPO_STEP) * BAND_TEMPO_STEP;
    if (early < LONG_FROM_BPM) return early;
    const lateFrom =
      ((LONG_FROM_BPM - START_BPM) / BAND_TEMPO_STEP) * BARS_PER_TEMPO_STEP;
    return Math.min(
      MAX_BPM,
      LONG_FROM_BPM +
        Math.floor((index - lateFrom) / BAND_LATE_BARS_PER_STEP) *
          BAND_LATE_TEMPO_STEP,
    );
  }

  barAt(index: number): RhythmEvent[] {
    while (this.bars.length <= index) {
      const stage = Math.floor(this.bars.length / BARS_PER_STAGE);
      // Je zwei Takte entweder gerade oder Triolen, nie abwechselnd Takt für Takt.
      if (this.bars.length % 2 === 0) {
        this.family =
          hasTriplets(stage) && this.rng() < TRIPLET_SHARE
            ? "triplet"
            : "straight";
      }
      this.bars.push(
        generateBar(
          endlessLevelAt(stage, this.family),
          ENDLESS_METER,
          this.rng,
        ),
      );
    }
    return this.bars[index]!;
  }

  peekBar(index: number): RhythmEvent[] {
    return this.barAt(index);
  }

  private recount = false;

  rewind(from: { kind: SegmentSpec["kind"]; index: number }): void {
    this.cursor = from.kind === "read" ? from.index : Math.max(0, this.cursor);
    this.recount = true;
  }

  next(lastAccuracy: number | null): SegmentSpec | null {
    if (this.recount) {
      this.recount = false;
      const at = Math.max(0, this.cursor);
      return this.spec("count", [[]], at, this.bpmAt(at), null);
    }
    const index = this.cursor++;
    if (index === -1) {
      return this.spec("count", [[]], 0, this.bpmAt(0), null);
    }
    let announcement: Announcement = null;
    if (lastAccuracy !== null) {
      const change = this.health.register(lastAccuracy);
      if (this.lives <= 0) return null;
      if (change === "lost") announcement = "lost";
      else {
        this.cleared++;
        if (change === "gained") announcement = "gained";
      }
    }
    const bpm = this.bpmAt(index);
    if (!announcement && index > 0 && bpm !== this.bpmAt(index - 1)) {
      announcement = "faster";
    }
    return this.spec("read", [this.barAt(index)], index, bpm, announcement);
  }

  private spec(
    kind: SegmentSpec["kind"],
    bars: RhythmEvent[][],
    index: number,
    bpm: number,
    announcement: Announcement,
  ): SegmentSpec {
    return {
      kind,
      bpm,
      timeSignature: ENDLESS_METER,
      bars,
      index,
      total: null,
      announcement,
      lives: this.lives,
    };
  }
}

/** Endlos-Bestwerte je Spielart: Punkte und wie weit man gekommen ist. */
export type EndlessRecord = { points: number; reached: number };
export type EndlessRecords = Partial<Record<"answer" | "band", EndlessRecord>>;

const RECORDS_KEY = "pwr.spiele.v1.rhythmus.endless";

export function loadEndlessRecords(): EndlessRecords {
  try {
    const raw = localStorage.getItem(scopedKey(RECORDS_KEY));
    return raw ? (JSON.parse(raw) as EndlessRecords) : {};
  } catch {
    return {};
  }
}

export function saveEndlessRecords(records: EndlessRecords): void {
  try {
    localStorage.setItem(scopedKey(RECORDS_KEY), JSON.stringify(records));
    notifyProgressChanged();
  } catch {
    /* Privatmodus: Es bleibt bei dieser Sitzung. */
  }
}

export function mergeEndlessRecord(
  records: EndlessRecords,
  mode: "answer" | "band",
  run: EndlessRecord,
): { records: EndlessRecords; isRecord: boolean } {
  const previous = records[mode];
  const isRecord = previous !== undefined && run.points > previous.points;
  return {
    records: {
      ...records,
      [mode]: {
        points: Math.max(previous?.points ?? 0, run.points),
        reached: Math.max(previous?.reached ?? 0, run.reached),
      },
    },
    isRecord,
  };
}
