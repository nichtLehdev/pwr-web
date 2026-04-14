import {
  isChromaticDifficulty,
  type ClefKind,
  type DifficultyId,
  type InstrumentId,
  type WrittenPitch,
} from "./types";
import {
  ADVANCED_ANSWER_BANK,
  answerLabelForPitch,
  staffDistance,
  writtenPitchToMidi,
} from "./pitch";
import { pitchKey, pitchPool } from "./ranges";

const SHUFFLE = (arr: string[]) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]!;
    a[i] = a[j]!;
    a[j] = t;
  }
  return a;
};

export function pickRandomPitch(
  instrument: InstrumentId,
  difficulty: DifficultyId,
  avoidMidi: number | null,
): WrittenPitch {
  const pool = pitchPool(instrument, difficulty);
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

export function buildAnswerLabels(
  target: WrittenPitch,
  instrument: InstrumentId,
  difficulty: DifficultyId,
  clef: ClefKind,
  count = 7,
): string[] {
  const pool = pitchPool(instrument, difficulty);
  const correct = answerLabelForPitch(target);

  if (!isChromaticDifficulty(difficulty)) {
    const others = pool
      .filter((p) => pitchKey(p) !== pitchKey(target))
      .map((p) => ({ p, d: staffDistance(p, target, clef) }))
      .sort((a, b) => a.d - b.d)
      .map((x) => answerLabelForPitch(x.p));

    const uniq: string[] = [];
    for (const o of others) {
      if (!uniq.includes(o) && o !== correct) uniq.push(o);
      if (uniq.length >= count - 1) break;
    }
    const rest = ["C", "D", "E", "F", "G", "A", "H"].filter(
      (n) => n !== correct && !uniq.includes(n),
    );
    while (uniq.length < count - 1 && rest.length) {
      uniq.push(rest.shift()!);
    }
    return SHUFFLE([correct, ...uniq.slice(0, count - 1)]);
  }

  /* Advanced: correct + chromatic neighbors on staff */
  const others = pool
    .filter((p) => pitchKey(p) !== pitchKey(target))
    .map((p) => ({ p, d: staffDistance(p, target, clef) }))
    .sort((a, b) => a.d - b.d)
    .map((x) => answerLabelForPitch(x.p));

  const uniq: string[] = [];
  for (const o of others) {
    if (!uniq.includes(o) && o !== correct) uniq.push(o);
    if (uniq.length >= count - 1) break;
  }

  for (const b of ADVANCED_ANSWER_BANK) {
    if (uniq.length >= count - 1) break;
    if (b !== correct && !uniq.includes(b)) uniq.push(b);
  }
  return SHUFFLE([correct, ...uniq.slice(0, count - 1)]);
}
