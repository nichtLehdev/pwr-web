/**
 * Registration deadlines are inclusive of their whole calendar day: a
 * deadline of "10. August" accepts registrations until 10.08. 23:59:59.
 *
 * Stored values may carry any time-of-day (legacy rows were saved as
 * midnight, newer ones as end-of-day), so every comparison must go through
 * these helpers instead of comparing the raw timestamp.
 */

/** End of the deadline's calendar day (23:59:59.999 local time). */
export function deadlineEndOfDay(deadline: Date | string): Date {
  const end = new Date(deadline);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function isRegistrationDeadlinePassed(
  deadline: Date | string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!deadline) return false;
  return now > deadlineEndOfDay(deadline);
}
