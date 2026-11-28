export type Verdict = "exact" | "close" | "off" | "missed";
export type LengthVerdict = "ok" | "short" | "long";

const VERDICT_POINTS: Record<Verdict, number> = {
  exact: 1,
  close: 0.75,
  off: 0.35,
  missed: 0,
};
const LENGTH_PENALTY = 0.6;
const EXTRA_PENALTY = 0.08;
/** Bis hierhin gilt eine lange Note als gehalten; darunter ist sie „zu kurz“. */
const MIN_HELD_FRACTION = 0.55;

export type ExpectedNote = {
  barIndex: number;
  eventIndex: number;
  /** Position im Takt: für Tipps („zwischen den Schlägen“) und die Spielspur. */
  tick: number;
  onsetMs: number;
  durationMs: number;
  /** Nur lange Noten: kurze Werte lassen sich gar nicht sinnvoll anders spielen. */
  judgeLength: boolean;
  nextIsRest: boolean;
};

export type JudgedNote = ExpectedNote & {
  verdict: Verdict | null;
  deltaMs: number | null;
  length: LengthVerdict | null;
  exactMs: number;
  closeMs: number;
  offMs: number;
};

export type JudgeSegmentInput = {
  id: number;
  startMs: number;
  endMs: number;
  pulseMs: number;
  notes: ExpectedNote[];
};

type JudgedSegment = Omit<JudgeSegmentInput, "notes"> & {
  notes: JudgedNote[];
  extras: number;
};

export type JudgeEvent =
  | { type: "note"; segmentId: number; note: JudgedNote }
  | { type: "length"; segmentId: number; note: JudgedNote }
  | { type: "extra"; segmentId: number; atMs: number };

export type JudgeOptions = { judgeLengths: boolean; leniency: number };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Fenster je Note: enge Nachbarn deckeln sie, damit Sechzehntel nicht ineinanderlaufen. */
function withWindows(
  notes: ExpectedNote[],
  pulseMs: number,
  leniency: number,
): JudgedNote[] {
  const exact = clamp(pulseMs * 0.07, 28, 50) * leniency;
  return notes.map((note, i) => {
    const gaps = [
      i > 0 ? note.onsetMs - notes[i - 1]!.onsetMs : Infinity,
      i < notes.length - 1 ? notes[i + 1]!.onsetMs - note.onsetMs : Infinity,
    ];
    const cap = Math.min(...gaps) * 0.48;
    const scale = Math.min(1, cap / (exact * 3.2));
    return {
      ...note,
      verdict: null,
      deltaMs: null,
      length: null,
      exactMs: exact * scale,
      closeMs: exact * 2 * scale,
      offMs: exact * 3.2 * scale,
    };
  });
}

/**
 * Urteilt während des Spielens. Alle Zeiten liegen auf derselben Liedzeit-Achse (ms), sodass
 * der Richter Audio, Latenz und Tempo nicht kennen muss.
 */
export class LiveJudge {
  private segments: JudgedSegment[] = [];
  private active: {
    note: JudgedNote;
    segmentId: number;
    pressMs: number;
  } | null = null;
  private streak = 0;
  bestStreak = 0;

  constructor(private readonly options: JudgeOptions) {}

  addSegment(input: JudgeSegmentInput): void {
    this.segments.push({
      ...input,
      notes: withWindows(input.notes, input.pulseMs, this.options.leniency),
      extras: 0,
    });
  }

  private countStreak(verdict: Verdict): void {
    if (verdict === "exact" || verdict === "close") {
      this.streak++;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
    } else {
      this.streak = 0;
    }
  }

  get currentStreak(): number {
    return this.streak;
  }

  press(ms: number): JudgeEvent | null {
    let best: { note: JudgedNote; segmentId: number } | null = null;
    let bestDistance = Infinity;
    for (const segment of this.segments) {
      for (const note of segment.notes) {
        if (note.verdict !== null) continue;
        const distance = Math.abs(ms - note.onsetMs);
        if (distance <= note.offMs && distance < bestDistance) {
          best = { note, segmentId: segment.id };
          bestDistance = distance;
        }
      }
    }

    if (best) {
      const { note, segmentId } = best;
      note.deltaMs = ms - note.onsetMs;
      note.verdict =
        bestDistance <= note.exactMs
          ? "exact"
          : bestDistance <= note.closeMs
            ? "close"
            : "off";
      this.countStreak(note.verdict);
      this.active = { note, segmentId, pressMs: ms };
      return { type: "note", segmentId, note };
    }

    this.active = null;
    // Außerhalb der eigenen Takte (etwa beim Vorspielen) darf man ungestraft mitspielen.
    const segment = this.segments.find(
      (s) => ms >= s.startMs - 80 && ms <= s.endMs,
    );
    if (!segment) return null;
    segment.extras++;
    return { type: "extra", segmentId: segment.id, atMs: ms };
  }

  release(ms: number): JudgeEvent | null {
    const active = this.active;
    this.active = null;
    if (!active || !this.options.judgeLengths) return null;
    const { note, segmentId, pressMs } = active;
    if (!note.judgeLength || note.length !== null) return null;
    const held = ms - pressMs;
    note.length =
      held < note.durationMs * MIN_HELD_FRACTION
        ? "short"
        : note.nextIsRest && ms > this.lateReleaseLimit(note)
          ? "long"
          : "ok";
    return { type: "length", segmentId, note };
  }

  private lateReleaseLimit(note: JudgedNote): number {
    return note.onsetMs + note.durationMs + Math.max(note.offMs, 110);
  }

  /** Verpasste Noten und zu lang gehaltene Töne stehen erst fest, wenn die Zeit vorbei ist. */
  advance(ms: number): JudgeEvent[] {
    const events: JudgeEvent[] = [];
    for (const segment of this.segments) {
      for (const note of segment.notes) {
        if (note.verdict === null && ms > note.onsetMs + note.offMs) {
          note.verdict = "missed";
          this.countStreak("missed");
          events.push({ type: "note", segmentId: segment.id, note });
        }
      }
    }
    const active = this.active;
    if (
      active &&
      this.options.judgeLengths &&
      active.note.judgeLength &&
      active.note.nextIsRest &&
      active.note.length === null &&
      ms > this.lateReleaseLimit(active.note)
    ) {
      active.note.length = "long";
      events.push({
        type: "length",
        segmentId: active.segmentId,
        note: active.note,
      });
    }
    return events;
  }

  /** Nur bereits beurteilte Noten zählen: so geht es auch kurz vor dem Taktende. */
  accuracy(segmentId: number): number {
    const segment = this.segments.find((s) => s.id === segmentId);
    if (!segment) return 0;
    const judged = segment.notes.filter((n) => n.verdict !== null);
    if (judged.length === 0) return 0;
    const points = judged.reduce((sum, note) => {
      const base = VERDICT_POINTS[note.verdict!];
      const isOff = note.length === "short" || note.length === "long";
      return sum + base * (isOff ? LENGTH_PENALTY : 1);
    }, 0);
    return clamp(points / judged.length - segment.extras * EXTRA_PENALTY, 0, 1);
  }

  segment(segmentId: number): { notes: JudgedNote[]; extras: number } | null {
    const segment = this.segments.find((s) => s.id === segmentId);
    return segment ? { notes: segment.notes, extras: segment.extras } : null;
  }

  isComplete(segmentId: number): boolean {
    return (
      this.segments
        .find((s) => s.id === segmentId)
        ?.notes.every((n) => n.verdict !== null) ?? false
    );
  }
}
