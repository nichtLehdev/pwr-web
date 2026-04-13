import type {
  Difficulty,
  GeneratedRhythm,
  RhythmEvent,
  TimeSignature,
} from "./types";

const MAX_TRIES = 100;

function quarterMs(bpm: number): number {
  return 60000 / bpm;
}

function sixteenthMs(bpm: number): number {
  return quarterMs(bpm) / 4;
}

/** Sixteenth-note units in one bar. */
export function barLengthInUnits(ts: TimeSignature): number {
  return (ts.numerator * 16) / ts.denominator;
}

function randomPick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
}

type Chunk =
  | { kind: "simple"; units: number; vex: string }
  | {
      kind: "triplet8";
      pattern: [boolean, boolean, boolean];
    };

function unitsToVexDuration(units: number): string | null {
  switch (units) {
    case 16:
      return "w";
    case 8:
      return "h";
    case 6:
      return "qd";
    case 4:
      return "q";
    case 2:
      return "8";
    case 1:
      return "16";
    default:
      return null;
  }
}

function allowedUnits(difficulty: Difficulty, barUnits: number): number[] {
  let base: number[];
  if (difficulty === "beginner") {
    base = [16, 8, 4];
  } else if (difficulty === "intermediate") {
    base = [16, 8, 6, 4, 2];
  } else {
    base = [16, 8, 6, 4, 2, 1];
  }
  return base.filter((u) => u <= barUnits);
}

function randomTripletPattern(): [boolean, boolean, boolean] {
  return [
    Math.random() > 0.15,
    Math.random() > 0.25,
    Math.random() > 0.15,
  ];
}

function partitionBar(
  remaining: number,
  difficulty: Difficulty,
  barUnits: number,
): Chunk[] | null {
  if (remaining === 0) return [];
  const allowed = allowedUnits(difficulty, barUnits).filter(
    (u) => u <= remaining,
  );
  if (allowed.length === 0 && !(difficulty === "advanced" && remaining >= 4)) {
    return null;
  }

  // Triplet eighths: 3 notes in the space of 2 eighths (4 sixteenth units)
  if (difficulty === "advanced" && remaining >= 4 && Math.random() < 0.42) {
    const sub = partitionBar(remaining - 4, difficulty, barUnits);
    if (sub) {
      return [{ kind: "triplet8", pattern: randomTripletPattern() }, ...sub];
    }
  }

  if (allowed.length === 0) return null;

  const candidates = [...allowed];
  shuffleInPlace(candidates);

  for (const chunk of candidates) {
    const sub = partitionBar(remaining - chunk, difficulty, barUnits);
    if (sub) {
      const vex = unitsToVexDuration(chunk);
      if (!vex) continue;
      return [{ kind: "simple", units: chunk, vex }, ...sub];
    }
  }

  return null;
}

function generateBarChunks(difficulty: Difficulty, ts: TimeSignature): Chunk[] {
  const barUnits = barLengthInUnits(ts);
  for (let t = 0; t < MAX_TRIES; t++) {
    const result = partitionBar(barUnits, difficulty, barUnits);
    if (result) return result;
  }
  return [{ kind: "simple", units: barUnits, vex: "w" }];
}

function restProbability(units: number): number {
  if (units >= 8) return 0.08;
  if (units >= 4) return 0.12;
  if (units >= 2) return 0.18;
  return 0.22;
}

function chunksToEvents(
  chunks: Chunk[],
  bpm: number,
  startTupletGroupId: number,
): { events: RhythmEvent[]; nextTupletGroupId: number } {
  const sMs = sixteenthMs(bpm);
  const events: RhythmEvent[] = [];
  let tupletId = startTupletGroupId;

  for (const ch of chunks) {
    if (ch.kind === "simple") {
      const isRest = Math.random() < restProbability(ch.units);
      events.push({
        noteValue: ch.vex,
        durationMs: ch.units * sMs,
        isRest,
        key: isRest ? "r/4" : "c/4",
      });
    } else {
      const spanUnits = 4;
      const spanMs = spanUnits * sMs;
      const eachMs = spanMs / 3;
      const gid = tupletId++;
      for (let i = 0; i < 3; i++) {
        const isRest = !ch.pattern[i];
        events.push({
          noteValue: "8",
          durationMs: eachMs,
          isRest,
          key: isRest ? "r/4" : "c/4",
          tupletGroupId: gid,
          tupletNumNotes: 3,
          tupletNotesOccupied: 2,
        });
      }
    }
  }

  return { events, nextTupletGroupId: tupletId };
}

function pickTimeSignature(difficulty: Difficulty): TimeSignature {
  if (difficulty === "beginner") {
    return { numerator: 4, denominator: 4 };
  }
  if (difficulty === "intermediate") {
    return randomPick([
      { numerator: 4, denominator: 4 },
      { numerator: 3, denominator: 4 },
    ]);
  }
  return randomPick([
    { numerator: 4, denominator: 4 },
    { numerator: 3, denominator: 4 },
    { numerator: 6, denominator: 8 },
  ]);
}

export function generateRhythm(
  difficulty: Difficulty,
  bpm: number,
): GeneratedRhythm {
  const timeSignature = pickTimeSignature(difficulty);
  const bars = difficulty === "advanced" && Math.random() > 0.5 ? 2 : 1;

  let allEvents: RhythmEvent[] = [];
  let tupletCounter = 1;

  for (let b = 0; b < bars; b++) {
    const chunks = generateBarChunks(difficulty, timeSignature);
    const { events, nextTupletGroupId } = chunksToEvents(
      chunks,
      bpm,
      tupletCounter,
    );
    tupletCounter = nextTupletGroupId;
    allEvents = allEvents.concat(events);
  }

  return {
    events: allEvents,
    timeSignature,
    bars,
  };
}

/**
 * Einzählen: ein Takt in Viertel(n) — Länge abhängig von Taktart und Schwierigkeit
 * (kurz für Einsteiger, bis zu einem Takt für Fortgeschrittene).
 */
export function countInBeatsForRhythm(
  timeSignature: TimeSignature,
  difficulty: Difficulty,
): number {
  const n = timeSignature.numerator;
  if (difficulty === "beginner") {
    return Math.min(4, Math.max(1, n));
  }
  if (difficulty === "intermediate") {
    return Math.min(6, Math.max(1, n));
  }
  return Math.min(8, Math.max(1, n));
}

export function getExpectedOnsetTimesMs(events: RhythmEvent[]): number[] {
  let t = 0;
  const times: number[] = [];
  for (const e of events) {
    if (!e.isRest) times.push(t);
    t += e.durationMs;
  }
  return times;
}

export function totalRhythmDurationMs(events: RhythmEvent[]): number {
  return events.reduce((s, e) => s + e.durationMs, 0);
}
