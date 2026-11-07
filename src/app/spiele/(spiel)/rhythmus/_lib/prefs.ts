import { notifyProgressChanged, scopedKey } from "../../../_lib/profiles/scope";
import { levelById, LEVELS, type Level } from "../../../_lib/rhythm/levels";
import type { InputMode } from "./conductor";
import { ENDLESS_ID } from "./endless";
import { parseChallengeId } from "./path";
import type { Stars } from "./feedback";

const PREFS_KEY = "pwr.spiele.v1.rhythmus.prefs";
const PROGRESS_KEY = "pwr.spiele.v1.rhythmus.progress";
/** Notenband hat seinen eigenen Pfad: Lesen ist eine andere Fähigkeit als Nachspielen. */
const BAND_PROGRESS_KEY = "pwr.spiele.v1.rhythmus.band.progress";
const BAND_COPIED_KEY = "pwr.spiele.v1.rhythmus.band.copied";

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
    if (key === PROGRESS_KEY || key === BAND_PROGRESS_KEY)
      notifyProgressChanged();
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
        : (levelById(stored?.levelId)?.id ?? DEFAULT_PREFS.levelId),
    mode: stored?.mode === "band" ? "band" : "answer",
    input: stored?.input === "tap" ? "tap" : "hold",
    fixedBpm: typeof stored?.fixedBpm === "number" ? stored.fixedBpm : null,
  };
}

export function savePrefs(prefs: Prefs): void {
  write(PREFS_KEY, prefs);
}

export function loadProgress(mode: PlayMode = "answer"): Progress {
  if (mode === "answer") return read<Progress>(PROGRESS_KEY) ?? {};
  const band = read<Progress>(BAND_PROGRESS_KEY);
  if (band) return band;
  // Einmalig: Wer vor der Trennung gespielt hat, behält in beiden Pfaden, was offen war.
  if (read<boolean>(BAND_COPIED_KEY)) return {};
  const copied = read<Progress>(PROGRESS_KEY) ?? {};
  write(BAND_PROGRESS_KEY, copied);
  write(BAND_COPIED_KEY, true);
  return copied;
}

export function saveProgress(
  progress: Progress,
  mode: PlayMode = "answer",
): void {
  write(mode === "band" ? BAND_PROGRESS_KEY : PROGRESS_KEY, progress);
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

export function startBpm(level: Level, progress: Progress): number {
  const stored = progress[level.id]?.bpm;
  if (typeof stored !== "number") return level.bpm.start;
  return Math.min(level.bpm.max, Math.max(level.bpm.min, stored));
}
