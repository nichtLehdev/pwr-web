import {
  isChromaticDifficulty,
  type ClefKind,
  type DifficultyId,
  type InstrumentId,
  type WrittenPitch,
} from "./types";
import {
  answerLabelForPitch,
  NATURAL_ANSWER_BANK,
  writtenPitchToMidi,
} from "./pitch";
import { expertPoolForClef, pitchKey, pitchPool } from "./ranges";

/**
 * Session-Fehlerzähler: pitchKey → noch nötige richtige Antworten.
 * Verfehlte Töne werden im Picker ~3× gewichtet, bis sie zweimal
 * richtig beantwortet wurden.
 */
export type MissTracker = Map<string, number>;

const MISS_WEIGHT = 3;
const CORRECT_ANSWERS_TO_CLEAR = 2;

export function recordMiss(tracker: MissTracker, key: string): void {
  tracker.set(key, CORRECT_ANSWERS_TO_CLEAR);
}

export function recordCorrect(tracker: MissTracker, key: string): void {
  const left = tracker.get(key);
  if (left == null) return;
  if (left <= 1) tracker.delete(key);
  else tracker.set(key, left - 1);
}

export type PoolPickOptions = {
  /** Fehlerzähler der Session (siehe `MissTracker`). */
  missCounts?: ReadonlyMap<string, number>;
  /** Nur für Tests: deterministische Zufallsquelle. */
  rng?: () => number;
};

export type PickPitchOptions = PoolPickOptions & {
  /** Experte/Hardcore: zuerst gezogener Schlüssel → geklemmter Pool. */
  clef?: ClefKind;
};

function weightedPick<T>(
  items: T[],
  weightOf: (item: T) => number,
  rng: () => number,
): T {
  let total = 0;
  for (const it of items) total += weightOf(it);
  let r = rng() * total;
  for (const it of items) {
    r -= weightOf(it);
    if (r < 0) return it;
  }
  return items[items.length - 1]!;
}

/**
 * Gewichtete Ziehung aus einem beliebigen Pool (z. B. ein eigenes Notenset):
 * Wiederholungs-Schutz über `avoidMidi`, Fehlergewichtung über `missCounts`.
 */
export function pickPitchFromPool(
  pool: readonly WrittenPitch[],
  avoidMidi: number | null,
  opts?: PoolPickOptions,
): WrittenPitch {
  const rng = opts?.rng ?? Math.random;
  if (pool.length === 0) {
    return { letter: "C", octave: 4, alter: 0 };
  }
  const candidates =
    avoidMidi != null
      ? pool.filter((p) => writtenPitchToMidi(p) !== avoidMidi)
      : pool;
  const pickFrom = candidates.length ? candidates : pool;

  /* Erst MIDI-Wert ziehen, dann Schreibweise — sonst sind Töne mit zwei
   * Schreibweisen (Cis/Des, …) gegenüber Naturtönen überrepräsentiert. */
  const byMidi = new Map<number, WrittenPitch[]>();
  for (const p of pickFrom) {
    const m = writtenPitchToMidi(p);
    const group = byMidi.get(m);
    if (group) group.push(p);
    else byMidi.set(m, [p]);
  }

  const isMissed = (p: WrittenPitch) =>
    (opts?.missCounts?.get(pitchKey(p)) ?? 0) > 0;

  const groups = [...byMidi.values()];
  const group = weightedPick(
    groups,
    (g) => (g.some(isMissed) ? MISS_WEIGHT : 1),
    rng,
  );
  return weightedPick(group, (p) => (isMissed(p) ? MISS_WEIGHT : 1), rng);
}

export function pickRandomPitch(
  instrument: InstrumentId,
  difficulty: DifficultyId,
  avoidMidi: number | null,
  opts?: PickPitchOptions,
): WrittenPitch {
  const clef = opts?.clef;
  const pool =
    clef != null && (difficulty === "expert" || difficulty === "hardcore")
      ? expertPoolForClef(clef)
      : pitchPool(instrument, difficulty);
  return pickPitchFromPool(pool, avoidMidi, opts);
}

/**
 * Chromatische Antwort-Labels in fester Tonklassen-Reihenfolge (C … H);
 * schwarze Tasten standardmäßig als deutsche -es-Namen (Des, Es, Ges, As, B).
 */
const CHROMATIC_LABELS_BY_PC = [
  "C",
  "Des",
  "D",
  "Es",
  "E",
  "F",
  "Ges",
  "G",
  "As",
  "A",
  "B",
  "H",
] as const;

/** Antwort-Raster: 7 Naturtöne (diatonisch) oder 12 Tonklassen (chromatisch). */
export type AnswerLayout = "diatonic" | "chromatic";

/** Eigenes Set: chromatisches Raster, sobald irgendein Ton ein Vorzeichen trägt. */
export function answerLayoutForPitches(
  pitches: readonly WrittenPitch[],
): AnswerLayout {
  return pitches.some((p) => p.alter !== 0) ? "chromatic" : "diatonic";
}

/**
 * Feste, deterministische Antwort-Layouts — kein Mischen: stabile Positionen
 * erhalten Muskelgedächtnis und die 1–7/1–12-Tastenbelegung.
 * Diatonisch: immer C D E F G A H. Chromatisch: 12 Tonklassen in fester
 * Reihenfolge; die Tonklasse des Zieltons trägt dessen Schreibweise (Dis
 * statt Es usw.), damit die richtige Antwort immer enthalten ist.
 */
export function buildAnswerLabelsForLayout(
  target: WrittenPitch,
  layout: AnswerLayout,
): string[] {
  if (layout === "diatonic") {
    return [...NATURAL_ANSWER_BANK];
  }
  const labels: string[] = [...CHROMATIC_LABELS_BY_PC];
  const pc = ((writtenPitchToMidi(target) % 12) + 12) % 12;
  labels[pc] = answerLabelForPitch(target);
  return labels;
}

export function buildAnswerLabels(
  target: WrittenPitch,
  difficulty: DifficultyId,
): string[] {
  return buildAnswerLabelsForLayout(
    target,
    isChromaticDifficulty(difficulty) ? "chromatic" : "diatonic",
  );
}
