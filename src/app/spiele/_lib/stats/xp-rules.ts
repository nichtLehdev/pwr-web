import { xpForPercent } from "./xp";

/**
 * XP rechnet der Server: Er kennt die früheren Runden eines Profils und entscheidet,
 * ob eine Runde neu ist. Der Browser schickt nur, was gespielt wurde.
 */
export const RESULT_KINDS = [
  "lesson",
  "challenge",
  "daily",
  "endless",
  "free",
] as const;
export type ResultKind = (typeof RESULT_KINDS)[number];

/** Mehr bringt ein Tag nicht, auch wer stundenlang spielt. */
export const DAILY_XP_CAP = 250;
const FIRST_PASS_BONUS = 10;
const ENDLESS_MAX = 20;

export function isResultKind(value: unknown): value is ResultKind {
  return (RESULT_KINDS as readonly unknown[]).includes(value);
}

export function roundXp(round: {
  kind: ResultKind;
  percent: number;
  /** Stufe schon mit mindestens so vielen Sternen geschafft. */
  replay?: boolean;
  /** Erstes Tagestraining dieses Spiels heute; alle weiteren bringen nichts. */
  firstDailyToday?: boolean;
  /** Challenge zum ersten Mal geschafft. */
  firstPass?: boolean;
  /** Endlos: erreichte Figuren oder Takte. */
  reached?: number;
}): number {
  const base = xpForPercent(round.percent);
  const reduced = Math.max(1, Math.ceil(base / 4));
  switch (round.kind) {
    case "lesson":
    case "challenge":
      return (
        (round.replay ? reduced : base) +
        (round.firstPass ? FIRST_PASS_BONUS : 0)
      );
    case "daily":
      // Einmal am Tag je Spiel; jede weitere Runde wäre nur Punktesammeln.
      return round.firstDailyToday ? base * 2 : 0;
    case "endless":
      return Math.min(ENDLESS_MAX, 5 + Math.floor((round.reached ?? 0) / 2));
    case "free":
      return Math.ceil(base / 2);
  }
}

export function capToDay(xp: number, earnedToday: number): number {
  return Math.max(0, Math.min(xp, DAILY_XP_CAP - earnedToday));
}
