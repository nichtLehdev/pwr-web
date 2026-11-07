import {
  celebrationSteps,
  CHALLENGE_PASS_PERCENT,
  challengePassed,
  createLearningPath,
  type PathStage,
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
import type { PlayMode } from "./prefs";
import type { AnswerRules, AnswerStep } from "./session-script";

/** Eine Stufe des Pfads: eine Rhythmus-Stufe, nachgespielt oder im Notenband gelesen. */
export type RhythmStage = PathStage & {
  level: Level;
  mode: PlayMode;
};

/** Ab hier gehört das Notenband zum Weg; davor gibt es je eine Bonusstufe. */
const READING_FROM_SECTION = 2;

function answerStage(level: Level): RhythmStage {
  return {
    id: level.id,
    title: level.title,
    hint: level.hint,
    level,
    mode: "answer",
  };
}

function bandStage(level: Level): RhythmStage {
  return {
    id: `band:${level.id}`,
    title: `${level.title} lesen`,
    hint: "Lies die Noten auf dem Band und spiel mit",
    level,
    mode: "band",
    badge: "read",
  };
}

export const RHYTHM_PATH = createLearningPath<RhythmStage>(
  [...new Set(LEVELS.map((level) => level.group))].map((title, index) => {
    const levels = LEVELS.filter((level) => level.group === title);
    if (index < READING_FROM_SECTION) {
      return {
        title,
        stages: levels.map(answerStage),
        bonus: [bandStage(levels.at(-1)!)],
      };
    }
    // Erst hören, dann lesen: Nach je zwei Stufen und am Ende kommt das Notenband.
    return {
      title,
      stages: levels.flatMap((level, i) =>
        i % 2 === 1 || i === levels.length - 1
          ? [answerStage(level), bandStage(level)]
          : [answerStage(level)],
      ),
    };
  }),
);

export const {
  sections: SECTIONS,
  challengeId,
  parseChallengeId,
  isChallengePassed,
  isSectionUnlocked,
  clampSelection,
  sectionOfStage,
  nextAfterStage,
  stageCelebration,
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
    }).map((stage) => stage.level),
  );
}

const DAILY_FIGURES = 8;

/** Tagestraining: acht Figuren aus allen offenen Stufen, schwache öfter. */
export function buildDailySteps(progress: PathProgress): ChallengeStep[] {
  return stepsForLevels(
    pickDailyStages(RHYTHM_PATH, progress, DAILY_FIGURES).map((s) => s.level),
  );
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
