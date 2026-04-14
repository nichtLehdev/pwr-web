import { writtenPitchToMidi } from "../../noten-lesen/_lib/pitch";
import { midiToWrittenPitch } from "../../noten-lesen/_lib/ranges";
import type { WrittenPitch } from "../../noten-lesen/_lib/types";
import { getRawFingeringEntry } from "./fingering-lookup";
import { griffePitchPool } from "./pitch-range";
import type { GriffeDifficultyId, GriffeInstrumentId } from "./types";

/** Pool-Töne sind B‑Stimm‑schreibend; bei Tr. C wird Konzert auf dem System gezeigt. */
function displayPitchForInstrument(
  instrument: GriffeInstrumentId,
  poolPitchBbWritten: WrittenPitch,
): WrittenPitch {
  if (instrument !== "trumpet_c") return poolPitchBbWritten;
  const m = writtenPitchToMidi(poolPitchBbWritten);
  return midiToWrittenPitch(m - 2);
}

export function pickRandomGriffePitch(
  instrument: GriffeInstrumentId,
  difficulty: GriffeDifficultyId,
  avoidMidi: number | null,
): WrittenPitch {
  const rawPool = griffePitchPool(instrument, difficulty);
  const pool = rawPool
    .map((p) => displayPitchForInstrument(instrument, p))
    .filter((p) => getRawFingeringEntry(instrument, p) != null);
  if (pool.length === 0) {
    return { letter: "C", octave: 4, alter: 0 };
  }
  const candidates =
    avoidMidi != null
      ? pool.filter((p) => writtenPitchToMidi(p) !== avoidMidi)
      : pool;
  const pickFrom = candidates.length ? candidates : pool;
  return pickFrom[Math.floor(Math.random() * pickFrom.length)]!;
}
