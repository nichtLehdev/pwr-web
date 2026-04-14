import {
  DIFFICULTY_VALUES,
  NOTE_VALUES,
  QUARTER_UNITS,
  type DifficultyId,
  type NoteValueId,
  type Puzzle,
} from "./types";

function r<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function countWays(
  values: NoteValueId[],
  target: number,
  exactNotes: number,
  exactRests?: number,
): number {
  const defs = values.map((v) => NOTE_VALUES[v]);
  let ways = 0;
  const dfs = (sum: number, depth: number, rests: number) => {
    if (sum === target && depth === exactNotes && (exactRests == null || rests === exactRests)) {
      ways += 1;
      return;
    }
    if (sum > target || depth >= exactNotes || ways > 1) return;
    if (exactRests != null && rests > exactRests) return;
    for (const def of defs) dfs(sum + def.units, depth + 1, rests + (def.isRest ? 1 : 0));
  };
  dfs(0, 0, 0);
  return ways;
}

function hasAnySolutionWithCount(
  values: NoteValueId[],
  target: number,
  exactNotes: number,
  exactRests?: number,
): boolean {
  return countWays(values, target, exactNotes, exactRests) > 0;
}

function generateLeft(values: NoteValueId[], minN: number, maxN: number): NoteValueId[] {
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

export function createPuzzle(difficulty: DifficultyId): Puzzle {
  const values = DIFFICULTY_VALUES[difficulty];
  const leftMin = 1;
  const leftMax = difficulty === "beginner" ? 2 : 3;
  const rightMin = difficulty === "beginner" ? 2 : 3;
  const rightMax = difficulty === "beginner" ? 4 : difficulty === "intermediate" ? 5 : 6;
  const uniqueAttempt = difficulty === "advanced" && Math.random() < 0.2;

  for (let guard = 0; guard < 200; guard++) {
    const left = generateLeft(values, leftMin, leftMax);
    const targetUnits = left.reduce((s, id) => s + NOTE_VALUES[id].units, 0);
    const rightCount = rightMin + Math.floor(Math.random() * (rightMax - rightMin + 1));
    const challengeAttempt = difficulty === "advanced" && Math.random() < 0.4;
    const requiredRests = challengeAttempt
      ? 1 + Math.floor(Math.random() * Math.max(1, Math.min(3, rightCount - 1)))
      : undefined;

    if (!hasAnySolutionWithCount(values, targetUnits, rightCount, requiredRests)) continue;

    if (!uniqueAttempt) {
      return { targetUnits, left, rightCount, uniqueOnly: false, requiredRests };
    }
    const ways = countWays(values, targetUnits, rightCount, requiredRests);
    if (ways <= 1) {
      return { targetUnits, left, rightCount, uniqueOnly: true, requiredRests };
    }
  }

  const fallbackLeft = ["quarter", "quarter"] as NoteValueId[];
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

export function unitsLabel(units: number): string {
  const beats = units / QUARTER_UNITS;
  return Number.isInteger(beats) ? `${beats}` : beats.toFixed(2).replace(/\.?0+$/, "");
}
