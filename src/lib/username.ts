/**
 * Die Regeln stammen aus dem username-Plugin von better-auth: es prüft gegen
 * `[a-zA-Z0-9_.]` (kein Bindestrich!), 3–30 Zeichen, und vergleicht die
 * Eindeutigkeit kleingeschrieben. Wer hier abweicht, baut Vorschläge, die die
 * Registrierung erst beim Absenden ablehnt.
 */

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;

const ALLOWED_PATTERN = /^[a-z0-9_.]+$/;

/** Für Eingabefelder: dasselbe Zeicheninventar, aber auch in Großschreibung. */
export const USERNAME_INPUT_PATTERN = "[a-zA-Z0-9_.]+";

export const USERNAME_HINT =
  "Nur Buchstaben, Zahlen, Unterstrich und Punkt erlaubt";

/** Wie better-auth: kleingeschrieben, damit Anzeige und Eindeutigkeit übereinstimmen. */
export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

/** Der erste Verstoß als fertiger Satz fürs Formular, sonst `null`. */
export function describeUsernameProblem(value: string): string | null {
  const username = normalizeUsername(value);

  if (username.length < USERNAME_MIN_LENGTH) {
    return `Mindestens ${USERNAME_MIN_LENGTH} Zeichen`;
  }
  if (username.length > USERNAME_MAX_LENGTH) {
    return `Höchstens ${USERNAME_MAX_LENGTH} Zeichen`;
  }
  if (!ALLOWED_PATTERN.test(username)) {
    return USERNAME_HINT;
  }
  return null;
}

/** Umlaute und ß ausgeschrieben, alles andere fällt weg. */
function slugPart(part: string): string {
  return part
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Vorschlag „vorname.nachname“. Zu lange Namen kürzen hinten, damit der
 * Vorname lesbar bleibt — ungekürzt lehnt better-auth ab 31 Zeichen ab.
 */
export function suggestUsername(firstName: string, lastName: string): string {
  const first = slugPart(firstName);
  const last = slugPart(lastName);

  if (!first || !last) {
    return (first || last).slice(0, USERNAME_MAX_LENGTH);
  }

  const combined = `${first}.${last}`;
  if (combined.length <= USERNAME_MAX_LENGTH) {
    return combined;
  }

  const roomForLast = USERNAME_MAX_LENGTH - first.length - 1;
  if (roomForLast >= 1) {
    return `${first}.${last.slice(0, roomForLast)}`;
  }
  return combined.slice(0, USERNAME_MAX_LENGTH).replace(/\.$/, "");
}
