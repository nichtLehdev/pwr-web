/**
 * Exact numbers only when nearly full — "Noch 100 Plätze frei" advertises emptiness.
 * "Nearly full" is 20% of capacity, capped at 10.
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
