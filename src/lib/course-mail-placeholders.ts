/**
 * Placeholders an organizer can drop into a course mail, e.g.
 * `Hallo {{vorname}}, du hast {{teilnehmer}} angemeldet.`
 *
 * Shared between the dashboard (chip list, client-side validation) and the
 * send mutation (substitution), so the two can never disagree about which
 * tokens exist.
 */

export interface CourseMailPlaceholder {
  /** Token name without braces, always lowercase. */
  token: string;
  label: string;
  /** Shown as the chip's tooltip; also the example in the sidebar. */
  example: string;
}

export const COURSE_MAIL_PLACEHOLDERS: CourseMailPlaceholder[] = [
  { token: "vorname", label: "Vorname", example: "Anna" },
  { token: "nachname", label: "Nachname", example: "Muster" },
  { token: "name", label: "Voller Name", example: "Anna Muster" },
  { token: "email", label: "E-Mail", example: "anna@example.org" },
  { token: "strasse", label: "Straße", example: "Musterweg 1" },
  { token: "plz", label: "PLZ", example: "50667" },
  { token: "ort", label: "Wohnort", example: "Köln" },
  {
    token: "adresse",
    label: "Anschrift",
    example: "Musterweg 1, 50667 Köln",
  },
  {
    token: "teilnehmer",
    label: "Angemeldete Personen",
    example: "Ben Muster und Clara Muster",
  },
  { token: "anzahl", label: "Anzahl Personen", example: "2" },
  {
    token: "instrumente",
    label: "Instrumente",
    example: "Trompete und Posaune",
  },
  { token: "kurs", label: "Kurstitel", example: "Jungbläserfreizeit 2026" },
  { token: "beginn", label: "Kursbeginn", example: "02.10.2026" },
  { token: "ende", label: "Kursende", example: "05.10.2026" },
  { token: "kursort", label: "Kursort", example: "Haus Sonnenschein, Bonn" },
  { token: "betrag", label: "Gesamtbetrag", example: "120,00 €" },
];

const KNOWN_TOKENS = new Set(
  COURSE_MAIL_PLACEHOLDERS.map((placeholder) => placeholder.token),
);

/** `{{ vorname }}` — whitespace tolerated, matching is case-insensitive. */
const PLACEHOLDER_PATTERN = /\{\{\s*([a-zA-Z]+)\s*\}\}/g;

export type PlaceholderValues = Record<string, string>;

/**
 * Tokens used in the text that we cannot fill. Returned so the composer can
 * refuse to send rather than mailing a literal `{{teilnehmerX}}` to everyone.
 */
export function findUnknownPlaceholders(text: string): string[] {
  const unknown = new Set<string>();
  for (const match of text.matchAll(PLACEHOLDER_PATTERN)) {
    const token = match[1]!.toLowerCase();
    if (!KNOWN_TOKENS.has(token)) unknown.add(match[1]!);
  }
  return [...unknown];
}

function escapeHtmlValue(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Replace every known placeholder with the recipient's value.
 *
 * Substitution happens *after* the message body was rendered and sanitized,
 * so `escapeHtml` is what keeps a registrant named `<script>` from becoming
 * markup. Unknown tokens are left untouched — callers reject them up front.
 */
export function applyPlaceholders(
  text: string,
  values: PlaceholderValues,
  options: { escapeHtml: boolean },
): string {
  return text.replace(PLACEHOLDER_PATTERN, (match, rawToken: string) => {
    const token = rawToken.toLowerCase();
    if (!KNOWN_TOKENS.has(token)) return match;
    const value = values[token] ?? "";
    return options.escapeHtml ? escapeHtmlValue(value) : value;
  });
}

/** "Anna", "Anna und Ben", "Anna, Ben und Clara" */
export function joinNames(names: string[]): string {
  const cleaned = names.map((name) => name.trim()).filter(Boolean);
  if (cleaned.length === 0) return "";
  if (cleaned.length === 1) return cleaned[0]!;
  return `${cleaned.slice(0, -1).join(", ")} und ${cleaned.at(-1)}`;
}
