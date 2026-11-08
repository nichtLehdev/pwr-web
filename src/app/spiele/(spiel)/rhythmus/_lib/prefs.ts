import { notifyProgressChanged, scopedKey } from "../../../_lib/profiles/scope";
import { LEVELS, type Level } from "../../../_lib/rhythm/levels";
import type { InputMode } from "./conductor";
import { ENDLESS_ID } from "./endless";
import { parseChallengeId, RHYTHM_PATH } from "./path";
import type { Stars } from "./feedback";

const PREFS_KEY = "pwr.spiele.v1.rhythmus.prefs";
const PROGRESS_KEY = "pwr.spiele.v1.rhythmus.progress";

export type PlayMode = "answer" | "band";

export type Prefs = {
  levelId: string;
  mode: PlayMode;
  input: InputMode;
  /** `null`: Tempo passt sich an. Mit festem Tempo gibt es keine Sterne. */
  fixedBpm: number | null;
};

export type LevelProgress = {
  stars: Stars;
  bestPercent: number;
  bestPoints: number;
  /** Zuletzt erreichtes Tempo: Hier geht es beim nächsten Mal weiter. */
  bpm: number;
  /** Nur Challenges: Einmal geschafft bleibt geschafft. */
  passed?: boolean;
};

export type Progress = Record<string, LevelProgress>;

export const DEFAULT_PREFS: Prefs = {
  levelId: LEVELS[0]!.id,
  mode: "answer",
  input: "hold",
  fixedBpm: null,
};

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(scopedKey(key));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(scopedKey(key), JSON.stringify(value));
    if (key === PROGRESS_KEY) notifyProgressChanged();
  } catch {
    /* Privatmodus: Es bleibt bei dieser Sitzung. */
  }
}

export function loadPrefs(): Prefs {
  const stored = read<Partial<Prefs>>(PREFS_KEY);
  return {
    levelId:
      stored?.levelId === ENDLESS_ID ||
      parseChallengeId(stored?.levelId) !== null
        ? stored!.levelId!
        : (RHYTHM_PATH.stageById(stored?.levelId)?.id ?? DEFAULT_PREFS.levelId),
    mode: stored?.mode === "band" ? "band" : "answer",
    input: stored?.input === "tap" ? "tap" : "hold",
    fixedBpm: typeof stored?.fixedBpm === "number" ? stored.fixedBpm : null,
  };
}

export function savePrefs(prefs: Prefs): void {
  write(PREFS_KEY, prefs);
}

export function loadProgress(): Progress {
  return read<Progress>(PROGRESS_KEY) ?? {};
}

export function saveProgress(progress: Progress): void {
  write(PROGRESS_KEY, progress);
}

/** Bestwerte bleiben, das Tempo folgt dem letzten Spiel. */
export function mergeProgress(
  progress: Progress,
  levelId: string,
  result: {
    stars: Stars;
    percent: number;
    points: number;
    bpm: number;
    passed?: boolean;
  },
): Progress {
  const previous = progress[levelId];
  return {
    ...progress,
    [levelId]: {
      stars: Math.max(previous?.stars ?? 0, result.stars) as Stars,
      bestPercent: Math.max(previous?.bestPercent ?? 0, result.percent),
      bestPoints: Math.max(previous?.bestPoints ?? 0, result.points),
      bpm: result.bpm,
      ...((previous?.passed || result.passed) && { passed: true }),
    },
  };
}

export function startBpm(
  level: Level,
  progress: Progress,
  stageId: string = level.id,
): number {
  const stored = progress[stageId]?.bpm;
  if (typeof stored !== "number") return level.bpm.start;
  return Math.min(level.bpm.max, Math.max(level.bpm.min, stored));
}
