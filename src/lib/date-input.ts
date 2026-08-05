/**
 * Helpers for <input type="date"> round-trips.
 *
 * Date-only strings ("2026-05-31") passed to `new Date()` parse as UTC
 * midnight, while datetime strings parse as local time — mixing the two
 * shifts dates by a day around midnight and made registration deadlines
 * expire ~22h early. Always convert through these helpers instead.
 */

/** Format a Date as yyyy-MM-dd in the local timezone (not UTC). */
export function toLocalDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parse a yyyy-MM-dd deadline as end-of-day local time, so a deadline of
 * "2026-05-31" accepts registrations through the whole 31st.
 */
export function parseDeadlineEndOfDay(value: string): Date {
  return new Date(`${value}T23:59:59`);
}
