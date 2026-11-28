import {
  createLearningPath,
  type PathStage,
} from "../../../_lib/learning-path";
import {
  generateDistractors,
  generateFigure,
  pickMeter,
} from "../../../_lib/rhythm/generator";
import { LEVELS, type Level } from "../../../_lib/rhythm/levels";
import type { Figure } from "../../../_lib/rhythm/types";

export type DictationStage = PathStage & { level: Level };

/** Dieselben Stufen wie im Rhythmus: Was man spielen lernt, lernt man hier hören. */
export const DICTATION_PATH = createLearningPath<DictationStage>(
  [...new Set(LEVELS.map((level) => level.group))].map((title) => ({
    title,
    stages: LEVELS.filter((level) => level.group === title).map((level) => ({
      id: level.id,
      title: level.title,
      hint: "Hör genau hin und finde die passenden Noten",
      level,
    })),
  })),
);

const LESSON_ROUNDS = 8;
const CHALLENGE_ROUNDS = 10;
/** In den ersten beiden Abschnitten drei Antworten, danach vier. */
const SECTIONS_WITH_THREE_OPTIONS = 2;

export type DictationRun = {
  id: string;
  levels: Level[];
  options: number;
  challengeSection: number | null;
};

export function buildDictationRun(id: string): DictationRun {
  const challengeSection = DICTATION_PATH.parseChallengeId(id);
  const stage = DICTATION_PATH.stageById(id) ?? DICTATION_PATH.stages[0]!;
  const sectionIndex =
    challengeSection ?? DICTATION_PATH.sectionOfStage(stage).index;
  return {
    id,
    levels:
      challengeSection !== null
        ? DICTATION_PATH.challengeStages(challengeSection, {
            min: CHALLENGE_ROUNDS,
            max: CHALLENGE_ROUNDS,
          }).map((entry) => entry.level)
        : Array.from({ length: LESSON_ROUNDS }, () => stage.level),
    options: sectionIndex < SECTIONS_WITH_THREE_OPTIONS ? 3 : 4,
    challengeSection,
  };
}

export type DictationRound = {
  level: Level;
  target: Figure;
  options: Figure[];
  correctIndex: number;
};

export function createRound(
  level: Level,
  optionCount: number,
  avoid: Set<string>,
): DictationRound {
  const ts = pickMeter(level);
  const target = generateFigure(level, ts, { avoid });
  const wrong = generateDistractors(target, level, optionCount - 1);
  const correctIndex = Math.floor(Math.random() * (wrong.length + 1));
  const options = [...wrong];
  options.splice(correctIndex, 0, target);
  return { level, target, options, correctIndex };
}
