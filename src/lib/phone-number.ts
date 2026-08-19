/**
 * House format for phone numbers: area code, one space, subscriber number
 * without further grouping — "0176 22994781" (DIN 5008).
 *
 * The split between area code and subscriber number cannot be derived from
 * the digits alone (German area codes run from three to five digits, and
 * mobile prefixes from four to five), so it is taken from wherever the author
 * put the separator. Input without any separator is therefore left unsplit
 * rather than guessed at.
 */

/** Whatever an author may have typed between the two halves. */
const SEPARATOR = "[\\s./-]";

export function formatPhoneNumber(value: string): string {
  // Non-breaking spaces travel in from spreadsheet exports.
  const cleaned = value.replace(/ /g, " ").trim();
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

  const parts = new RegExp(`^(\\d+)${SEPARATOR}+(.*)$`).exec(national);
  if (!parts) {
    // No separator to split on: keep the digits as they are.
    return `${prefix}${national.replace(/\s+/g, " ").trim()}`;
  }

  const [, areaCode = "", subscriber = ""] = parts;
  const subscriberDigits = subscriber.replace(/\D/g, "");
  if (!subscriberDigits) return `${prefix}${areaCode}`;

  return `${prefix}${areaCode} ${subscriberDigits}`;
}

/** Convenience for the nullable phone columns. */
export function formatPhoneNumberOrNull(
  value: string | null | undefined,
): string | null {
  if (value === null || value === undefined) return null;
  const formatted = formatPhoneNumber(value);
  return formatted || null;
}
