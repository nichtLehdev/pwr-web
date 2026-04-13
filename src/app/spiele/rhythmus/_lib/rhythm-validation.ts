import { Tuplet, Voice, VoiceMode } from "vexflow";
import type { StaveNote } from "vexflow";
import type { StemmableNote } from "vexflow";
import type { GeneratedRhythm, RhythmEvent, TimeSignature } from "./types";
import { staveNoteFromRhythmEvent } from "./vex-stave-note";

/** Sechzehntel-Einheiten pro Takt (wie `barLengthInUnits`). */
function barUnitsPerBar(ts: TimeSignature): number {
  return (ts.numerator * 16) / ts.denominator;
}

/** Erwartete Klingdauer laut Event-`durationMs` (muss zur Taktart passen). */
export function expectedRhythmDurationMs(
  timeSignature: TimeSignature,
  bars: number,
  bpm: number,
): number {
  const quarterMs = 60000 / bpm;
  const sixteenthMs = quarterMs / 4;
  return barUnitsPerBar(timeSignature) * bars * sixteenthMs;
}

export function totalDurationMs(events: RhythmEvent[]): number {
  return events.reduce((s, e) => s + e.durationMs, 0);
}

function buildVoiceForRhythm(rhythm: GeneratedRhythm): Voice | null {
  const { events, timeSignature, bars } = rhythm;
  if (events.length === 0) return null;

  try {
    const stemmables: StemmableNote[] = [];
    let i = 0;
    while (i < events.length) {
      const ev = events[i]!;
      if (ev.tupletGroupId !== undefined) {
        const group: StaveNote[] = [];
        const gid = ev.tupletGroupId;
        while (i < events.length && events[i]?.tupletGroupId === gid) {
          const sn = staveNoteFromRhythmEvent(events[i]!);
          group.push(sn);
          stemmables.push(sn);
          i++;
        }
        new Tuplet(group, {
          notesOccupied: ev.tupletNotesOccupied ?? 2,
          numNotes: ev.tupletNumNotes ?? 3,
        });
      } else {
        stemmables.push(staveNoteFromRhythmEvent(ev));
        i++;
      }
    }

    return new Voice({
      numBeats: timeSignature.numerator * bars,
      beatValue: timeSignature.denominator,
    })
      .setMode(VoiceMode.SOFT)
      .addTickables(stemmables);
  } catch {
    return null;
  }
}

/** VexFlow-Tick-Summe vs. Voice-Ziel (gleiche Logik wie die Notenzeile). */
export function getNotationTickInfo(
  rhythm: GeneratedRhythm,
): { ok: boolean; ticksUsed: number; totalTicks: number } | null {
  const voice = buildVoiceForRhythm(rhythm);
  if (!voice) return null;
  const ticksUsed = voice.getTicksUsed().value();
  const totalTicks = voice.getTotalTicks().value();
  return {
    ok: voice.getTicksUsed().equals(voice.getTotalTicks()),
    ticksUsed,
    totalTicks,
  };
}

/**
 * Baut dieselbe StaveNote-/Tuplet-Struktur wie die Anzeige und prüft, ob die
 * VexFlow-Ticks exakt der Voice (Taktart × Taktzahl) entsprechen.
 */
export function notationFillsBars(rhythm: GeneratedRhythm): boolean {
  const info = getNotationTickInfo(rhythm);
  return info?.ok ?? false;
}

/** Triolen: 3×(spanMs/3) weicht minimal von spanMs ab. */
const MS_EPS = 8;

export function durationMatchesClock(
  rhythm: GeneratedRhythm,
  bpm: number,
): boolean {
  const expected = expectedRhythmDurationMs(
    rhythm.timeSignature,
    rhythm.bars,
    bpm,
  );
  const actual = totalDurationMs(rhythm.events);
  return Math.abs(actual - expected) < MS_EPS;
}

export function rhythmIsWellFormed(
  rhythm: GeneratedRhythm,
  bpm: number,
): boolean {
  if (!notationFillsBars(rhythm)) return false;
  return durationMatchesClock(rhythm, bpm);
}

export type RhythmLogOutcome = "accepted" | "rejected" | "emergency";

/**
 * Konsolen-Referenz: Soll-Figure, Ticks, ms — nur in Development.
 * Bei Abweichung zur Anzeige hier mit dem Screen vergleichen.
 */
export function logRhythmDesiredForDebug(
  rhythm: GeneratedRhythm,
  bpm: number,
  meta: {
    outcome: RhythmLogOutcome;
    attempt?: number;
    difficulty?: string;
    /** Nur bei outcome === "rejected" */
    rejectReason?: "ticks" | "duration" | "build";
  },
): void {
  if (process.env.NODE_ENV === "production") return;

  const tick = getNotationTickInfo(rhythm);
  const expectedMs = expectedRhythmDurationMs(
    rhythm.timeSignature,
    rhythm.bars,
    bpm,
  );
  const actualMs = totalDurationMs(rhythm.events);
  const sixteenthUnits =
    barUnitsPerBar(rhythm.timeSignature) * rhythm.bars;

  const events = rhythm.events.map((e, index) => ({
    index,
    vex: e.noteValue,
    type: e.isRest ? "rest" : "note",
    ms: Math.round(e.durationMs * 100) / 100,
    tuplet: e.tupletGroupId,
  }));

  const payload = {
    outcome: meta.outcome,
    attempt: meta.attempt,
    difficulty: meta.difficulty,
    rejectReason: meta.rejectReason,
    timeSignature: rhythm.timeSignature,
    bars: rhythm.bars,
    bpm,
    sixteenthUnitsTotal: sixteenthUnits,
    barStartsAtEventIndex: rhythm.barStartEventIndices,
    notationTicks: tick
      ? {
          used: tick.ticksUsed,
          target: tick.totalTicks,
          ok: tick.ok,
        }
      : { error: "could_not_build_voice" },
    durationMs: { expected: expectedMs, actual: actualMs, delta: actualMs - expectedMs },
    events,
  };

  if (meta.outcome === "rejected") {
    console.warn(
      `[Rhythmus] Generierung verworfen (Versuch ${meta.attempt ?? "?"})`,
      payload,
    );
  } else if (meta.outcome === "emergency") {
    console.warn("[Rhythmus] Notfall-Rhythmus (nach max. Versuchen)", payload);
  } else {
    console.info("[Rhythmus] Soll-Notation (akzeptiert)", payload);
  }
}
