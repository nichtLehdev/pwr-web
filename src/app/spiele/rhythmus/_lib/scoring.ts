import type { RhythmEvent } from "./types";
import { getExpectedOnsetTimesMs } from "./rhythm-generator";

export interface BeatResult {
  expectedMs: number;
  tappedMs: number | null;
  deltaMs: number | null;
  hitScore: number;
}

export interface ScoreResult {
  percent: number;
  beats: BeatResult[];
  missingCount: number;
  extraCount: number;
  medianAbsDeltaMs: number | null;
}

/** Half-width of the „gute“ Zone; langsamere Stücke brauchen etwas mehr ms (bis Cap). */
export function toleranceMs(bpm: number): number {
  const beat = 60000 / bpm;
  return Math.min(200, Math.max(52, beat * 0.28));
}

type EItem = { origIdx: number; t: number };
type TItem = { origIdx: number; t: number };

/**
 * Jedem erwarteten Schlag den nächstliegenden Tipp zuordnen (iterativ kleinste Distanz).
 * So landet ein Tipp beim zeitlich passenden Schlag statt strikt in Reihenfolge.
 */
function pairByGlobalNearest(
  expected: readonly number[],
  tapOffsets: readonly number[],
): { tapForExpected: (number | null)[]; unpairedTaps: number[] } {
  const E: EItem[] = expected.map((t, origIdx) => ({ origIdx, t }));
  const T: TItem[] = tapOffsets.map((t, origIdx) => ({ origIdx, t }));

  const tapForExpected: (number | null)[] = expected.map(() => null);

  while (E.length > 0 && T.length > 0) {
    let bestI = -1;
    let bestJ = -1;
    let bestD = Infinity;
    for (let i = 0; i < E.length; i++) {
      const ei = E[i]!;
      for (let j = 0; j < T.length; j++) {
        const d = Math.abs(ei.t - T[j]!.t);
        if (d < bestD) {
          bestD = d;
          bestI = i;
          bestJ = j;
        }
      }
    }
    if (bestI < 0 || bestJ < 0) break;

    const e = E[bestI]!;
    const t = T[bestJ]!;
    tapForExpected[e.origIdx] = t.t;
    E.splice(bestI, 1);
    T.splice(bestJ, 1);
  }

  const unpairedTaps = T.map((x) => x.t);
  return { tapForExpected, unpairedTaps };
}

/**
 * Nächstliegende Paarung, dann Timing-Score je Schlag.
 */
export function scoreTaps(
  expectedEvents: RhythmEvent[],
  tapTimesMs: number[],
  playingStartMs: number,
  bpm: number,
): ScoreResult {
  const expected = getExpectedOnsetTimesMs(expectedEvents);
  const tol = toleranceMs(bpm);

  const tapOffsets = tapTimesMs
    .map((t) => t - playingStartMs)
    .filter((t) => Number.isFinite(t))
    .sort((a, b) => a - b);

  const { tapForExpected, unpairedTaps } = pairByGlobalNearest(
    expected,
    tapOffsets,
  );

  const beats: BeatResult[] = [];
  for (let i = 0; i < expected.length; i++) {
    const exp = expected[i]!;
    const tapMs = tapForExpected[i] ?? null;
    if (tapMs === null) {
      beats.push({
        expectedMs: exp,
        tappedMs: null,
        deltaMs: null,
        hitScore: 0,
      });
    } else {
      const delta = tapMs - exp;
      // Quadratischer Abfall: gleiche ms-Fehler weniger hart als linear (mittlere Δ fühlen sich fairer an).
      const r = Math.min(1, Math.abs(delta) / tol);
      const hitScore = Math.max(0, 1 - r * r);
      beats.push({
        expectedMs: exp,
        tappedMs: tapMs,
        deltaMs: delta,
        hitScore,
      });
    }
  }

  const missingCount = beats.filter((b) => b.tappedMs === null).length;
  const extraCount = unpairedTaps.length;

  const hitScores = beats.map((b) => b.hitScore);
  const baseAvg =
    hitScores.length > 0
      ? hitScores.reduce((a, b) => a + b, 0) / hitScores.length
      : 0;

  const missingPenalty = missingCount * 0.1;
  const extraPenalty = extraCount * 0.08;
  const percent = Math.round(
    Math.max(0, Math.min(100, (baseAvg - missingPenalty - extraPenalty) * 100)),
  );

  const deltas = beats
    .filter((b) => b.deltaMs !== null)
    .map((b) => Math.abs(b.deltaMs!));
  let medianAbsDeltaMs: number | null = null;
  if (deltas.length > 0) {
    const sorted = [...deltas].sort((a, b) => a - b);
    medianAbsDeltaMs = sorted[Math.floor(sorted.length / 2)]!;
  }

  return {
    percent,
    beats,
    missingCount,
    extraCount,
    medianAbsDeltaMs,
  };
}
