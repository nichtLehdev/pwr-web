import type { Figure, RhythmEvent, TimeSignature } from "./types";

/** Durch 3 und 4 teilbar: Triolen-Achtel = 16, Sechzehntel = 12. */
export const TICKS_PER_QUARTER = 48;

export function barTicks(ts: TimeSignature): number {
  return (ts.numerator * TICKS_PER_QUARTER * 4) / ts.denominator;
}

/** Bei x/8 zählt man punktierte Viertel (6/8 → 2 Schläge), sonst den Nenner. */
export function pulseOf(ts: TimeSignature): {
  pulseTicks: number;
  pulsesPerBar: number;
} {
  if (ts.denominator === 8 && ts.numerator % 3 === 0) {
    return {
      pulseTicks: (TICKS_PER_QUARTER * 3) / 2,
      pulsesPerBar: ts.numerator / 3,
    };
  }
  return {
    pulseTicks: (TICKS_PER_QUARTER * 4) / ts.denominator,
    pulsesPerBar: ts.numerator,
  };
}

/** BPM beziehen sich immer auf die Viertel. */
export function secPerTick(bpm: number): number {
  return 60 / bpm / TICKS_PER_QUARTER;
}

export type Onset = {
  eventIndex: number;
  tick: number;
  ticks: number;
  /** Folgt auf diese Note innerhalb des Takts eine Pause? */
  nextIsRest: boolean;
  isLastInBar: boolean;
};

export function onsetsOf(events: readonly RhythmEvent[]): Onset[] {
  const out: Onset[] = [];
  let tick = 0;
  events.forEach((event, eventIndex) => {
    if (!event.isRest) {
      const next = events[eventIndex + 1];
      out.push({
        eventIndex,
        tick,
        ticks: event.ticks,
        nextIsRest: next?.isRest ?? false,
        isLastInBar: next === undefined,
      });
    }
    tick += event.ticks;
  });
  return out;
}

export function sumTicks(events: readonly RhythmEvent[]): number {
  return events.reduce((sum, event) => sum + event.ticks, 0);
}

export function barKey(events: readonly RhythmEvent[]): string {
  return events
    .map(
      (e) =>
        `${e.isRest ? "r" : ""}${e.value}${e.tupletId !== undefined ? "t" : ""}`,
    )
    .join(" ");
}

export function figureKey(figure: Figure): string {
  const { numerator, denominator } = figure.timeSignature;
  return `${numerator}/${denominator}|${figure.bars.map(barKey).join("|")}`;
}
