import { z } from "zod";

/**
 * National ("0176 22994781", DIN 5008) for organisational contacts, international for
 * numbers people enter about themselves (may be foreign). The area-code split can't be
 * derived from the digits, so it follows the author's separator; without one, no split.
 */

/** Whatever an author may have typed between the two halves. */
const SEPARATOR = "[\\s./-]";

/** The country these numbers belong to unless they say otherwise. */
const DEFAULT_COUNTRY = "49";

/**
 * Strips what spreadsheet exports smuggle in: non-breaking spaces, Excel's bidi
 * marks around "+49 …" and the parentheses of "(0173) 59 33 710".
 */
function clean(value: string): string {
  return value
    .replace(/[\u00a0\u202f]/g, " ")
    .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, "")
    .replace(/[()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
    // Before the generic branch, or "+49171/…" reads as country code 491.
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
 * Always carries a country code. A foreign number without separator stays
 * unsplit: where its country code ends is not decidable.
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
    // Nothing numeric: "+49" would make junk look like a real number.
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

/** For organisational contacts; validates and normalises on the way in. */
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
 * Normalises without validating: these forms never checked the pattern, and entries
 * like "0211 12345 (mobil)" must stay accepted.
 */
export const lenientPhoneSchema = z
  .string()
  .max(50)
  .transform(formatPhoneNumber);
