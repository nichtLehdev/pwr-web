import { berlinDate, berlinParts } from "@/lib/berlin-time";

/**
 * Deadlines include their whole calendar day. Stored times vary (midnight or end-of-day),
 * so always compare through these helpers, never the raw timestamp.
 */

/**
 * Ende des Fristtages, 23:59:59.999 deutscher Zeit. Nicht `setHours`: der Server
 * läuft in UTC, maßgeblich ist der deutsche Kalendertag.
 */
export function deadlineEndOfDay(deadline: Date | string): Date {
  const { year, month, day } = berlinParts(deadline);
  return new Date(berlinDate(year, month, day + 1).getTime() - 1);
}

export function isRegistrationDeadlinePassed(
  deadline: Date | string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!deadline) return false;
  return now > deadlineEndOfDay(deadline);
}
