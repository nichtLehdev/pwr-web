/**
 * Date-range display helpers for courses/events.
 *
 * Multi-day items show dates only: start/end clock times on a three-day
 * course ("27. Aug., 02:00 – 30. Aug., 02:00") read like data errors and the
 * arrival/departure times belong in the description. Times are shown for
 * single-day items only.
 */

export function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Inclusive calendar-day count: 14.–15. Aug is 2 days, not 1. */
export function calendarDaysInclusive(start: Date, end: Date): number {
  const startDay = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
  );
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return (
    Math.round(
      (endDay.getTime() - startDay.getTime()) / (24 * 60 * 60 * 1000),
    ) + 1
  );
}

const TIME = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * "14. August 2026, 15:00 – 18:00 Uhr" for single-day ranges,
 * "27. – 30. August 2026" / "27. Aug. – 2. Sep. 2026" for multi-day ranges.
 */
export function formatDateRange(start: Date, end: Date): string {
  if (isSameCalendarDay(start, end)) {
    const day = start.toLocaleDateString("de-DE", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const sameTime = start.getTime() === end.getTime();
    return sameTime
      ? `${day}, ${TIME.format(start)} Uhr`
      : `${day}, ${TIME.format(start)} – ${TIME.format(end)} Uhr`;
  }

  const sameMonth =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth();
  if (sameMonth) {
    return `${start.getDate()}. – ${end.toLocaleDateString("de-DE", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })}`;
  }

  const sameYear = start.getFullYear() === end.getFullYear();
  const startStr = start.toLocaleDateString("de-DE", {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  const endStr = end.toLocaleDateString("de-DE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${startStr} – ${endStr}`;
}
