import { z } from "zod";

/**
 * Two house formats for phone numbers, both "grouping half, one space,
 * rest of the digits":
 *
 *   national      "0176 22994781"   (DIN 5008)
 *   international "+49 176 22994781"
 *
 * Which one applies depends on who the number belongs to. Organisational
 * contacts — chors, team, Vorstand, Bezirk, Posaunenwarte — are German
 * throughout and read better nationally. Numbers people enter about
 * themselves (their account, a course registration) can be foreign, so those
 * always carry the country code.
 *
 * The split between area code and subscriber number cannot be derived from
 * the digits alone (German area codes run from three to five digits, and
 * mobile prefixes from four to five), so it is taken from wherever the author
 * put the separator. Input without any separator is therefore left unsplit
 * rather than guessed at.
 */

/** Whatever an author may have typed between the two halves. */
const SEPARATOR = "[\\s./-]";

/** The country these numbers belong to unless they say otherwise. */
const DEFAULT_COUNTRY = "49";

/** Non-breaking spaces travel in from spreadsheet exports. */
function clean(value: string): string {
  return value.replace(/ /g, " ").trim();
}

/** Splits "0176/2299 4781" into its area code and the remaining digits. */
function splitAtSeparator(
  value: string,
): { head: string; tail: string } | null {
  const parts = new RegExp(`^(\\d+)${SEPARATOR}+(.*)$`).exec(value);
  if (!parts) return null;
  const [, head = "", tail = ""] = parts;
  return { head, tail: tail.replace(/\D/g, "") };
}

export function formatPhoneNumber(value: string): string {
  const cleaned = clean(value);
  if (!cleaned) return "";

  let prefix = "";
  let national = cleaned;

  if (cleaned.startsWith("+49")) {
    // Checked before the generic branch: with no space after the code,
    // "+49171/…" would otherwise read as country code 491.
    // A German number is written the German way, not as +49.
    national = `0${cleaned.slice(3).replace(new RegExp(`^${SEPARATOR}*`), "")}`;
  } else {
    const international = new RegExp(`^\\+(\\d{1,3})${SEPARATOR}*(.*)$`).exec(
      cleaned,
    );
    if (international) {
      const [, country = "", rest = ""] = international;
      prefix = `+${country} `;
      national = rest;
    }
  }

  const split = splitAtSeparator(national);
  if (!split) {
    // No separator to split on: keep the digits as they are.
    return `${prefix}${national.replace(/\s+/g, " ").trim()}`;
  }
  if (!split.tail) return `${prefix}${split.head}`;

  return `${prefix}${split.head} ${split.tail}`;
}

/**
 * Always carries a country code, for numbers whose owner may live abroad.
 *
 * A leading 0 is read as the German trunk prefix and "00" as the
 * international one. A foreign number written without a separator keeps its
 * digits untouched: where the country code ends is not decidable, and a wrong
 * split is worse than an unsplit number.
 */
export function formatPhoneNumberInternational(value: string): string {
  const cleaned = clean(value);
  if (!cleaned) return "";

  // "0049 176 …" means the same as "+49 176 …".
  const plussed = cleaned.startsWith("00") ? `+${cleaned.slice(2)}` : cleaned;

  let country = DEFAULT_COUNTRY;
  let rest: string;

  if (plussed.startsWith(`+${DEFAULT_COUNTRY}`)) {
    rest = plussed
      .slice(1 + DEFAULT_COUNTRY.length)
      .replace(new RegExp(`^${SEPARATOR}*`), "");
  } else if (plussed.startsWith("+")) {
    const foreign = new RegExp(`^\\+(\\d{1,3})${SEPARATOR}+(.*)$`).exec(
      plussed,
    );
    if (!foreign) {
      // No separator, so the country code has no discernible end.
      return plussed.replace(/\s+/g, " ").trim();
    }
    country = foreign[1] ?? DEFAULT_COUNTRY;
    rest = foreign[2] ?? "";
  } else {
    // A national number: drop the trunk prefix, the country code replaces it.
    rest = plussed.replace(/^0/, "");
  }

  const split = splitAtSeparator(rest);
  if (!split) {
    const digits = rest.replace(/\D/g, "");
    // Nothing numeric to work with. Returning "+49" here would turn junk into
    // something that reads like a real number, so the value is left alone.
    if (!digits) return cleaned;
    return `+${country} ${digits}`;
  }
  if (!split.tail) return `+${country} ${split.head}`;

  return `+${country} ${split.head} ${split.tail}`;
}

/** Convenience for the nullable phone columns. */
export function formatPhoneNumberOrNull(
  value: string | null | undefined,
): string | null {
  if (value === null || value === undefined) return null;
  return formatPhoneNumber(value) || null;
}

/** As above, for the columns that always keep a country code. */
export function formatPhoneNumberInternationalOrNull(
  value: string | null | undefined,
): string | null {
  if (value === null || value === undefined) return null;
  return formatPhoneNumberInternational(value) || null;
}

/** What the routers have always accepted; kept as the single definition. */
export const PHONE_PATTERN = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/;

/**
 * For organisational contacts. Validates as before and normalises on the way
 * in, so the stored value never depends on how the author typed it.
 */
export const phoneSchema = z
  .string()
  .max(50)
  .regex(PHONE_PATTERN)
  .transform(formatPhoneNumber);

/** For numbers people enter about themselves; may be foreign. */
export const internationalPhoneSchema = z
  .string()
  .max(50)
  .regex(PHONE_PATTERN)
  .transform(formatPhoneNumberInternational);

/**
 * Normalises without validating, for the organisational forms that never
 * checked the pattern. Adding the regex there would start rejecting entries
 * that have always been accepted — "0211 12345 (mobil)" and the like — so
 * these only get the formatting. formatPhoneNumber passes anything it cannot
 * parse straight through.
 */
export const lenientPhoneSchema = z
  .string()
  .max(50)
  .transform(formatPhoneNumber);
