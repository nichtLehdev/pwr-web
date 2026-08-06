import type { RhythmEvent } from "./types";
import { getExpectedOnsetTimesMs } from "./rhythm-generator";

export interface BeatResult {
  expectedMs: number;
  tappedMs: number | null;
  deltaMs: number | null;
  hitScore: number;
}

/** Urteil je erwartetem Schlag — für farbige Notenköpfe & Tabelle. */
export type OnsetVerdict = "good" | "ok" | "off" | "missed";

export interface ScoreResult {
  percent: number;
  beats: BeatResult[];
  missingCount: number;
  extraCount: number;
  medianAbsDeltaMs: number | null;
  /** Median der vorzeichenbehafteten Δ — zeigt „meist zu früh/zu spät“. */
  medianSignedDeltaMs: number | null;
  /** Tatsächlich verwendete Toleranz (inkl. Deckel bei engen Figuren). */
  toleranceMs: number;
  /** Urteil je erwartetem Schlag (gleiche Reihenfolge wie `beats`). */
  onsetVerdicts: OnsetVerdict[];
  /** Offsets (ms ab t=0) der Tipps ohne passenden Schlag. */
  extraTapOffsets: number[];
}

/** Zu weit weg zum Paaren: Tipp wird „extra“, Schlag bleibt „verpasst“. */
const PAIRING_MAX_TOLERANCE_FACTOR = 2;
/** Einzähl-Tipps (deutlich vor t=0) fliegen raus statt als Extra zu zählen. */
const COUNT_IN_GRACE_MS = 120;
/** Toleranz darf höchstens 45 % des kleinsten Onset-Abstands betragen. */
const MIN_GAP_TOLERANCE_FACTOR = 0.45;

/** Half-width of the „gute“ Zone; langsamere Stücke brauchen etwas mehr ms (bis Cap). */
export function toleranceMs(bpm: number): number {
  const beat = 60000 / bpm;
  return Math.min(200, Math.max(52, beat * 0.28));
}

/**
 * Effektive Toleranz: Basis nach Tempo, aber gedeckelt am kleinsten Abstand
 * zweier Onsets — sonst überlappen sich die Fenster bei Sechzehnteln.
 */
export function effectiveToleranceMs(
  bpm: number,
  expectedOnsets: readonly number[],
): number {
  let tol = toleranceMs(bpm);
  let minGap = Infinity;
  for (let i = 1; i < expectedOnsets.length; i++) {
    const gap = expectedOnsets[i]! - expectedOnsets[i - 1]!;
    if (gap > 0 && gap < minGap) minGap = gap;
  }
  if (Number.isFinite(minGap)) {
    tol = Math.min(tol, minGap * MIN_GAP_TOLERANCE_FACTOR);
  }
  return tol;
}

type EItem = { origIdx: number; t: number };
type TItem = { origIdx: number; t: number };

/**
 * Jedem erwarteten Schlag den nächstliegenden Tipp zuordnen (iterativ kleinste Distanz).
 * So landet ein Tipp beim zeitlich passenden Schlag statt strikt in Reihenfolge.
 * Paare jenseits `maxPairDistanceMs` werden nicht gebildet.
 */
function pairByGlobalNearest(
  expected: readonly number[],
  tapOffsets: readonly number[],
  maxPairDistanceMs: number,
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
    // Kleinste verbleibende Distanz zu groß → keine weiteren sinnvollen Paare.
    if (bestD > maxPairDistanceMs) break;

    const e = E[bestI]!;
    const t = T[bestJ]!;
    tapForExpected[e.origIdx] = t.t;
    E.splice(bestI, 1);
    T.splice(bestJ, 1);
  }

  const unpairedTaps = T.map((x) => x.t);
  return { tapForExpected, unpairedTaps };
}

function verdictFor(deltaMs: number | null, tol: number): OnsetVerdict {
  if (deltaMs === null) return "missed";
  const abs = Math.abs(deltaMs);
  if (abs <= tol * 0.5) return "good";
  if (abs <= tol) return "ok";
  return "off";
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
  const tol = effectiveToleranceMs(bpm, expected);

  const tapOffsets = tapTimesMs
    .map((t) => t - playingStartMs)
    .filter((t) => Number.isFinite(t))
    // Einzähl-Tipps (deutlich vor t=0) verwerfen — kein Extra, kein Paar.
    .filter((t) => t >= -(tol + COUNT_IN_GRACE_MS))
    .sort((a, b) => a - b);

  const { tapForExpected, unpairedTaps } = pairByGlobalNearest(
    expected,
    tapOffsets,
    tol * PAIRING_MAX_TOLERANCE_FACTOR,
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
  let percent: number;
  if (expected.length === 0) {
    // Defensive: ohne erwartete Schläge nicht pauschal 0 % zeigen.
    percent = Math.round(Math.max(0, Math.min(100, (1 - extraPenalty) * 100)));
  } else {
    percent = Math.round(
      Math.max(
        0,
        Math.min(100, (baseAvg - missingPenalty - extraPenalty) * 100),
      ),
    );
  }

  const signedDeltas = beats
    .filter((b) => b.deltaMs !== null)
    .map((b) => b.deltaMs!);
  let medianAbsDeltaMs: number | null = null;
  let medianSignedDeltaMs: number | null = null;
  if (signedDeltas.length > 0) {
    const sortedAbs = signedDeltas
      .map((d) => Math.abs(d))
      .sort((a, b) => a - b);
    medianAbsDeltaMs = sortedAbs[Math.floor(sortedAbs.length / 2)]!;
    const sortedSigned = [...signedDeltas].sort((a, b) => a - b);
    medianSignedDeltaMs = sortedSigned[Math.floor(sortedSigned.length / 2)]!;
  }

  const onsetVerdicts = beats.map((b) => verdictFor(b.deltaMs, tol));

  return {
    percent,
    beats,
    missingCount,
    extraCount,
    medianAbsDeltaMs,
    medianSignedDeltaMs,
    toleranceMs: tol,
    onsetVerdicts,
    extraTapOffsets: unpairedTaps,
  };
}
