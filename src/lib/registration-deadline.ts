import { berlinDate, berlinParts } from "@/lib/berlin-time";

/**
 * Registration deadlines are inclusive of their whole calendar day: a
 * deadline of "10. August" accepts registrations until 10.08. 23:59:59.
 *
 * Stored values may carry any time-of-day (legacy rows were saved as
 * midnight, newer ones as end-of-day), so every comparison must go through
 * these helpers instead of comparing the raw timestamp.
 */

/**
 * Ende des Fristtages: 23:59:59.999 deutscher Zeit.
 *
 * Nicht mit `setHours` in der Zeit des Rechners: Der Server läuft in UTC.
 * Eine als 23:59 deutscher Zeit gespeicherte Frist nahm dort Anmeldungen bis
 * 01:59 des Folgetags an, eine als deutsche Mitternacht gespeicherte schloss
 * schon fast einen ganzen Tag zu früh — und der Browser rechnete jeweils
 * anders als der Server. Maßgeblich ist der deutsche Kalendertag.
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
