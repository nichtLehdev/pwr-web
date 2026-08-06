import { writtenPitchToMidi } from "../../noten-lesen/_lib/pitch";
import { midiToWrittenPitch } from "../../noten-lesen/_lib/ranges";
import type { WrittenPitch } from "../../noten-lesen/_lib/types";
import { getRawFingeringEntry } from "./fingering-lookup";
import {
  griffeAdvancedDisplayMidiRange,
  griffePitchPool,
  spellingsForMidi,
} from "./pitch-range";
import type { GriffeDifficultyId, GriffeInstrumentId } from "./types";

/** Gewicht für kürzlich verfehlte Töne (Session-Adaptivität). */
const MISS_BOOST_WEIGHT = 3;

/** Pool-Töne sind B‑Stimm‑schreibend; bei der C‑Stimme wird Konzert gezeigt. */
function displayPitchForInstrument(
  instrument: GriffeInstrumentId,
  poolPitchBbWritten: WrittenPitch,
): WrittenPitch {
  if (instrument !== "trumpet_c") return poolPitchBbWritten;
  const m = writtenPitchToMidi(poolPitchBbWritten);
  return midiToWrittenPitch(m - 2);
}

function pickWeighted<T>(items: T[], weightOf: (item: T) => number): T | null {
  let total = 0;
  for (const it of items) total += weightOf(it);
  if (total <= 0) return null;
  let roll = Math.random() * total;
  for (const it of items) {
    roll -= weightOf(it);
    if (roll < 0) return it;
  }
  return items[items.length - 1] ?? null;
}

/**
 * Aus einem festen Anzeige-Pool ziehen (z. B. „Eigenes Set"): derselbe Pfad
 * wie bei den Standard-Pools — Wiederholungs-Schutz über `avoidMidi` und
 * Miss-Boost über `boostMidis` bleiben erhalten.
 */
export function pickFromDisplayPool(
  pool: WrittenPitch[],
  avoidMidi: number | null,
  boostMidis?: ReadonlySet<number>,
): WrittenPitch {
  if (pool.length === 0) {
    return { letter: "C", octave: 4, alter: 0 };
  }
  const weightOf = (m: number) => (boostMidis?.has(m) ? MISS_BOOST_WEIGHT : 1);
  const candidates =
    avoidMidi != null
      ? pool.filter((p) => writtenPitchToMidi(p) !== avoidMidi)
      : pool;
  const pickFrom = candidates.length ? candidates : pool;
  return (
    pickWeighted(pickFrom, (p) => weightOf(writtenPitchToMidi(p))) ??
    pickFrom[0]!
  );
}

/**
 * @param boostMidis Anzeige-MIDIs, die ~3× so oft drankommen sollen
 * (kürzlich verfehlt, noch nicht zweimal richtig beantwortet).
 */
export function pickRandomGriffePitch(
  instrument: GriffeInstrumentId,
  difficulty: GriffeDifficultyId,
  avoidMidi: number | null,
  boostMidis?: ReadonlySet<number>,
): WrittenPitch {
  const weightOf = (m: number) => (boostMidis?.has(m) ? MISS_BOOST_WEIGHT : 1);

  if (difficulty === "advanced") {
    // Chromatik: erst MIDI gleichverteilt würfeln, dann die Schreibweise —
    // sonst wären schwarze Tasten (zwei Schreibweisen) doppelt gewichtet.
    const { lo, hi } = griffeAdvancedDisplayMidiRange(instrument);
    const midis: number[] = [];
    for (let m = lo; m <= hi; m++) {
      if (getRawFingeringEntry(instrument, midiToWrittenPitch(m)) != null) {
        midis.push(m);
      }
    }
    if (midis.length === 0) return { letter: "C", octave: 4, alter: 0 };
    const candidates =
      avoidMidi != null ? midis.filter((m) => m !== avoidMidi) : midis;
    const from = candidates.length ? candidates : midis;
    const midi = pickWeighted(from, weightOf) ?? from[0]!;
    const spellings = spellingsForMidi(midi);
    return spellings[Math.floor(Math.random() * spellings.length)]!;
  }

  const rawPool = griffePitchPool(instrument, difficulty);
  const pool = rawPool
    .map((p) => displayPitchForInstrument(instrument, p))
    .filter((p) => getRawFingeringEntry(instrument, p) != null);
  return pickFromDisplayPool(pool, avoidMidi, boostMidis);
}
