import {
  DIFFICULTY_SIGS,
  DIFFICULTY_VALUES,
  NOTE_VALUES,
  TARGET_UNITS,
  type DifficultyId,
  type NoteValueId,
  type Puzzle,
} from "./types";

function r<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function countWays(values: NoteValueId[], target: number, maxNotes: number): number {
  const units = values.map((v) => NOTE_VALUES[v].units);
  let ways = 0;
  const dfs = (sum: number, depth: number) => {
    if (sum === target) {
      ways += 1;
      return;
    }
    if (sum > target || depth >= maxNotes || ways > 1) return;
    for (const u of units) dfs(sum + u, depth + 1);
  };
  dfs(0, 0);
  return ways;
}

function generateLeft(values: NoteValueId[], target: number, minN: number, maxN: number): NoteValueId[] {
  const byId = values;
  for (let guard = 0; guard < 500; guard++) {
    const n = minN + Math.floor(Math.random() * (maxN - minN + 1));
    const out: NoteValueId[] = [];
    let remaining = target;
    for (let i = 0; i < n; i++) {
      const possible = byId.filter((id) => NOTE_VALUES[id].units <= remaining);
      if (possible.length === 0) break;
      const pick = r(possible);
      out.push(pick);
      remaining -= NOTE_VALUES[pick].units;
    }
    if (remaining === 0 && out.length > 0) return out;
  }
  return ["quarter", "quarter", "quarter", "quarter"];
}

export function createPuzzle(difficulty: DifficultyId): Puzzle {
  const sig = r(DIFFICULTY_SIGS[difficulty]);
  const targetUnits = TARGET_UNITS[sig];
  const values = DIFFICULTY_VALUES[difficulty];
  const minN = 1;
  const maxN = difficulty === "beginner" ? 2 : 3;
  const uniqueAttempt = difficulty === "advanced" && Math.random() < 0.2;

  for (let guard = 0; guard < 200; guard++) {
    const left = generateLeft(values, targetUnits, minN, maxN);
    if (!uniqueAttempt) {
      return { timeSig: sig, targetUnits, left, uniqueOnly: false };
    }
    const ways = countWays(values, left.reduce((s, id) => s + NOTE_VALUES[id].units, 0), 8);
    if (ways <= 1) {
      return { timeSig: sig, targetUnits, left, uniqueOnly: true };
    }
  }

  return {
    timeSig: sig,
    targetUnits,
    left: generateLeft(values, targetUnits, minN, maxN),
    uniqueOnly: false,
  };
}

export function totalUnits(ids: NoteValueId[]): number {
  return ids.reduce((sum, id) => sum + NOTE_VALUES[id].units, 0);
}

export function unitsLabel(units: number): string {
  const beats = units / 12;
  return Number.isInteger(beats) ? `${beats}` : beats.toFixed(2).replace(/\.?0+$/, "");
}
