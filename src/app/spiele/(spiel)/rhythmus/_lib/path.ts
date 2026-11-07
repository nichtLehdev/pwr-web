import {
  celebrationSteps,
  CHALLENGE_PASS_PERCENT,
  challengePassed,
  createLearningPath,
  pickDailyStages,
  type PathProgress,
  type Celebration,
  type CelebrationStage,
  type CelebrationStep,
} from "../../../_lib/learning-path";
import { generateFigure, type Rng } from "../../../_lib/rhythm/generator";
import { LEVELS, type Level } from "../../../_lib/rhythm/levels";
import { figureKey } from "../../../_lib/rhythm/ticks";
import type { TimeSignature } from "../../../_lib/rhythm/types";
import { Lives } from "./endless";
import type {
  AnswerRules,
  AnswerStep,
  BandSource,
  SegmentSpec,
  SessionScript,
} from "./session-script";
import { generateBar } from "../../../_lib/rhythm/generator";
import type { RhythmEvent } from "../../../_lib/rhythm/types";

export const RHYTHM_PATH = createLearningPath<Level>(
  [...new Set(LEVELS.map((level) => level.group))].map((title) => ({
    title,
    stages: LEVELS.filter((level) => level.group === title),
  })),
);

export const {
  sections: SECTIONS,
  challengeId,
  parseChallengeId,
  isChallengePassed,
  isSectionUnlocked,
  clampSelection,
  sectionOfStage: sectionOfLevel,
  nextAfterStage: nextAfterLevel,
  stageCelebration: levelCelebration,
  challengeCelebration,
} = RHYTHM_PATH;

export { celebrationSteps, CHALLENGE_PASS_PERCENT, challengePassed };
export type { Celebration, CelebrationStage, CelebrationStep };

/** Mehr Figuren würden eine Challenge länger machen, als Kinder dranbleiben. */
const MAX_CHALLENGE_FIGURES = 12;
/** Kürzer wäre sie kaum länger als eine Stufe und keine Prüfung. */
const MIN_CHALLENGE_FIGURES = 8;
/** Etwas Luft wie auf den leichten Stufen: Hier zählt der Überblick, nicht die Millisekunde. */
export const CHALLENGE_LENIENCY = 1.1;
const RECENT_FIGURES = 3;

export type ChallengeStep = {
  level: Level;
  ts: TimeSignature;
  bpm: number;
};

function sameMeter(a: TimeSignature, b: TimeSignature): boolean {
  return a.numerator === b.numerator && a.denominator === b.denominator;
}

/**
 * Alle Stufen des Abschnitts plus gleichmäßig verteilte frühere. Gleiche Taktarten stehen
 * zusammen, sonst müsste man alle paar Figuren neu umdenken.
 */
export function buildChallengeSteps(sectionIndex: number): ChallengeStep[] {
  return stepsForLevels(
    RHYTHM_PATH.challengeStages(sectionIndex, {
      min: MIN_CHALLENGE_FIGURES,
      max: MAX_CHALLENGE_FIGURES,
    }),
  );
}

const DAILY_FIGURES = 8;

/** Tagestraining: acht Figuren aus allen offenen Stufen, schwache öfter. */
export function buildDailySteps(progress: PathProgress): ChallengeStep[] {
  return stepsForLevels(pickDailyStages(RHYTHM_PATH, progress, DAILY_FIGURES));
}

function stepsForLevels(levels: Level[]): ChallengeStep[] {
  const bpm = Math.min(...levels.map((level) => level.bpm.start));

  const groups: { ts: TimeSignature; levels: Level[] }[] = [];
  for (const level of levels) {
    const existing = groups.find((group) =>
      level.meters.some((meter) => sameMeter(meter, group.ts)),
    );
    if (existing) existing.levels.push(level);
    else groups.push({ ts: level.meters[0]!, levels: [level] });
  }
  return groups.flatMap((group) =>
    group.levels.map((level) => ({
      level,
      ts: group.ts,
      bpm: Math.max(bpm, level.bpm.min),
    })),
  );
}

/** Eine Figur je Schritt, ohne Wiederholung: Fehler kosten Puste, das Tempo bleibt ruhig. */
export class ChallengePlan implements AnswerRules {
  private readonly health = new Lives();
  private readonly steps: ChallengeStep[];
  private index = 0;
  private recent: string[] = [];
  completed = false;

  constructor(
    source: number | ChallengeStep[],
    private readonly rng: Rng = Math.random,
  ) {
    this.steps =
      typeof source === "number" ? buildChallengeSteps(source) : source;
  }

  get lives(): number {
    return this.health.lives;
  }

  get total(): number {
    return this.steps.length;
  }

  private step(announcement: AnswerStep["announcement"]): AnswerStep {
    const { level, ts, bpm } = this.steps[this.index]!;
    const figure = generateFigure(level, ts, {
      rng: this.rng,
      avoid: new Set(this.recent),
    });
    this.recent = [...this.recent, figureKey(figure)].slice(-RECENT_FIGURES);
    return { figure, bpm, index: this.index, announcement };
  }

  first(): AnswerStep {
    return this.step(null);
  }

  afterAnswer(accuracy: number): AnswerStep | null {
    const change = this.health.register(accuracy);
    if (this.lives <= 0) return null;
    this.index++;
    if (this.index >= this.steps.length) {
      this.completed = true;
      return null;
    }
    return this.step(change);
  }
}

const BAND_CHALLENGE_BARS = { min: 12, max: 16 };
const BAND_DAILY_BARS = 8;

function sameMeterOf(a: TimeSignature, b: TimeSignature): boolean {
  return a.numerator === b.numerator && a.denominator === b.denominator;
}

/**
 * Das Notenband zeigt eine Taktart je Lauf: die, die die meisten Stufen kennen.
 * Stufen ohne diese Taktart fallen weg.
 */
export function bandMeterFor(levels: readonly Level[]): {
  ts: TimeSignature;
  levels: Level[];
} {
  const candidates = levels.flatMap((level) => level.meters);
  let best = candidates[0]!;
  let bestCount = -1;
  for (const meter of candidates) {
    const count = levels.filter((level) =>
      level.meters.some((m) => sameMeterOf(m, meter)),
    ).length;
    if (count > bestCount) {
      best = meter;
      bestCount = count;
    }
  }
  return {
    ts: best,
    levels: levels.filter((level) =>
      level.meters.some((m) => sameMeterOf(m, best)),
    ),
  };
}

/** Challenge und Tagestraining im Notenband: ein Takt je Stufe, drei Mal Puste. */
export class BandRunScript implements SessionScript, BandSource {
  readonly ts: TimeSignature;
  readonly barCount: number;
  private readonly bars: RhythmEvent[][];
  private readonly bpm: number;
  private readonly health = new Lives();
  private cursor = -1;
  completed = false;

  constructor(levels: readonly Level[], rng: Rng = Math.random) {
    const { ts, levels: usable } = bandMeterFor(levels);
    this.ts = ts;
    this.bars = usable.map((level) => generateBar(level, ts, rng));
    this.barCount = this.bars.length;
    const slowest = Math.min(...usable.map((level) => level.bpm.start));
    this.bpm = Math.max(slowest, ...usable.map((level) => level.bpm.min));
  }

  get lives(): number {
    return this.health.lives;
  }

  barAt(index: number): RhythmEvent[] | undefined {
    return this.bars[index];
  }

  peekBar(index: number): RhythmEvent[] | undefined {
    return this.bars[index];
  }

  bpmAt(): number {
    return this.bpm;
  }

  next(lastAccuracy: number | null): SegmentSpec | null {
    const index = this.cursor++;
    if (index === -1) return this.spec("count", [[]], 0, null);
    let announcement: SegmentSpec["announcement"] = null;
    if (lastAccuracy !== null) {
      const change = this.health.register(lastAccuracy);
      if (this.lives <= 0) return null;
      if (change) announcement = change;
    }
    if (index >= this.bars.length) {
      this.completed = true;
      return null;
    }
    return this.spec("read", [this.bars[index]!], index, announcement);
  }

  private spec(
    kind: SegmentSpec["kind"],
    bars: RhythmEvent[][],
    index: number,
    announcement: SegmentSpec["announcement"],
  ): SegmentSpec {
    return {
      kind,
      bpm: this.bpm,
      timeSignature: this.ts,
      bars,
      index,
      total: this.barCount,
      announcement,
      lives: this.lives,
    };
  }
}

export function bandChallenge(sectionIndex: number, rng?: Rng): BandRunScript {
  return new BandRunScript(
    RHYTHM_PATH.challengeStages(sectionIndex, BAND_CHALLENGE_BARS),
    rng,
  );
}

export function bandDaily(progress: PathProgress, rng?: Rng): BandRunScript {
  return new BandRunScript(
    pickDailyStages(RHYTHM_PATH, progress, BAND_DAILY_BARS),
    rng,
  );
}
