import type {
  Difficulty,
  GeneratedRhythm,
  RhythmEvent,
  TimeSignature,
} from "./types";
import {
  barLengthInUnits,
  pulseInfoForTimeSignature,
  rhythmIsWellFormedArithmetic,
  barsFillTimeSignature,
} from "./rhythm-arithmetic";
import type { RhythmLogOutcome } from "./rhythm-validation";

const MAX_TRIES = 100;
/** Neu generieren, bis Ticksumme + Millisekunden zur Taktart passen. */
const MAX_RHYTHM_GENERATION_ATTEMPTS = 80;
/** Takt neu würfeln, wenn zu wenige Onsets (nur Pausen bzw. Einzelnote bei „Leicht“). */
const MAX_BAR_ONSET_TRIES = 40;
/** Neu würfeln, wenn die Figur identisch zur vorherigen ist. */
const MAX_REPEAT_REROLLS = 8;

/** Zuletzt ausgegebene Figur — für die Wiederholungs-Vermeidung. */
let lastRhythmSignature: string | null = null;

function quarterMs(bpm: number): number {
  return 60000 / bpm;
}

function sixteenthMs(bpm: number): number {
  return quarterMs(bpm) / 4;
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
  return [Math.random() > 0.15, Math.random() > 0.25, Math.random() > 0.15];
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

/**
 * Wenn `partitionBar` ausreißt: deterministisch mit korrekter Summe in Sechzehntel-Einheiten.
 * Niemals `vex: "w"` für Takte ≠ 4/4 — ganznote ist in VexFlow 16 Einheiten und zerstört
 * Takt/Formatter bei z. B. 3/4 (12 Einheiten) → fehlende/clipped Noten und Pausen.
 */
function fallbackBarChunks(barUnits: number): Chunk[] {
  const out: Chunk[] = [];
  let remaining = barUnits;
  const sizes = [16, 8, 6, 4, 2, 1] as const;
  for (const size of sizes) {
    while (remaining >= size) {
      const vex = unitsToVexDuration(size);
      if (!vex) break;
      out.push({ kind: "simple", units: size, vex });
      remaining -= size;
    }
  }
  if (remaining !== 0) {
    throw new Error(
      `fallbackBarChunks: cannot fill bar (${barUnits}), left ${remaining}`,
    );
  }
  return out;
}

/** Sicherer Takt mit garantiert vielen Onsets: nur Noten (Viertel/Achtel/Sechzehntel). */
function guaranteedOnsetBarChunks(barUnits: number): Chunk[] {
  const out: Chunk[] = [];
  let remaining = barUnits;
  const sizes = [4, 2, 1] as const;
  for (const size of sizes) {
    while (remaining >= size) {
      const vex = unitsToVexDuration(size);
      if (!vex) break;
      out.push({ kind: "simple", units: size, vex });
      remaining -= size;
    }
  }
  return out;
}

function generateBarChunks(difficulty: Difficulty, ts: TimeSignature): Chunk[] {
  const barUnits = barLengthInUnits(ts);
  for (let t = 0; t < MAX_TRIES; t++) {
    const result = partitionBar(barUnits, difficulty, barUnits);
    if (result) return result;
  }
  return fallbackBarChunks(barUnits);
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

function countOnsets(events: RhythmEvent[]): number {
  return events.filter((e) => !e.isRest).length;
}

/** „Leicht“: eine einzelne Ganze wäre eine Ein-Tipp-Runde — mindestens 2 Onsets. */
function minOnsetsPerBar(difficulty: Difficulty): number {
  return difficulty === "beginner" ? 2 : 1;
}

/**
 * Ein Takt mit garantierter Mindestzahl an Onsets: erst neu würfeln,
 * zur Not Pausen in Noten umwandeln, letzter Ausweg ist der sichere Takt.
 */
function generateBarEvents(
  difficulty: Difficulty,
  ts: TimeSignature,
  bpm: number,
  startTupletGroupId: number,
): { events: RhythmEvent[]; nextTupletGroupId: number } {
  const minOnsets = minOnsetsPerBar(difficulty);

  for (let t = 0; t < MAX_BAR_ONSET_TRIES; t++) {
    const chunks = generateBarChunks(difficulty, ts);
    const built = chunksToEvents(chunks, bpm, startTupletGroupId);
    if (countOnsets(built.events) >= minOnsets) return built;

    // Pausen zu Noten drehen, wenn genug Events da sind (Figur bleibt gültig).
    const rests = built.events.filter((e) => e.isRest);
    if (built.events.length >= minOnsets && rests.length > 0) {
      for (const e of built.events) {
        if (countOnsets(built.events) >= minOnsets) break;
        if (e.isRest) {
          e.isRest = false;
          e.key = "c/4";
        }
      }
      if (countOnsets(built.events) >= minOnsets) return built;
    }
  }

  return chunksToEvents(
    guaranteedOnsetBarChunks(barLengthInUnits(ts)),
    bpm,
    startTupletGroupId,
  );
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

/** Letzter Ausweg: 4/4, vier Viertel — immer gültig in VexFlow und bei der Klingdauer. */
function emergencyRhythm(bpm: number): GeneratedRhythm {
  const quarterMs = 60000 / bpm;
  return {
    timeSignature: { numerator: 4, denominator: 4 },
    bars: 1,
    barStartEventIndices: [],
    events: Array.from({ length: 4 }, () => ({
      noteValue: "q",
      durationMs: quarterMs,
      isRest: false,
      key: "c/4",
    })),
  };
}

/** Figur-Fingerabdruck für die Wiederholungs-Vermeidung (Dauern + Pausen). */
function rhythmSignature(rhythm: GeneratedRhythm): string {
  const eventSig = rhythm.events
    .map(
      (e) =>
        `${e.noteValue}${e.isRest ? "r" : ""}${
          e.tupletGroupId !== undefined ? "t" : ""
        }`,
    )
    .join(",");
  return `${rhythm.timeSignature.numerator}/${rhythm.timeSignature.denominator}|${rhythm.bars}|${eventSig}`;
}

function tryGenerateRhythmOnce(
  difficulty: Difficulty,
  bpm: number,
): GeneratedRhythm {
  const timeSignature = pickTimeSignature(difficulty);
  const bars = difficulty === "advanced" && Math.random() > 0.5 ? 2 : 1;

  let allEvents: RhythmEvent[] = [];
  let tupletCounter = 1;
  const barStartEventIndices: number[] = [];

  for (let b = 0; b < bars; b++) {
    if (b > 0) {
      barStartEventIndices.push(allEvents.length);
    }
    const { events, nextTupletGroupId } = generateBarEvents(
      difficulty,
      timeSignature,
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
    barStartEventIndices,
  };
}

/**
 * Debug-Log nur im Dev-Server: lazy geladen, damit `rhythm-validation`
 * (und damit VexFlow) nicht ins eager Route-Bundle wandert.
 */
function logRhythmForDebugDev(
  rhythm: GeneratedRhythm,
  bpm: number,
  meta: {
    outcome: RhythmLogOutcome;
    attempt?: number;
    difficulty?: string;
    rejectReason?: "ticks" | "duration" | "build";
  },
): void {
  if (process.env.NODE_ENV !== "development") return;
  void import("./rhythm-validation")
    .then((m) => m.logRhythmDesiredForDebug(rhythm, bpm, meta))
    .catch(() => undefined);
}

export function generateRhythm(
  difficulty: Difficulty,
  bpm: number,
): GeneratedRhythm {
  let repeatRerolls = 0;
  for (let a = 0; a < MAX_RHYTHM_GENERATION_ATTEMPTS; a++) {
    const rhythm = tryGenerateRhythmOnce(difficulty, bpm);
    if (!rhythmIsWellFormedArithmetic(rhythm, bpm)) {
      logRhythmForDebugDev(rhythm, bpm, {
        outcome: "rejected",
        attempt: a + 1,
        difficulty,
        rejectReason: barsFillTimeSignature(rhythm) ? "duration" : "ticks",
      });
      continue;
    }
    // Gleiche Figur wie zuletzt? Begrenzt neu würfeln für mehr Abwechslung.
    const signature = rhythmSignature(rhythm);
    if (
      signature === lastRhythmSignature &&
      repeatRerolls < MAX_REPEAT_REROLLS
    ) {
      repeatRerolls++;
      continue;
    }
    lastRhythmSignature = signature;
    logRhythmForDebugDev(rhythm, bpm, {
      outcome: "accepted",
      attempt: a + 1,
      difficulty,
    });
    return rhythm;
  }
  const fallback = emergencyRhythm(bpm);
  lastRhythmSignature = rhythmSignature(fallback);
  logRhythmForDebugDev(fallback, bpm, {
    outcome: "emergency",
    difficulty,
  });
  return fallback;
}

/**
 * Einzählen: ein Takt im Metronom-Puls — Länge abhängig von Taktart und
 * Schwierigkeit (kurz für Einsteiger, bis zu einem Takt für Fortgeschrittene).
 * Bei x/8-Taktarten ist der Puls die punktierte Viertel (6/8 → „1, 2“).
 */
export function countInBeatsForRhythm(
  timeSignature: TimeSignature,
  difficulty: Difficulty,
): number {
  const { beatsPerBar } = pulseInfoForTimeSignature(timeSignature);
  if (difficulty === "beginner") {
    return Math.min(4, Math.max(1, beatsPerBar));
  }
  if (difficulty === "intermediate") {
    return Math.min(6, Math.max(1, beatsPerBar));
  }
  return Math.min(8, Math.max(1, beatsPerBar));
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
