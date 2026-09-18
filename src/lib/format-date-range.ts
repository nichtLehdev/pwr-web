/**
 * Multi-day items show dates only; clock times there read like data errors.
 * Alles in deutscher Ortszeit, denn der Server rendert in UTC.
 */
import { berlinParts, formatBerlin, isSameBerlinDay } from "./berlin-time";

export function isSameCalendarDay(a: Date, b: Date): boolean {
  return isSameBerlinDay(a, b);
}

/** Inclusive calendar-day count: 14.–15. Aug is 2 days, not 1. */
export function calendarDaysInclusive(start: Date, end: Date): number {
  const s = berlinParts(start);
  const e = berlinParts(end);
  // UTC-Mitternacht, damit ein Umstellungstag (23 oder 25 h) als ein Tag zählt.
  const startDay = Date.UTC(s.year, s.month - 1, s.day);
  const endDay = Date.UTC(e.year, e.month - 1, e.day);
  return Math.round((endDay - startDay) / (24 * 60 * 60 * 1000)) + 1;
}

/**
 * "14. August 2026, 15:00 – 18:00 Uhr" for single-day ranges,
 * "27. – 30. August 2026" / "27. Aug. – 2. Sep. 2026" for multi-day ranges.
 */
export function formatDateRange(start: Date, end: Date): string {
  if (isSameCalendarDay(start, end)) {
    const day = formatBerlin(start, "datumLang");
    const sameTime = start.getTime() === end.getTime();
    return sameTime
      ? `${day}, ${formatBerlin(start, "uhrzeit")} Uhr`
      : `${day}, ${formatBerlin(start, "uhrzeit")} – ${formatBerlin(end, "uhrzeit")} Uhr`;
  }

  const s = berlinParts(start);
  const e = berlinParts(end);
  if (s.year === e.year && s.month === e.month) {
    return `${s.day}. – ${formatBerlin(end, "datumLang")}`;
  }

  const startStr = formatBerlin(
    start,
    s.year === e.year ? { day: "numeric", month: "short" } : "datumMonatKurz",
  );
  return `${startStr} – ${formatBerlin(end, "datumMonatKurz")}`;
}
