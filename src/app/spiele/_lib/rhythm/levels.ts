import type { TimeSignature } from "./types";

const FOUR: TimeSignature = { numerator: 4, denominator: 4 };
const THREE: TimeSignature = { numerator: 3, denominator: 4 };
const SIX: TimeSignature = { numerator: 6, denominator: 8 };

/**
 * Baustein über ganze Schläge, z. B. `8 q 8`. Tokens: w hd h qd q 8d 8 16, `t` = Triolen-Achtel,
 * Vorsilbe `r` = Pause. `strong`: nur auf schweren Zählzeiten, damit die Taktmitte sichtbar bleibt.
 */
export type Cell = {
  pattern: string;
  weight?: number;
  strong?: boolean;
  /** Das Thema der Stufe: jede Figur enthält mindestens einen solchen Baustein. */
  focus?: boolean;
};

export type Level = {
  id: string;
  title: string;
  hint: string;
  group: string;
  meters: readonly TimeSignature[];
  cells: readonly Cell[];
  bpm: { min: number; start: number; max: number };
  bars: 1 | 2;
  minOnsets: number;
  /** Faktor für die Trefferfenster: Einsteiger bekommen etwas mehr Luft. */
  leniency: number;
};

const Q: Cell = { pattern: "q", weight: 3 };
const EIGHTHS: Cell = { pattern: "8 8", weight: 3 };
const QUARTER_REST: Cell = { pattern: "rq" };
const SIXTEENTHS: Cell = { pattern: "16 16 16 16", weight: 2 };

export const LEVELS: readonly Level[] = [
  {
    id: "viertel-halbe",
    title: "Viertel und Halbe",
    hint: "Der erste Puls: halte die Halben zwei Schläge lang",
    group: "Grundlagen",
    meters: [FOUR],
    cells: [Q, { pattern: "h", weight: 2, focus: true }],
    bpm: { min: 60, start: 72, max: 104 },
    bars: 1,
    minOnsets: 2,
    leniency: 1.3,
  },
  {
    id: "ganze-pausen",
    title: "Ganze und Pausen",
    hint: "Lange Töne aushalten, in der Pause wirklich loslassen",
    group: "Grundlagen",
    meters: [FOUR],
    cells: [
      Q,
      { pattern: "h", weight: 2 },
      { pattern: "w", focus: true },
      { pattern: "rq", weight: 2, focus: true },
      { pattern: "rh", focus: true, strong: true },
    ],
    bpm: { min: 60, start: 76, max: 108 },
    bars: 1,
    minOnsets: 1,
    leniency: 1.3,
  },
  {
    id: "dreier",
    title: "Dreiertakt",
    hint: "Drei Schläge pro Takt, auch die punktierte Halbe",
    group: "Grundlagen",
    meters: [THREE],
    cells: [
      Q,
      { pattern: "h", weight: 2, focus: true },
      { pattern: "hd", focus: true },
      QUARTER_REST,
    ],
    bpm: { min: 66, start: 84, max: 120 },
    bars: 1,
    minOnsets: 1,
    leniency: 1.3,
  },
  {
    id: "achtel",
    title: "Achtel",
    hint: "Zwei gleichmäßige Noten auf einem Schlag",
    group: "Achtel",
    meters: [FOUR, THREE],
    cells: [
      Q,
      { pattern: "h" },
      QUARTER_REST,
      { pattern: "8 8", weight: 3, focus: true },
    ],
    bpm: { min: 60, start: 76, max: 120 },
    bars: 1,
    minOnsets: 2,
    leniency: 1.2,
  },
  {
    id: "achtelpausen",
    title: "Achtelpausen",
    hint: "Einsatz zwischen den Schlägen: der Puls läuft weiter",
    group: "Achtel",
    meters: [FOUR, THREE],
    cells: [
      Q,
      EIGHTHS,
      QUARTER_REST,
      { pattern: "r8 8", weight: 3, focus: true },
      { pattern: "8 r8", weight: 2, focus: true },
    ],
    bpm: { min: 60, start: 72, max: 116 },
    bars: 1,
    minOnsets: 2,
    leniency: 1.2,
  },
  {
    id: "punktiert",
    title: "Punktierte Viertel",
    hint: "Lang, und die Achtel kommt erst kurz vor dem nächsten Schlag",
    group: "Achtel",
    meters: [FOUR],
    cells: [
      Q,
      EIGHTHS,
      { pattern: "h" },
      { pattern: "qd 8", weight: 3, strong: true, focus: true },
    ],
    bpm: { min: 60, start: 72, max: 116 },
    bars: 1,
    minOnsets: 2,
    leniency: 1.1,
  },
  {
    id: "synkopen",
    title: "Synkopen",
    hint: "Die Betonung rutscht zwischen die Schläge",
    group: "Achtel",
    meters: [FOUR],
    cells: [
      Q,
      EIGHTHS,
      { pattern: "qd 8", strong: true },
      { pattern: "8 q 8", weight: 3, strong: true, focus: true },
      { pattern: "r8 q 8", strong: true, focus: true },
    ],
    bpm: { min: 60, start: 72, max: 112 },
    bars: 1,
    minOnsets: 2,
    leniency: 1.1,
  },
  {
    id: "sechzehntel",
    title: "Sechzehntel",
    hint: "Vier gleichmäßige Noten auf einem Schlag",
    group: "Sechzehntel",
    meters: [FOUR],
    cells: [Q, EIGHTHS, { pattern: "16 16 16 16", weight: 2, focus: true }],
    bpm: { min: 48, start: 60, max: 96 },
    bars: 1,
    minOnsets: 3,
    leniency: 1.1,
  },
  {
    id: "achtel-sechzehntel",
    title: "Achtel und Sechzehntel",
    hint: "Galopp und umgekehrter Galopp",
    group: "Sechzehntel",
    meters: [FOUR, THREE],
    cells: [
      Q,
      EIGHTHS,
      SIXTEENTHS,
      { pattern: "8 16 16", weight: 3, focus: true },
      { pattern: "16 16 8", weight: 3, focus: true },
    ],
    bpm: { min: 48, start: 60, max: 96 },
    bars: 1,
    minOnsets: 3,
    leniency: 1,
  },
  {
    id: "punktierte-achtel",
    title: "Punktierte Achtel",
    hint: "Scharf punktiert, nicht wie eine Triole",
    group: "Sechzehntel",
    meters: [FOUR, THREE],
    cells: [
      Q,
      EIGHTHS,
      { pattern: "8 16 16" },
      { pattern: "8d 16", weight: 3, focus: true },
      { pattern: "16 8d", focus: true },
    ],
    bpm: { min: 48, start: 60, max: 96 },
    bars: 1,
    minOnsets: 3,
    leniency: 1,
  },
  {
    id: "sechzehntel-synkopen",
    title: "Sechzehntel-Synkopen",
    hint: "Die kurze Note zuerst, Einsätze auf der Zwei von Vier",
    group: "Sechzehntel",
    meters: [FOUR],
    cells: [
      { pattern: "q" },
      EIGHTHS,
      { pattern: "8 16 16" },
      { pattern: "16 8 16", weight: 3, focus: true },
      { pattern: "r16 16 16 16", weight: 2, focus: true },
    ],
    bpm: { min: 48, start: 58, max: 90 },
    bars: 1,
    minOnsets: 3,
    leniency: 1,
  },
  {
    id: "triolen",
    title: "Triolen",
    hint: "Drei statt zwei auf einem Schlag",
    group: "Triolen und 6/8",
    meters: [FOUR, THREE],
    cells: [
      Q,
      EIGHTHS,
      { pattern: "t t t", weight: 3, focus: true },
      { pattern: "t rt t", focus: true },
    ],
    bpm: { min: 48, start: 66, max: 104 },
    bars: 1,
    minOnsets: 3,
    leniency: 1,
  },
  {
    id: "sechsachtel",
    title: "6/8-Takt",
    hint: "Zwei große Schläge mit je drei Achteln",
    group: "Triolen und 6/8",
    meters: [SIX],
    cells: [
      { pattern: "qd", weight: 2 },
      { pattern: "8 8 8", weight: 3, focus: true },
      { pattern: "q 8", weight: 3, focus: true },
      { pattern: "r8 8 8", focus: true },
    ],
    bpm: { min: 72, start: 96, max: 144 },
    bars: 1,
    minOnsets: 2,
    leniency: 1,
  },
  {
    id: "sechsachtel-sechzehntel",
    title: "6/8 mit Sechzehnteln",
    hint: "Der Siciliano-Schwung und seine Verwandten",
    group: "Triolen und 6/8",
    meters: [SIX],
    cells: [
      { pattern: "qd" },
      { pattern: "8 8 8", weight: 2 },
      { pattern: "q 8", weight: 2 },
      { pattern: "8d 16 8", weight: 3, focus: true },
      { pattern: "16 16 8 8", focus: true },
      { pattern: "8 16 16 8", focus: true },
    ],
    bpm: { min: 60, start: 76, max: 120 },
    bars: 1,
    minOnsets: 3,
    leniency: 1,
  },
  {
    id: "meister",
    title: "Alles zusammen",
    hint: "Zwei Takte aus allem, was bisher kam",
    group: "Für Fortgeschrittene",
    meters: [FOUR, THREE],
    cells: [
      { pattern: "q", weight: 2 },
      { pattern: "8 8", weight: 2 },
      { pattern: "r8 8" },
      { pattern: "8 16 16", focus: true },
      { pattern: "16 16 8", focus: true },
      { pattern: "16 8 16", focus: true },
      { pattern: "8d 16", focus: true },
      { pattern: "t t t", focus: true },
      { pattern: "16 16 16 16" },
      { pattern: "qd 8", strong: true },
      { pattern: "8 q 8", strong: true },
    ],
    bpm: { min: 56, start: 72, max: 126 },
    bars: 2,
    minOnsets: 3,
    leniency: 1,
  },
];

export function levelById(id: string | null | undefined): Level | null {
  return LEVELS.find((level) => level.id === id) ?? null;
}

export function hasSteadyPitch(level: Level): boolean {
  return level.group === LEVELS[0]!.group;
}
