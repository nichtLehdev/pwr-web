import type { Cell, Level } from "./levels";
import {
  barKey,
  barTicks,
  figureKey,
  onsetsOf,
  pulseOf,
  TICKS_PER_QUARTER,
} from "./ticks";
import type { Figure, NoteValue, RhythmEvent, TimeSignature } from "./types";

export type Rng = () => number;

const VALUE_TICKS: Record<NoteValue, number> = {
  w: TICKS_PER_QUARTER * 4,
  hd: TICKS_PER_QUARTER * 3,
  h: TICKS_PER_QUARTER * 2,
  qd: (TICKS_PER_QUARTER * 3) / 2,
  q: TICKS_PER_QUARTER,
  "8d": (TICKS_PER_QUARTER * 3) / 4,
  "8": TICKS_PER_QUARTER / 2,
  "16": TICKS_PER_QUARTER / 4,
};
const TRIPLET_EIGHTH_TICKS = TICKS_PER_QUARTER / 3;

const MAX_BAR_ATTEMPTS = 200;
const MAX_FIGURE_ATTEMPTS = 60;

/** `tupletId` nur zur Gruppierung im Takt: alle `t` eines Bausteins bilden eine Triole. */
export function parseCell(pattern: string, tupletId = 1): RhythmEvent[] {
  return pattern.split(" ").map((raw) => {
    const isRest = raw.length > 1 && raw.startsWith("r");
    const token = isRest ? raw.slice(1) : raw;
    if (token === "t") {
      return { value: "8", ticks: TRIPLET_EIGHTH_TICKS, isRest, tupletId };
    }
    const value = token as NoteValue;
    const ticks = VALUE_TICKS[value];
    if (ticks === undefined) throw new Error(`Unbekannter Notenwert: ${raw}`);
    return { value, ticks, isRest };
  });
}

function cellTicks(cell: Cell): number {
  return parseCell(cell.pattern).reduce((sum, e) => sum + e.ticks, 0);
}

function isRestOnly(cell: Cell): boolean {
  return parseCell(cell.pattern).every((e) => e.isRest);
}

/** Schwere Zählzeiten: 1 und 3 im 4/4, in allen anderen Takten jeder Schlag. */
function fitsPlacement(
  cell: Cell,
  pulseIndex: number,
  ts: TimeSignature,
): boolean {
  if (!cell.strong) return true;
  return ts.numerator !== 4 || ts.denominator !== 4 || pulseIndex % 2 === 0;
}

function pickWeighted(cells: readonly Cell[], rng: Rng): Cell {
  const total = cells.reduce((sum, c) => sum + (c.weight ?? 1), 0);
  let roll = rng() * total;
  for (const cell of cells) {
    roll -= cell.weight ?? 1;
    if (roll < 0) return cell;
  }
  return cells[cells.length - 1]!;
}

function tryBar(level: Level, ts: TimeSignature, rng: Rng): Cell[] | null {
  const { pulseTicks } = pulseOf(ts);
  const total = barTicks(ts);
  const cells: Cell[] = [];
  let position = 0;
  let previousWasRest = false;

  while (position < total) {
    const pulseIndex = position / pulseTicks;
    const candidates = level.cells.filter(
      (cell) =>
        cellTicks(cell) <= total - position &&
        fitsPlacement(cell, pulseIndex, ts) &&
        !(previousWasRest && isRestOnly(cell)),
    );
    if (candidates.length === 0) return null;
    const cell = pickWeighted(candidates, rng);
    cells.push(cell);
    previousWasRest = isRestOnly(cell);
    position += cellTicks(cell);
  }
  return cells;
}

function barMeetsLevel(cells: Cell[], level: Level): boolean {
  const hasFocus =
    !level.cells.some((c) => c.focus) || cells.some((c) => c.focus);
  if (!hasFocus) return false;
  const onsets = cells
    .flatMap((c) => parseCell(c.pattern))
    .filter((e) => !e.isRest).length;
  return onsets >= level.minOnsets;
}

function cellsToEvents(cells: Cell[]): RhythmEvent[] {
  return cells.flatMap((cell, index) => parseCell(cell.pattern, index + 1));
}

/** Rückfall, falls das Würfeln ausreißt: garantiert gültig, aber ohne Stufenthema. */
function plainBar(ts: TimeSignature): RhythmEvent[] {
  const { pulseTicks, pulsesPerBar } = pulseOf(ts);
  const value: NoteValue = pulseTicks === VALUE_TICKS.qd ? "qd" : "q";
  return Array.from({ length: pulsesPerBar }, () => ({
    value,
    ticks: pulseTicks,
    isRest: false,
  }));
}

export function generateBar(
  level: Level,
  ts: TimeSignature,
  rng: Rng = Math.random,
): RhythmEvent[] {
  for (let attempt = 0; attempt < MAX_BAR_ATTEMPTS; attempt++) {
    const cells = tryBar(level, ts, rng);
    if (cells && barMeetsLevel(cells, level)) return cellsToEvents(cells);
  }
  return plainBar(ts);
}

export function pickMeter(level: Level, rng: Rng = Math.random): TimeSignature {
  return level.meters[Math.floor(rng() * level.meters.length)]!;
}

/** `avoid`: zuletzt gespielte Figuren. Kleine Stufen dürfen sich notfalls wiederholen. */
export function generateFigure(
  level: Level,
  ts: TimeSignature,
  options: { rng?: Rng; avoid?: ReadonlySet<string> } = {},
): Figure {
  const rng = options.rng ?? Math.random;
  let figure: Figure | null = null;
  for (let attempt = 0; attempt < MAX_FIGURE_ATTEMPTS; attempt++) {
    figure = {
      timeSignature: ts,
      bars: Array.from({ length: level.bars }, () =>
        generateBar(level, ts, rng),
      ),
    };
    if (!options.avoid?.has(figureKey(figure))) return figure;
  }
  return figure!;
}

/** Fortlaufende Takte fürs Notenband: nie zweimal derselbe Takt direkt hintereinander. */
export function generateBarSequence(
  level: Level,
  ts: TimeSignature,
  count: number,
  rng: Rng = Math.random,
): RhythmEvent[][] {
  const bars: RhythmEvent[][] = [];
  for (let i = 0; i < count; i++) {
    let bar = generateBar(level, ts, rng);
    for (let retry = 0; retry < 8; retry++) {
      if (!bars.length || barKey(bar) !== barKey(bars[bars.length - 1]!)) break;
      bar = generateBar(level, ts, rng);
    }
    bars.push(bar);
  }
  return bars;
}

/** Hörbarer Fingerabdruck: wann ein Ton beginnt und wie lange er klingt. */
function soundingSpans(figure: Figure): Set<string> {
  const spans = new Set<string>();
  figure.bars.forEach((events, barIndex) => {
    for (const onset of onsetsOf(events)) {
      spans.add(`${barIndex}:${onset.tick}:${onset.ticks}`);
    }
  });
  return spans;
}

function similarity(a: Set<string>, b: Set<string>): number {
  const shared = [...a].filter((span) => b.has(span)).length;
  return shared / Math.max(1, new Set([...a, ...b]).size);
}

/**
 * Falsche Antworten fürs Diktat: möglichst ähnlich, aber hörbar anders.
 * Identisch klingende Schreibweisen fliegen raus, sonst gäbe es zwei richtige Lösungen.
 */
export function generateDistractors(
  target: Figure,
  level: Level,
  count: number,
  rng: Rng = Math.random,
): Figure[] {
  const targetSpans = soundingSpans(target);
  const pool: { figure: Figure; spans: Set<string>; score: number }[] = [];
  const seen = new Set<string>([[...targetSpans].sort().join()]);

  for (let attempt = 0; attempt < 240; attempt++) {
    const figure = generateFigure(level, target.timeSignature, { rng });
    const spans = soundingSpans(figure);
    const key = [...spans].sort().join();
    if (seen.has(key)) continue;
    seen.add(key);
    pool.push({ figure, spans, score: similarity(targetSpans, spans) });
  }

  pool.sort((a, b) => b.score - a.score);
  return pool.slice(0, count).map((entry) => entry.figure);
}
