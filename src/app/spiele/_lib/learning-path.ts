import { starsFor, type Stars } from "./rewards";

/**
 * Der Lernpfad aller Spiele: Abschnitte öffnen sich nacheinander, jeder endet mit
 * einer Challenge über alles bisher Gelernte.
 */

export type PathStage = { id: string; title: string; hint: string };

export type PathSection<S extends PathStage = PathStage> = {
  index: number;
  title: string;
  hint?: string;
  stages: readonly S[];
};

export type PathEntry = { stars: number; passed?: boolean };
export type PathProgress = Readonly<Record<string, PathEntry | undefined>>;

export type Celebration = {
  fromId: string;
  /** Wohin Toni läuft; `null`, wenn er bleibt. */
  toId: string | null;
  stars: number;
  before: PathProgress;
  unlockedSection: number | null;
};

export const CHALLENGE_PASS_PERCENT = 70;
/** Ab zwei Sternen geht es weiter, darunter lohnt sich erst noch eine Runde. */
const STARS_TO_MOVE_ON = 2;
const CHALLENGE_PREFIX = "challenge-";

export function challengePassed(completed: boolean, percent: number): boolean {
  return completed && percent >= CHALLENGE_PASS_PERCENT;
}

export type LearningPath<S extends PathStage = PathStage> = ReturnType<
  typeof createLearningPath<S>
>;

export function createLearningPath<S extends PathStage>(
  groups: readonly { title: string; hint?: string; stages: readonly S[] }[],
) {
  const sections: readonly PathSection<S>[] = groups.map((group, index) => ({
    ...group,
    index,
  }));
  const stages = sections.flatMap((section) => section.stages);

  const challengeId = (sectionIndex: number) =>
    `${CHALLENGE_PREFIX}${sectionIndex}`;

  const parseChallengeId = (id: string | null | undefined): number | null => {
    if (!id?.startsWith(CHALLENGE_PREFIX)) return null;
    const index = Number(id.slice(CHALLENGE_PREFIX.length));
    return Number.isInteger(index) && sections[index] ? index : null;
  };

  const stageById = (id: string | null | undefined): S | undefined =>
    stages.find((stage) => stage.id === id);

  const sectionOfStage = (stage: S): PathSection<S> =>
    sections.find((section) => section.stages.includes(stage))!;

  const isChallengePassed = (sectionIndex: number, progress: PathProgress) =>
    progress[challengeId(sectionIndex)]?.passed === true;

  /** Wer vor den Sperren schon Sterne in einem Abschnitt hatte, behält ihn. */
  const isSectionUnlocked = (sectionIndex: number, progress: PathProgress) => {
    if (sectionIndex === 0) return true;
    if (isChallengePassed(sectionIndex - 1, progress)) return true;
    return (
      sections[sectionIndex]?.stages.some(
        (stage) => (progress[stage.id]?.stars ?? 0) > 0,
      ) ?? false
    );
  };

  /** Gespeicherte Auswahl in einem gesperrten Abschnitt fällt auf die erste Stufe zurück. */
  const clampSelection = (id: string, progress: PathProgress): string => {
    const challenge = parseChallengeId(id);
    if (challenge !== null) {
      return isSectionUnlocked(challenge, progress) ? id : stages[0]!.id;
    }
    const stage = stageById(id);
    if (stage && !isSectionUnlocked(sectionOfStage(stage).index, progress)) {
      return stages[0]!.id;
    }
    return id;
  };

  /** Nach einer Stufe: die nächste im Abschnitt, am Ende die Challenge. */
  const nextAfterStage = (stage: S): string => {
    const section = sectionOfStage(stage);
    const position = section.stages.indexOf(stage);
    return section.stages[position + 1]?.id ?? challengeId(section.index);
  };

  const stageCelebration = (
    stage: S,
    before: PathProgress,
    after: PathProgress,
    attemptStars: number,
  ): Celebration | null => {
    if (attemptStars < 1) return null;
    const stars = after[stage.id]?.stars ?? attemptStars;
    return {
      fromId: stage.id,
      toId: stars >= STARS_TO_MOVE_ON ? nextAfterStage(stage) : null,
      stars,
      before,
      unlockedSection: null,
    };
  };

  const challengeCelebration = (
    sectionIndex: number,
    before: PathProgress,
    passed: boolean,
  ): Celebration | null => {
    if (!passed) return null;
    const next = sections[sectionIndex + 1];
    return {
      fromId: challengeId(sectionIndex),
      toId: next?.stages[0]?.id ?? null,
      stars: 0,
      before,
      unlockedSection:
        next && !isSectionUnlocked(next.index, before) ? next.index : null,
    };
  };

  /**
   * Alle Stufen des Abschnitts plus gleichmäßig verteilte frühere; zu kurze Challenges
   * wiederholen den Abschnitt, sonst wären sie kaum länger als eine Stufe.
   */
  const challengeStages = (
    sectionIndex: number,
    { min, max }: { min: number; max: number },
  ): S[] => {
    const section = sections[sectionIndex]!;
    const earlier = sections
      .slice(0, sectionIndex)
      .flatMap((entry) => entry.stages);
    const room = Math.max(0, max - section.stages.length);
    const sampled =
      earlier.length <= room
        ? earlier
        : Array.from(
            { length: room },
            (_, i) => earlier[Math.floor((i * earlier.length) / room)]!,
          );
    const repeats = Array.from(
      {
        length: Math.max(0, min - sampled.length - section.stages.length),
      },
      (_, i) => section.stages[i % section.stages.length]!,
    );
    return [...sampled, ...section.stages, ...repeats];
  };

  return {
    sections,
    stages,
    challengeId,
    parseChallengeId,
    stageById,
    sectionOfStage,
    isChallengePassed,
    isSectionUnlocked,
    clampSelection,
    nextAfterStage,
    stageCelebration,
    challengeCelebration,
    challengeStages,
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

/* Fortschritt der Spiele mit einfachem Stand; Rhythmus führt zusätzlich Tempo und Punkte. */

export type PathStore = { selectedId: string; progress: PathProgress };

export function parsePathStore<S extends PathStage>(
  raw: string | null,
  path: LearningPath<S>,
): PathStore {
  const first = path.stages[0]!.id;
  try {
    const parsed = JSON.parse(raw ?? "null") as Partial<PathStore> | null;
    const progress =
      parsed?.progress && typeof parsed.progress === "object"
        ? parsed.progress
        : {};
    const id = parsed?.selectedId ?? first;
    const known = path.stageById(id) || path.parseChallengeId(id) !== null;
    return {
      progress,
      selectedId: path.clampSelection(known ? id : first, progress),
    };
  } catch {
    return { selectedId: first, progress: {} };
  }
}

/** Einmal geschafft bleibt geschafft, Sterne gelten nach dem besten Lauf. */
export function mergePathEntry(
  previous: PathEntry | undefined,
  stars: number,
  passed: boolean,
): PathEntry {
  return {
    stars: Math.max(previous?.stars ?? 0, stars),
    ...((previous?.passed || passed) && { passed: true }),
  };
}

export function recordPathRun<S extends PathStage>(
  path: LearningPath<S>,
  progress: PathProgress,
  id: string,
  { percent, completed }: { percent: number; completed: boolean },
): {
  progress: PathProgress;
  stars: Stars;
  passed: boolean;
  celebration: Celebration | null;
} {
  const stars = starsFor(percent);
  const section = path.parseChallengeId(id);
  const passed = section !== null && challengePassed(completed, percent);
  const next = {
    ...progress,
    [id]: mergePathEntry(progress[id], stars, passed),
  };
  const stage = path.stageById(id);
  const celebration =
    section !== null
      ? path.challengeCelebration(section, progress, passed)
      : stage
        ? path.stageCelebration(stage, progress, next, stars)
        : null;
  return { progress: next, stars, passed, celebration };
}

/* Tagestraining: jeden Tag neu gemischt aus allem, was offen ist. */

export const DAILY_ID = "daily";

export type RunKind = "lesson" | "challenge" | "daily";

export function runKindOf<S extends PathStage>(
  path: LearningPath<S>,
  id: string,
): RunKind {
  if (id === DAILY_ID) return "daily";
  return path.parseChallengeId(id) !== null ? "challenge" : "lesson";
}

export function unlockedStages<S extends PathStage>(
  path: LearningPath<S>,
  progress: PathProgress,
): S[] {
  return path.sections
    .filter((section) => path.isSectionUnlocked(section.index, progress))
    .flatMap((section) => section.stages);
}

/** Schwache Stufen kommen öfter dran: ohne Sterne viermal so oft wie mit dreien. */
export function pickDailyStages<S extends PathStage>(
  path: LearningPath<S>,
  progress: PathProgress,
  count: number,
  rng: () => number = Math.random,
): S[] {
  const pool = unlockedStages(path, progress);
  const weight = (stage: S) => 4 - Math.min(3, progress[stage.id]?.stars ?? 0);
  const total = pool.reduce((sum, stage) => sum + weight(stage), 0);
  return Array.from({ length: count }, () => {
    let roll = rng() * total;
    for (const stage of pool) {
      roll -= weight(stage);
      if (roll < 0) return stage;
    }
    return pool[pool.length - 1]!;
  });
}

/** Abschnitt geschafft: Challenge bestanden oder der nächste Abschnitt schon offen. */
export function sectionFinished<S extends PathStage>(
  path: LearningPath<S>,
  sectionIndex: number,
  progress: PathProgress,
): boolean {
  if (path.isChallengePassed(sectionIndex, progress)) return true;
  return (
    sectionIndex + 1 < path.sections.length &&
    path.isSectionUnlocked(sectionIndex + 1, progress)
  );
}

/** Tagestraining nach Abschnitt 2, Endlos nach Abschnitt 3; vorher fehlt dafür das Handwerk. */
export const DAILY_AFTER_SECTION = 1;
export const ENDLESS_AFTER_SECTION = 2;
