import { generateFigure, type Rng } from "../../../_lib/rhythm/generator";
import { LEVELS, levelById, type Level } from "../../../_lib/rhythm/levels";
import { figureKey } from "../../../_lib/rhythm/ticks";
import type { TimeSignature } from "../../../_lib/rhythm/types";
import { Lives } from "./endless";
import type { Progress } from "./prefs";
import type { AnswerRules, AnswerStep } from "./session-script";

export type Section = {
  index: number;
  title: string;
  levels: readonly Level[];
};

export const SECTIONS: readonly Section[] = [
  ...new Set(LEVELS.map((level) => level.group)),
].map((title, index) => ({
  index,
  title,
  levels: LEVELS.filter((level) => level.group === title),
}));

const CHALLENGE_PREFIX = "challenge-";
/** Mehr Figuren würden eine Challenge länger machen, als Kinder dranbleiben. */
const MAX_CHALLENGE_FIGURES = 12;
/** Kürzer wäre sie kaum länger als eine Stufe und keine Prüfung. */
const MIN_CHALLENGE_FIGURES = 8;
export const CHALLENGE_PASS_PERCENT = 70;
/** Etwas Luft wie auf den leichten Stufen: Hier zählt der Überblick, nicht die Millisekunde. */
export const CHALLENGE_LENIENCY = 1.1;
const RECENT_FIGURES = 3;

export function challengeId(sectionIndex: number): string {
  return `${CHALLENGE_PREFIX}${sectionIndex}`;
}

export function parseChallengeId(id: string | null | undefined): number | null {
  if (!id?.startsWith(CHALLENGE_PREFIX)) return null;
  const index = Number(id.slice(CHALLENGE_PREFIX.length));
  return Number.isInteger(index) && SECTIONS[index] ? index : null;
}

export function isChallengePassed(
  sectionIndex: number,
  progress: Progress,
): boolean {
  return progress[challengeId(sectionIndex)]?.passed === true;
}

/** Wer vor den Sperren schon Sterne in einem Abschnitt hatte, behält ihn. */
export function isSectionUnlocked(
  sectionIndex: number,
  progress: Progress,
): boolean {
  if (sectionIndex === 0) return true;
  if (isChallengePassed(sectionIndex - 1, progress)) return true;
  return (
    SECTIONS[sectionIndex]?.levels.some(
      (level) => (progress[level.id]?.stars ?? 0) > 0,
    ) ?? false
  );
}

export function sectionOfLevel(level: Level): Section {
  return SECTIONS.find((section) => section.title === level.group)!;
}

/** Gespeicherte Auswahl in einem gesperrten Abschnitt fällt auf die erste Stufe zurück. */
export function clampSelection(id: string, progress: Progress): string {
  const challenge = parseChallengeId(id);
  if (challenge !== null) {
    return isSectionUnlocked(challenge, progress) ? id : LEVELS[0]!.id;
  }
  const level = levelById(id);
  if (level && !isSectionUnlocked(sectionOfLevel(level).index, progress)) {
    return LEVELS[0]!.id;
  }
  return id;
}

/** Nach einer Stufe: die nächste im Abschnitt, am Ende die Challenge. */
export function nextAfterLevel(level: Level): string {
  const section = sectionOfLevel(level);
  const position = section.levels.indexOf(level);
  return section.levels[position + 1]?.id ?? challengeId(section.index);
}

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
  const section = SECTIONS[sectionIndex]!;
  const earlier = SECTIONS.slice(0, sectionIndex).flatMap((s) => s.levels);
  const room = Math.max(0, MAX_CHALLENGE_FIGURES - section.levels.length);
  const sampled =
    earlier.length <= room
      ? earlier
      : Array.from(
          { length: room },
          (_, i) => earlier[Math.floor((i * earlier.length) / room)]!,
        );
  const repeats = Array.from(
    {
      length: Math.max(
        0,
        MIN_CHALLENGE_FIGURES - sampled.length - section.levels.length,
      ),
    },
    (_, i) => section.levels[i % section.levels.length]!,
  );
  const levels = [...sampled, ...section.levels, ...repeats];
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
    sectionIndex: number,
    private readonly rng: Rng = Math.random,
  ) {
    this.steps = buildChallengeSteps(sectionIndex);
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

export function challengePassed(completed: boolean, percent: number): boolean {
  return completed && percent >= CHALLENGE_PASS_PERCENT;
}

export type Celebration = {
  fromId: string;
  /** Wohin Toni läuft; `null`, wenn er bleibt. */
  toId: string | null;
  stars: number;
  before: Progress;
  unlockedSection: number | null;
};

/** Ab zwei Sternen geht es weiter, darunter lohnt sich erst noch eine Runde. */
const STARS_TO_MOVE_ON = 2;

export function levelCelebration(
  level: Level,
  before: Progress,
  after: Progress,
  attemptStars: number,
): Celebration | null {
  if (attemptStars < 1) return null;
  const stars = after[level.id]?.stars ?? attemptStars;
  return {
    fromId: level.id,
    toId: stars >= STARS_TO_MOVE_ON ? nextAfterLevel(level) : null,
    stars,
    before,
    unlockedSection: null,
  };
}

export function challengeCelebration(
  sectionIndex: number,
  before: Progress,
  passed: boolean,
): Celebration | null {
  if (!passed) return null;
  const next = SECTIONS[sectionIndex + 1];
  return {
    fromId: challengeId(sectionIndex),
    toId: next?.levels[0]?.id ?? null,
    stars: 0,
    before,
    unlockedSection:
      next && !isSectionUnlocked(next.index, before) ? next.index : null,
  };
}

export type CelebrationStage = "arrive" | "done" | "stars" | "walk";
export type CelebrationStep = {
  stage: CelebrationStage;
  revealed: number;
  ms: number;
};

export function celebrationSteps(celebration: Celebration): CelebrationStep[] {
  const { stars, toId } = celebration;
  return [
    { stage: "arrive", revealed: 0, ms: 600 },
    { stage: "done", revealed: 0, ms: 450 },
    ...Array.from({ length: stars }, (_, i) => ({
      stage: "stars" as const,
      revealed: i + 1,
      ms: i === stars - 1 ? 700 : 420,
    })),
    ...(toId ? [{ stage: "walk" as const, revealed: stars, ms: 1000 }] : []),
  ];
}
