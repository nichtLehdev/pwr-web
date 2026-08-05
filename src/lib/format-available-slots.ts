/**
 * One capacity phrasing for the whole site. Exact numbers are only shown
 * when a course is nearly full — "Noch 3 Plätze frei" creates urgency,
 * "Noch 100 Plätze frei" mostly advertises emptiness.
 */

export const SLOTS_URGENCY_THRESHOLD = 10;

export function formatAvailableSlots(available: number): string {
  if (available <= 0) return "Ausgebucht";
  if (!Number.isFinite(available) || available > SLOTS_URGENCY_THRESHOLD) {
    return "Plätze verfügbar";
  }
  return `Noch ${available} ${available === 1 ? "Platz" : "Plätze"} frei`;
}
