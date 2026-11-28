import type { GameResultEvent } from "./types";

const XP_BASE = 5;
const XP_FOR_FULL_SCORE = 15;

/** Jede Runde bringt etwas, eine gute deutlich mehr. */
export function xpForPercent(percent: number): number {
  const clamped = Math.min(100, Math.max(0, percent));
  return XP_BASE + Math.round((clamped / 100) * XP_FOR_FULL_SCORE);
}

function percentOf(event: GameResultEvent): number {
  return event.maxScore ? (100 * event.score) / event.maxScore : 0;
}

/** XP heute, aus den echten Runden berechnet. */
export function xpToday(events: readonly GameResultEvent[], now: Date): number {
  return events
    .filter((event) => {
      const played = new Date(event.playedAt);
      return (
        played.getFullYear() === now.getFullYear() &&
        played.getMonth() === now.getMonth() &&
        played.getDate() === now.getDate()
      );
    })
    .reduce((sum, event) => sum + xpForPercent(percentOf(event)), 0);
}
