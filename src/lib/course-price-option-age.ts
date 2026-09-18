/**
 * Altersgrenzen von Preiskategorien. Formular und Server teilen sich diese Funktionen,
 * damit das Formular nichts anbietet, was der Server danach ablehnt.
 */
import { berlinParts } from "./berlin-time";

/** Vollendete Jahre, die eine Kategorie fordern darf. */
export const MIN_PRICE_OPTION_AGE = 0;
export const MAX_PRICE_OPTION_AGE = 120;

export type PriceOptionAgeLimits = {
  minAge?: number | null;
  maxAge?: number | null;
};

/**
 * Stichtag für alle Altersgrenzen (auch Geschwisterkindrabatt) ist der erste Kurstag, nicht die
 * Anmeldung — sonst änderte ein Geburtstag dazwischen den schon bestätigten Preis.
 */
export function priceOptionAgeReferenceDate(course: {
  startDate: Date | string;
}): Date {
  return new Date(course.startDate);
}

/** Alter in vollendeten Jahren am Stichtag; `null` ohne brauchbares Geburtsdatum. */
export function ageOnDate(
  birthDate: Date | string | null | undefined,
  referenceDate: Date | string,
): number | null {
  if (!birthDate) return null;
  const born = new Date(birthDate);
  const reference = new Date(referenceDate);
  if (Number.isNaN(born.getTime()) || Number.isNaN(reference.getTime())) {
    return null;
  }

  // Deutscher Kalendertag statt `getFullYear()` & Co., sonst rechnet der Server (UTC)
  // für einen Kurs ab 00:00 mit dem Vortag. Geburtsdaten (UTC-Mitternacht) bleiben ihr Tag.
  const b = berlinParts(born);
  const r = berlinParts(reference);
  let age = r.year - b.year;
  if (r.month < b.month || (r.month === b.month && r.day < b.day)) {
    age--;
  }
  return age >= 0 && age <= MAX_PRICE_OPTION_AGE ? age : null;
}

export function hasAgeLimits(option: PriceOptionAgeLimits): boolean {
  return option.minAge != null || option.maxAge != null;
}

/** „ab 18 Jahren", „bis 17 Jahre", „12–17 Jahre"; `null` ohne Grenzen. */
export function priceOptionAgeLabel(
  option: PriceOptionAgeLimits,
): string | null {
  const { minAge, maxAge } = option;
  if (minAge != null && maxAge != null) return `${minAge}–${maxAge} Jahre`;
  if (minAge != null) return `ab ${minAge} Jahren`;
  if (maxAge != null) return `bis ${maxAge} Jahre`;
  return null;
}

/** Unbekanntes Alter (`null`) gilt als passend; die Pflicht zum Geburtsdatum prüft woanders. */
export function isAgeWithinPriceOption(
  option: PriceOptionAgeLimits,
  age: number | null,
): boolean {
  if (age == null) return true;
  if (option.minAge != null && age < option.minAge) return false;
  if (option.maxAge != null && age > option.maxAge) return false;
  return true;
}

export function isBirthDateWithinPriceOption(
  option: PriceOptionAgeLimits,
  birthDate: Date | string | null | undefined,
  referenceDate: Date | string,
): boolean {
  return isAgeWithinPriceOption(option, ageOnDate(birthDate, referenceDate));
}

/** Warum das Alter nicht passt, als fertiger Satz; `null`, wenn es passt. */
export function priceOptionAgeMismatchMessage(
  option: PriceOptionAgeLimits & { label: string },
  age: number | null,
): string | null {
  if (isAgeWithinPriceOption(option, age)) return null;

  // Zweiter Teil bewusst ohne Subjekt; den Namen stellt bei Bedarf der Aufrufer voran.
  return `„${option.label}“ gilt ${rangeAsClause(option)}. Alter zu Kursbeginn: ${age} Jahre.`;
}

/** „für 12 bis 17 Jahre" / „ab 18 Jahren" / „bis 17 Jahre" */
function rangeAsClause(option: PriceOptionAgeLimits): string {
  const { minAge, maxAge } = option;
  if (minAge != null && maxAge != null)
    return `für ${minAge} bis ${maxAge} Jahre`;
  if (minAge != null) return `ab ${minAge} Jahren`;
  return `bis ${maxAge} Jahre`;
}

export function priceOptionsForAge<T extends PriceOptionAgeLimits>(
  options: readonly T[],
  age: number | null,
): T[] {
  return options.filter((option) => isAgeWithinPriceOption(option, age));
}

/**
 * Kategorie nach geändertem Geburtsdatum: Die bisherige bleibt, solange sie passt; sonst die
 * einzige passende. Bei mehreren bleibt die bisherige, und die Prüfung verlangt eine Wahl.
 */
export function priceOptionIdForAge<
  T extends PriceOptionAgeLimits & { id: string },
>(
  options: readonly T[],
  age: number | null,
  currentId: string | null | undefined,
): string | null | undefined {
  const current = options.find((option) => option.id === currentId);
  if (current && isAgeWithinPriceOption(current, age)) return currentId;

  const eligible = priceOptionsForAge(options, age);
  return eligible.length === 1 ? eligible[0]!.id : currentId;
}

/** Fehlermeldung zu den Altersgrenzen einer Kategorie oder `null`. */
export function validatePriceOptionAgeRange(
  option: PriceOptionAgeLimits & { label?: string },
): string | null {
  const { minAge, maxAge } = option;
  const name = option.label?.trim();
  const subject = name ? `„${name}“` : "Diese Preiskategorie";

  for (const value of [minAge, maxAge]) {
    if (value == null) continue;
    if (
      !Number.isInteger(value) ||
      value < MIN_PRICE_OPTION_AGE ||
      value > MAX_PRICE_OPTION_AGE
    ) {
      return `${subject}: Altersgrenzen müssen ganze Zahlen zwischen ${MIN_PRICE_OPTION_AGE} und ${MAX_PRICE_OPTION_AGE} sein.`;
    }
  }

  if (minAge != null && maxAge != null && minAge > maxAge) {
    return `${subject}: Das Mindestalter darf nicht über dem Höchstalter liegen.`;
  }

  return null;
}

export function validatePriceOptionAgeRanges(
  options: ReadonlyArray<PriceOptionAgeLimits & { label?: string }>,
): string | null {
  for (const option of options) {
    const message = validatePriceOptionAgeRange(option);
    if (message) return message;
  }
  return null;
}
