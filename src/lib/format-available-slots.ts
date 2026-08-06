/**
 * One capacity phrasing for the whole site. Exact numbers are only shown
 * when a course is nearly full — "Noch 3 Plätze frei" creates urgency,
 * "Noch 100 Plätze frei" mostly advertises emptiness.
 *
 * "Nearly full" scales with course size: 20% of capacity, capped at 10.
 * An 8-person workshop switches to exact numbers at 2 remaining seats,
 * a 100-person Lehrgang at 10 — without the small course leaking its
 * exact count from day one.
 */

export const SLOTS_URGENCY_THRESHOLD = 10;

export function slotsUrgencyThreshold(capacity?: number | null): number {
  if (capacity == null || !Number.isFinite(capacity) || capacity <= 0) {
    return SLOTS_URGENCY_THRESHOLD;
  }
  return Math.min(
    SLOTS_URGENCY_THRESHOLD,
    Math.max(1, Math.ceil(capacity * 0.2)),
  );
}

export function formatAvailableSlots(
  available: number,
  capacity?: number | null,
): string {
  if (available <= 0) return "Ausgebucht";
  if (
    !Number.isFinite(available) ||
    available > slotsUrgencyThreshold(capacity)
  ) {
    return "Plätze verfügbar";
  }
  return `Noch ${available} ${available === 1 ? "Platz" : "Plätze"} frei`;
}
