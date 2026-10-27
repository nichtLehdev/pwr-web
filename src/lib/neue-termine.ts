import { berlinDate, berlinParts, type Zeitpunkt } from "@/lib/berlin-time";

/** So viele deutsche Kalendertage, den Erstellungstag eingerechnet, gilt ein Termin als neu. */
export const NEU_TAGE = 7;

/**
 * Beginn des Neu-Zeitraums: 00:00 Uhr Berliner Zeit vor `NEU_TAGE - 1` Tagen.
 * Am Kalendertag festgemacht, damit Server- und Client-Render übereinstimmen.
 */
export function neuSeit(now: Zeitpunkt = new Date()): Date {
  const { year, month, day } = berlinParts(now);
  return berlinDate(year, month, day - (NEU_TAGE - 1));
}

/**
 * Neu sind nur bezirksübergreifende Termine und Lehrgänge (ohne Bezirk), die im
 * Neu-Zeitraum angelegt wurden.
 */
export function isNeuerTermin(
  item: { createdAt: Zeitpunkt; bezirkId: string | null },
  now: Zeitpunkt = new Date(),
): boolean {
  return item.bezirkId === null && new Date(item.createdAt) >= neuSeit(now);
}
