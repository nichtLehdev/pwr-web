import {
  DIFFICULTY_VALUES,
  NOTE_VALUES,
  type DifficultyId,
  type NoteValueId,
  type Puzzle,
} from "./types";

function r<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

/**
 * Zählt Lösungs-MULTISETS (Kombinationen, keine Reihenfolgen): {Viertel, Halbe}
 * ist genau EINE Lösung. Rekursion über nicht-fallende Wertindizes ab
 * `startIdx`, memoisiert auf (Rest, freie Slots, Rest-Pausen, startIdx) und
 * beschnitten über die minimal/maximal noch erreichbare Summe.
 */
export function countWays(
  values: NoteValueId[],
  target: number,
  exactNotes: number,
  exactRests?: number,
): number {
  const defs = values
    .map((v) => NOTE_VALUES[v])
    .sort((a, b) => a.units - b.units);
  const n = defs.length;
  if (n === 0) return target === 0 && exactNotes === 0 ? 1 : 0;
  const maxUnit = defs[n - 1]!.units;
  const trackRests = exactRests != null;
  const memo = new Map<string, number>();

  const dfs = (
    remaining: number,
    slotsLeft: number,
    restsLeft: number,
    startIdx: number,
  ): number => {
    if (slotsLeft === 0) {
      return remaining === 0 && (!trackRests || restsLeft === 0) ? 1 : 0;
    }
    if (startIdx >= n) return 0;
    const minUnit = defs[startIdx]!.units;
    // Pruning: mit den verbleibenden Slots ist die Zielsumme nicht mehr
    // erreichbar (zu klein) oder zwangsläufig überschritten (zu groß).
    if (slotsLeft * maxUnit < remaining || slotsLeft * minUnit > remaining) {
      return 0;
    }
    const key = `${remaining}|${slotsLeft}|${restsLeft}|${startIdx}`;
    const hit = memo.get(key);
    if (hit != null) return hit;
    let ways = 0;
    for (let i = startIdx; i < n; i++) {
      const def = defs[i]!;
      // Aufsteigend sortiert: alle folgenden Werte sind mindestens so groß.
      if (def.units > remaining) break;
      const nextRests = restsLeft - (trackRests && def.isRest ? 1 : 0);
      if (trackRests && nextRests < 0) continue;
      ways += dfs(remaining - def.units, slotsLeft - 1, nextRests, i);
    }
    memo.set(key, ways);
    return ways;
  };

  return dfs(target, exactNotes, exactRests ?? 0, 0);
}

function hasAnySolutionWithCount(
  values: NoteValueId[],
  target: number,
  exactNotes: number,
  exactRests?: number,
): boolean {
  return countWays(values, target, exactNotes, exactRests) > 0;
}

function generateLeft(
  values: NoteValueId[],
  minN: number,
  maxN: number,
): NoteValueId[] {
  const byId = values;
  for (let guard = 0; guard < 500; guard++) {
    const n = minN + Math.floor(Math.random() * (maxN - minN + 1));
    const out: NoteValueId[] = [];
    for (let i = 0; i < n; i++) {
      const pick = r(byId);
      out.push(pick);
    }
    if (out.length > 0) return out;
  }
  return ["quarter", "quarter"];
}

/**
 * Triviale Kopier-Aufgabe: die linke Seite ist selbst eine gültige rechte
 * Lösung (gleiche Symbolanzahl, Pausen-Vorgabe erfüllt) — der optimale Zug
 * wäre bloßes Abschreiben. Solche Aufgaben werden verworfen.
 */
export function isTrivialCopy(
  left: NoteValueId[],
  rightCount: number,
  requiredRests?: number,
): boolean {
  if (left.length !== rightCount) return false;
  if (requiredRests == null) return true;
  const leftRests = left.filter((id) => NOTE_VALUES[id].isRest).length;
  return leftRests === requiredRests;
}

/** Stabile Kennung einer Aufgabe, um direkte Wiederholungen zu vermeiden. */
export function puzzleSignature(p: Puzzle): string {
  return `${[...p.left].sort().join(",")}|${p.rightCount}|${p.uniqueOnly ? 1 : 0}|${p.requiredRests ?? "-"}`;
}

export function createPuzzle(difficulty: DifficultyId): Puzzle {
  const values = DIFFICULTY_VALUES[difficulty];
  const leftMin = 1;
  const leftMax = difficulty === "beginner" ? 2 : 3;
  const rightMin = difficulty === "beginner" ? 2 : 3;
  const rightMax =
    difficulty === "beginner" ? 4 : difficulty === "intermediate" ? 5 : 6;
  const uniqueAttempt = difficulty === "advanced" && Math.random() < 0.2;

  for (let guard = 0; guard < 200; guard++) {
    const left = generateLeft(values, leftMin, leftMax);
    const targetUnits = left.reduce((s, id) => s + NOTE_VALUES[id].units, 0);
    const rightCount =
      rightMin + Math.floor(Math.random() * (rightMax - rightMin + 1));
    const challengeAttempt = difficulty === "advanced" && Math.random() < 0.4;
    const requiredRests = challengeAttempt
      ? 1 + Math.floor(Math.random() * Math.max(1, Math.min(3, rightCount - 1)))
      : undefined;

    if (isTrivialCopy(left, rightCount, requiredRests)) continue;

    if (
      !hasAnySolutionWithCount(values, targetUnits, rightCount, requiredRests)
    )
      continue;

    if (!uniqueAttempt) {
      return {
        targetUnits,
        left,
        rightCount,
        uniqueOnly: false,
        requiredRests,
      };
    }
    const ways = countWays(values, targetUnits, rightCount, requiredRests);
    if (ways <= 1) {
      return { targetUnits, left, rightCount, uniqueOnly: true, requiredRests };
    }
  }

  // Fallback: Halbe links, zwei Viertel rechts — lösbar in allen Stufen und
  // keine Kopier-Aufgabe (1 Symbol links, 2 rechts).
  const fallbackLeft = ["half"] as NoteValueId[];
  return {
    targetUnits: fallbackLeft.reduce((s, id) => s + NOTE_VALUES[id].units, 0),
    left: fallbackLeft,
    rightCount: 2,
    uniqueOnly: false,
  };
}

export function totalUnits(ids: NoteValueId[]): number {
  return ids.reduce((sum, id) => sum + NOTE_VALUES[id].units, 0);
}
