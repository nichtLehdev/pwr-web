import { NOTE_VALUES, type NoteValueId, type Puzzle } from "./types";

export type PuzzleConfig = {
  values: readonly NoteValueId[];
  left: readonly [number, number];
  right: readonly [number, number];
  /** Muss vorkommen: die Note, um die es in der Stufe geht. */
  focus?: NoteValueId;
  restChance?: number;
  uniqueChance?: number;
};

/**
 * Zählt Lösungs-Multisets, keine Reihenfolgen: {Viertel, Halbe} ist genau eine Lösung.
 * Rekursion über nicht-fallende Wertindizes, memoisiert und über die erreichbare Summe beschnitten.
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

/** Die linke Seite ist selbst eine gültige rechte Lösung — solche Aufgaben werden verworfen. */
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

function between([min, max]: readonly [number, number], rng: () => number) {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Die Stufennote liegt links oder keine Lösung kommt ohne sie aus. */
function usesFocus(
  focus: NoteValueId,
  values: NoteValueId[],
  left: NoteValueId[],
  target: number,
  rightCount: number,
  requiredRests?: number,
): boolean {
  if (left.includes(focus)) return true;
  const without = values.filter((value) => value !== focus);
  return countWays(without, target, rightCount, requiredRests) === 0;
}

export function createPuzzle(
  config: PuzzleConfig,
  rng: () => number = Math.random,
): Puzzle {
  const values = [...config.values];
  const hasRests = values.some((id) => NOTE_VALUES[id].isRest);

  for (let guard = 0; guard < 400; guard++) {
    const left = Array.from(
      { length: between(config.left, rng) },
      () => values[Math.floor(rng() * values.length)]!,
    );
    const targetUnits = totalUnits(left);
    const rightCount = between(config.right, rng);
    const requiredRests =
      hasRests && rng() < (config.restChance ?? 0)
        ? 1 + Math.floor(rng() * Math.max(1, Math.min(3, rightCount - 1)))
        : undefined;
    if (isTrivialCopy(left, rightCount, requiredRests)) continue;
    const ways = countWays(values, targetUnits, rightCount, requiredRests);
    if (ways === 0) continue;
    // Spät im Suchlauf zählt Lösbarkeit mehr als der Schwerpunkt.
    if (
      config.focus &&
      guard < 300 &&
      !usesFocus(
        config.focus,
        values,
        left,
        targetUnits,
        rightCount,
        requiredRests,
      )
    ) {
      continue;
    }
    const unique = rng() < (config.uniqueChance ?? 0);
    if (unique && ways > 1) continue;
    return {
      targetUnits,
      left,
      rightCount,
      uniqueOnly: unique,
      requiredRests,
    };
  }

  // Die schwerste Note und die erste Anzahl, die sie aufteilen kann.
  const heaviest = [...values].sort(
    (a, b) => NOTE_VALUES[b].units - NOTE_VALUES[a].units,
  )[0]!;
  const targetUnits = NOTE_VALUES[heaviest].units;
  for (let rightCount = 2; rightCount <= 8; rightCount++) {
    if (countWays(values, targetUnits, rightCount) > 0) {
      return { targetUnits, left: [heaviest], rightCount, uniqueOnly: false };
    }
  }
  throw new Error(`Keine Aufgabe möglich mit ${values.join(", ")}`);
}

export function totalUnits(ids: NoteValueId[]): number {
  return ids.reduce((sum, id) => sum + NOTE_VALUES[id].units, 0);
}
