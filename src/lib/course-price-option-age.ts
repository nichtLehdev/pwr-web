/**
 * Altersgrenzen von Preiskategorien — die eine Stelle, an der „passt dieses
 * Alter in diese Kategorie?" beantwortet wird.
 *
 * Anmeldeformular, Bearbeiten-Seite und Server teilen sich diese Funktionen,
 * damit das Formular keine Auswahl anbietet, die der Server danach ablehnt.
 */

/** Vollendete Jahre, die eine Kategorie fordern darf. */
export const MIN_PRICE_OPTION_AGE = 0;
export const MAX_PRICE_OPTION_AGE = 120;

export type PriceOptionAgeLimits = {
  minAge?: number | null;
  maxAge?: number | null;
};

/**
 * Stichtag für alle Altersgrenzen: der erste Kurstag.
 *
 * Nicht der Tag der Anmeldung — sonst wechselte ein Teilnehmer, der zwischen
 * Anmeldung und Kurs Geburtstag hat, die Kategorie und damit den Preis, den er
 * schon bestätigt bekommen hat. Derselbe Stichtag gilt beim
 * Geschwisterkindrabatt.
 */
export function priceOptionAgeReferenceDate(course: {
  startDate: Date | string;
}): Date {
  return new Date(course.startDate);
}

/**
 * Alter in vollendeten Jahren am Stichtag. `null`, solange kein brauchbares
 * Geburtsdatum vorliegt — ein halb ausgefülltes Formular soll nicht so tun,
 * als wüsste es das Alter.
 */
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

  let age = reference.getFullYear() - born.getFullYear();
  const monthsApart = reference.getMonth() - born.getMonth();
  if (
    monthsApart < 0 ||
    (monthsApart === 0 && reference.getDate() < born.getDate())
  ) {
    age--;
  }
  return age >= 0 && age <= MAX_PRICE_OPTION_AGE ? age : null;
}

export function hasAgeLimits(option: PriceOptionAgeLimits): boolean {
  return option.minAge != null || option.maxAge != null;
}

/**
 * Die Grenzen als Text, so wie sie in Listen und hinter dem Kategoriennamen
 * stehen: „ab 18 Jahren", „bis 17 Jahre", „12–17 Jahre". `null`, wenn die
 * Kategorie keine Grenzen hat.
 */
export function priceOptionAgeLabel(
  option: PriceOptionAgeLimits,
): string | null {
  const { minAge, maxAge } = option;
  if (minAge != null && maxAge != null) return `${minAge}–${maxAge} Jahre`;
  if (minAge != null) return `ab ${minAge} Jahren`;
  if (maxAge != null) return `bis ${maxAge} Jahre`;
  return null;
}

/**
 * Passt das Alter in die Kategorie? Ein unbekanntes Alter (`null`) gilt als
 * passend: ohne Geburtsdatum gibt es nichts zu beanstanden, und die Pflicht
 * zum Geburtsdatum hängt ohnehin an einer eigenen Prüfung.
 */
export function isAgeWithinPriceOption(
  option: PriceOptionAgeLimits,
  age: number | null,
): boolean {
  if (age == null) return true;
  if (option.minAge != null && age < option.minAge) return false;
  if (option.maxAge != null && age > option.maxAge) return false;
  return true;
}

/** Kurzform für „Geburtsdatum passt in Kategorie", ohne Zwischenschritt. */
export function isBirthDateWithinPriceOption(
  option: PriceOptionAgeLimits,
  birthDate: Date | string | null | undefined,
  referenceDate: Date | string,
): boolean {
  return isAgeWithinPriceOption(option, ageOnDate(birthDate, referenceDate));
}

/**
 * Warum das Alter nicht passt — als fertiger Satz für Formular und Server.
 * `null`, wenn es passt.
 */
export function priceOptionAgeMismatchMessage(
  option: PriceOptionAgeLimits & { label: string },
  age: number | null,
): string | null {
  // Ohne Grenzen kann nichts danebenliegen, also kommt hier nur eine
  // Kategorie an, die mindestens eine der beiden gesetzt hat.
  if (isAgeWithinPriceOption(option, age)) return null;

  // Erst die Regel, dann der Wert, an dem sie scheitert. Der zweite Teil ist
  // bewusst eine Beschriftung und kein Satz: ein Satz bräuchte ein Subjekt,
  // und das ist hier je nach Aufrufer der Teilnehmer, sein Name oder gar
  // nichts. Wo der Name gebraucht wird, stellt ihn der Aufrufer voran.
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

/** Die Kategorien, die für dieses Alter überhaupt in Frage kommen. */
export function priceOptionsForAge<T extends PriceOptionAgeLimits>(
  options: readonly T[],
  age: number | null,
): T[] {
  return options.filter((option) => isAgeWithinPriceOption(option, age));
}

/**
 * Welche Kategorie nach einer Änderung des Geburtsdatums gelten soll.
 *
 * Passt die bisherige weiterhin, bleibt sie stehen — an einer einmal
 * getroffenen Wahl wird nicht herumgeschoben. Passt sie nicht mehr und bleibt
 * genau eine übrig, wird die genommen: eine Auswahl mit nur einer gültigen
 * Antwort ist keine Auswahl, und der Preis steht sichtbar daneben. Bei
 * mehreren Möglichkeiten bleibt es bei der bisherigen; welche gemeint ist,
 * weiß nur der Mensch davor, und die Prüfung sagt ihm, dass er wählen muss.
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

/**
 * Prüft die Grenzen einer Kategorie beim Anlegen/Bearbeiten eines Kurses.
 * Gibt die Fehlermeldung zurück oder `null`.
 */
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

/** Dieselbe Prüfung über alle Kategorien eines Kurses hinweg. */
export function validatePriceOptionAgeRanges(
  options: ReadonlyArray<PriceOptionAgeLimits & { label?: string }>,
): string | null {
  for (const option of options) {
    const message = validatePriceOptionAgeRange(option);
    if (message) return message;
  }
  return null;
}
