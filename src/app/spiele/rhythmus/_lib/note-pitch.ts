import type { RhythmEvent } from "./types";

/** VexFlow-style pitch like c/4, c#/4, bb/4 */

const SEMITONE: Record<string, number> = {
  c: 0,
  d: 2,
  e: 4,
  f: 5,
  g: 7,
  a: 9,
  b: 11,
};

/**
 * Converts a VexFlow key string to Hz (A440). Invalid or rest-like input falls back to C4.
 */
export function keyToFrequencyHz(key: string): number {
  const trimmed = key.trim().toLowerCase();
  if (trimmed.startsWith("r/")) return 261.63;

  const m = trimmed.match(/^([a-g])([#b]?)\/(\d+)$/);
  if (!m?.[1] || !m[3]) return 261.63;

  const letter = m[1];
  const acc = m[2] ?? "";
  const octave = Number.parseInt(m[3], 10);
  if (Number.isNaN(octave)) return 261.63;

  let semi = SEMITONE[letter] ?? 0;
  if (acc === "#") semi += 1;
  if (acc === "b") semi -= 1;

  const midi = 12 * (octave + 1) + semi;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function displayKey(e: RhythmEvent): string {
  const k = e.key ?? "c/4";
  if (/^r\//i.test(k)) return "c/4";
  return k;
}

/** Each sounded note: onset, pitch, and notated length (for playback envelope). */
export function getNoteOnsetPitches(
  events: RhythmEvent[],
): { onsetMs: number; key: string; durationMs: number }[] {
  let t = 0;
  const out: { onsetMs: number; key: string; durationMs: number }[] = [];
  for (const e of events) {
    if (!e.isRest) {
      out.push({
        onsetMs: t,
        key: displayKey(e),
        durationMs: e.durationMs,
      });
    }
    t += e.durationMs;
  }
  return out;
}

/** Pitch of the note whose onset is closest to `offsetMs` (ms from rhythm start). */
export function keyClosestToOffset(
  events: RhythmEvent[],
  offsetMs: number,
): string {
  let t = 0;
  let bestKey = "c/4";
  let bestDist = Infinity;
  for (const e of events) {
    if (!e.isRest) {
      const k = displayKey(e);
      const d = Math.abs(offsetMs - t);
      if (d < bestDist) {
        bestDist = d;
        bestKey = k;
      }
    }
    t += e.durationMs;
  }
  return bestKey;
}
