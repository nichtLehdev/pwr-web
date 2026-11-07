import { GAMES, type GameId } from "./games";
import { PROFILE_INSTRUMENTS } from "./profiles/options";

/**
 * Drei Wochenaufgaben je Profil, aus der Woche und dem Profil gewürfelt: Sie bleiben
 * die ganze Woche gleich und passen zu den Instrumenten.
 */
export const TASKS_PER_WEEK = 3;
export const TASK_REWARD_XP = 30;

export type TaskResult = {
  game: string;
  score: number;
  maxScore: number | null;
  xp: number;
  createdAt: Date;
  meta: Record<string, unknown> | null;
};

export type WeeklyTask = {
  key: string;
  title: string;
  target: number;
  measure: (
    results: readonly TaskResult[],
    dayKey: (d: Date) => string,
  ) => number;
};

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Kleiner, fester Zufall: gleiche Eingabe, gleiche Aufgaben. */
function seeded(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) % 100000) / 100000;
  };
}

function gameTitle(id: GameId): string {
  return GAMES.find((g) => g.slug === id)?.title ?? id;
}

function rounds(game: GameId, target: number): WeeklyTask {
  return {
    key: `rounds:${game}:${target}`,
    title: `Spiel ${target} Runden ${gameTitle(game)}`,
    target,
    measure: (results) => results.filter((r) => r.game === game).length,
  };
}

function instrumentTask(
  game: "noten-lesen" | "griffe",
  instrument: string,
  label: string,
  target: number,
): WeeklyTask {
  return {
    key: `instrument:${game}:${instrument}:${target}`,
    title:
      game === "noten-lesen"
        ? `Lies ${target} Runden Noten für ${label}`
        : `Übe ${target} Runden Griffe für ${label}`,
    target,
    measure: (results) =>
      results.filter(
        (r) => r.game === game && r.meta?.instrument === instrument,
      ).length,
  };
}

const TEMPLATES: ((
  instruments: readonly string[],
  rng: () => number,
) => WeeklyTask | null)[] = [
  (_, rng) => {
    const target = 3 + Math.floor(rng() * 3);
    return {
      key: `daily-days:${target}`,
      title: `Mach an ${target} Tagen das Tagestraining`,
      target,
      measure: (results, dayKey) =>
        new Set(
          results
            .filter((r) => r.meta?.kind === "daily")
            .map((r) => dayKey(r.createdAt)),
        ).size,
    };
  },
  (_, rng) => {
    const target = 2 + Math.floor(rng() * 3);
    return {
      key: `perfect:${target}`,
      title: `Schaff ${target} Runden ohne Fehler`,
      target,
      measure: (results) =>
        results.filter((r) => r.maxScore && r.score >= r.maxScore).length,
    };
  },
  (_, rng) => {
    const target = [100, 150, 200][Math.floor(rng() * 3)]!;
    return {
      key: `xp:${target}`,
      title: `Sammle ${target} XP`,
      target,
      measure: (results) => results.reduce((sum, r) => sum + r.xp, 0),
    };
  },
  (_, rng) => {
    const target = [20, 30, 40][Math.floor(rng() * 3)]!;
    return {
      key: `endless:${target}`,
      title: `Komm in Rhythmus Endlos bis zur Figur oder zum Takt ${target}`,
      target: 1,
      measure: (results) =>
        results.some(
          (r) =>
            r.game === "rhythmus" &&
            r.meta?.kind === "endless" &&
            typeof r.meta.reached === "number" &&
            r.meta.reached >= target,
        )
          ? 1
          : 0,
    };
  },
  (instruments, rng) => {
    const options = PROFILE_INSTRUMENTS.filter((i) =>
      instruments.includes(i.id),
    );
    if (options.length === 0) return null;
    const pick = options[Math.floor(rng() * options.length)]!;
    return instrumentTask(
      "noten-lesen",
      pick.noten,
      pick.label,
      3 + Math.floor(rng() * 3),
    );
  },
  (instruments, rng) => {
    const options = PROFILE_INSTRUMENTS.filter(
      (i) => instruments.includes(i.id) && i.griffe,
    );
    if (options.length === 0) return null;
    const pick = options[Math.floor(rng() * options.length)]!;
    return instrumentTask(
      "griffe",
      pick.griffe!,
      pick.label,
      3 + Math.floor(rng() * 3),
    );
  },
  (_, rng) => {
    const games: GameId[] = ["rhythmus", "diktat", "notenwaage"];
    return rounds(
      games[Math.floor(rng() * games.length)]!,
      3 + Math.floor(rng() * 3),
    );
  },
];

export function weeklyTasks(
  profileId: string,
  weekStart: Date,
  instruments: readonly string[],
): WeeklyTask[] {
  const rng = seeded(hash(`${profileId}:${weekStart.toISOString()}`));
  const order = TEMPLATES.map((template, index) => ({
    template,
    sort: rng(),
    index,
  })).sort((a, b) => a.sort - b.sort);
  const tasks: WeeklyTask[] = [];
  for (const { template } of order) {
    const task = template(instruments, rng);
    if (task) tasks.push(task);
    if (tasks.length === TASKS_PER_WEEK) break;
  }
  return tasks;
}
