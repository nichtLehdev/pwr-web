import { pulseOf, secPerTick } from "../../../_lib/rhythm/ticks";
import type { Attempt } from "./conductor";

export type Stars = 0 | 1 | 2 | 3;

export type SessionSummary = {
  percent: number;
  stars: Stars;
  tips: string[];
  /** Die Stelle, an der sich Üben am meisten lohnt. */
  focusAttempt: Attempt | null;
  bpm: number;
};

const MIN_SAMPLES = 4;
/** Anteil eines Schlags, ab dem eine Tendenz spürbar und nicht bloß Streuung ist. */
const BIAS_BEAT_FRACTION = 0.045;

export function starsFor(percent: number): Stars {
  if (percent >= 90) return 3;
  if (percent >= 75) return 2;
  if (percent >= 60) return 1;
  return 0;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

type Sample = { beats: number; offBeat: boolean };

function timingSamples(attempts: readonly Attempt[]): Sample[] {
  return attempts.flatMap((attempt) => {
    const { pulseTicks } = pulseOf(attempt.timeSignature);
    const pulseMs = pulseTicks * secPerTick(attempt.bpm) * 1000;
    return attempt.notes.flatMap((note) =>
      note.deltaMs === null
        ? []
        : [
            {
              beats: note.deltaMs / pulseMs,
              offBeat: note.tick % pulseTicks !== 0,
            },
          ],
    );
  });
}

/** Sagt in Worten, was als Nächstes zu üben ist. Höchstens drei Punkte, Wichtigstes zuerst. */
export function buildTips(attempts: readonly Attempt[]): string[] {
  const notes = attempts.flatMap((a) => a.notes);
  if (notes.length === 0) return [];
  const tips: string[] = [];

  const missedShare =
    notes.filter((n) => n.verdict === "missed").length / notes.length;
  if (missedShare > 0.25) {
    tips.push(
      "Einige Noten sind dir durchgerutscht. Lies die Figur beim Vorspielen schon mit und zähle leise die Schläge.",
    );
  }

  const samples = timingSamples(attempts);
  if (samples.length >= MIN_SAMPLES) {
    const bias = median(samples.map((s) => s.beats));
    if (bias < -BIAS_BEAT_FRACTION) {
      tips.push(
        "Du eilst: Deine Einsätze kommen meist etwas zu früh. Warte bewusst auf den Klick.",
      );
    } else if (bias > BIAS_BEAT_FRACTION) {
      tips.push(
        "Du schleppst: Deine Einsätze kommen meist etwas zu spät. Atme früher ein, wie vor einem Toneinsatz.",
      );
    }

    const onBeat = samples
      .filter((s) => !s.offBeat)
      .map((s) => Math.abs(s.beats));
    const offBeat = samples
      .filter((s) => s.offBeat)
      .map((s) => Math.abs(s.beats));
    if (
      onBeat.length >= MIN_SAMPLES &&
      offBeat.length >= MIN_SAMPLES &&
      median(offBeat) > median(onBeat) * 1.6
    ) {
      tips.push(
        "Auf den Schlägen sitzt du gut, dazwischen wird es ungenauer. Zähle die Unterteilung mit: „eins und zwei und“.",
      );
    }
  }

  const held = notes.filter((n) => n.length !== null);
  if (held.length >= MIN_SAMPLES) {
    const short = held.filter((n) => n.length === "short").length / held.length;
    const long = held.filter((n) => n.length === "long").length / held.length;
    if (short > 0.25) {
      tips.push(
        "Lange Noten hältst du zu kurz. Bleib auf der Taste, bis der Wert wirklich vorbei ist.",
      );
    }
    if (long > 0.25) {
      tips.push(
        "Vor Pausen lässt du zu spät los. Eine Pause ist Musik: Sie beginnt genau auf ihrem Schlag.",
      );
    }
  }

  if (tips.length === 0) {
    tips.push(
      "Dein Timing sitzt. Probiere die nächste Stufe oder spiele diese im Notenband.",
    );
  }
  return tips.slice(0, 3);
}

export function summarize(attempts: readonly Attempt[]): SessionSummary {
  const percent =
    attempts.length === 0
      ? 0
      : Math.round(
          (attempts.reduce((sum, a) => sum + a.accuracy, 0) / attempts.length) *
            100,
        );
  const focusAttempt = attempts.reduce<Attempt | null>(
    (worst, attempt) =>
      !worst || attempt.accuracy < worst.accuracy ? attempt : worst,
    null,
  );
  return {
    percent,
    stars: starsFor(percent),
    tips: buildTips(attempts),
    focusAttempt,
    bpm: attempts[attempts.length - 1]?.bpm ?? 0,
  };
}
