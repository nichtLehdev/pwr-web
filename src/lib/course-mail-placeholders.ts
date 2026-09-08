/**
 * Placeholders an organizer can drop into a course mail, e.g.
 * `Hallo {{anmelder.vorname}}, du hast {{teilnehmer.namen}} angemeldet.`
 *
 * Tokens are namespaced (`anmelder.`, `teilnehmer.`, `anmeldung.`, `kurs.`,
 * `rechnung.`) because the flat names could not say whose data they meant:
 * `{{name}}` was the registering person while `{{teilnehmer}}` were the people
 * signed up, and `{{betrag}}` and `{{rechnungsbetrag}}` looked interchangeable.
 *
 * Shared between the dashboard (chip list, client-side validation) and the
 * send mutation (substitution), so the two can never disagree about which
 * tokens exist.
 */

export interface CourseMailPlaceholder {
  /** Token name without braces, always lowercase. */
  token: string;
  label: string;
  /** Shown next to the chip and used as the stand-in in a test send. */
  example: string;
}

export interface CourseMailPlaceholderGroup {
  id: string;
  label: string;
  /** One line telling the organizer whose data this group holds. */
  description: string;
  placeholders: CourseMailPlaceholder[];
}

export const COURSE_MAIL_PLACEHOLDER_GROUPS: CourseMailPlaceholderGroup[] = [
  {
    id: "anmelder",
    label: "Anmelder:in",
    description: "Die Person, an die diese E-Mail geht.",
    placeholders: [
      { token: "anmelder.vorname", label: "Vorname", example: "Anna" },
      { token: "anmelder.nachname", label: "Nachname", example: "Muster" },
      { token: "anmelder.name", label: "Voller Name", example: "Anna Muster" },
      {
        token: "anmelder.email",
        label: "E-Mail",
        example: "anna@example.org",
      },
      { token: "anmelder.strasse", label: "Straße", example: "Musterweg 1" },
      { token: "anmelder.plz", label: "PLZ", example: "50667" },
      { token: "anmelder.ort", label: "Wohnort", example: "Köln" },
      {
        token: "anmelder.anschrift",
        label: "Anschrift komplett",
        example: "Musterweg 1, 50667 Köln",
      },
    ],
  },
  {
    id: "anmeldung",
    label: "Anmeldung",
    description: "Wen die Anmelder:in angemeldet hat.",
    placeholders: [
      {
        token: "teilnehmer.namen",
        label: "Angemeldete Personen",
        example: "Ben Muster und Clara Muster",
      },
      { token: "teilnehmer.anzahl", label: "Anzahl Personen", example: "2" },
      {
        token: "teilnehmer.instrumente",
        label: "Instrumente",
        example: "Trompete und Posaune",
      },
      {
        token: "anmeldung.betrag",
        label: "Kursbeitrag gesamt",
        example: "120,00 €",
      },
    ],
  },
  {
    id: "kurs",
    label: "Kurs",
    description: "Daten des Kurses, um den es geht.",
    placeholders: [
      {
        token: "kurs.titel",
        label: "Kurstitel",
        example: "Jungbläserfreizeit 2026",
      },
      { token: "kurs.beginn", label: "Beginn", example: "02.10.2026" },
      { token: "kurs.ende", label: "Ende", example: "05.10.2026" },
      {
        token: "kurs.ort",
        label: "Veranstaltungsort",
        example: "Haus Sonnenschein, Bonn",
      },
    ],
  },
  {
    id: "rechnung",
    label: "Rechnung",
    description: "Leer, solange keine Rechnung gestellt wurde.",
    placeholders: [
      {
        token: "rechnung.nummer",
        label: "Rechnungsnummer",
        example: "RE-2026-00042",
      },
      {
        token: "rechnung.betrag",
        label: "Rechnungsbetrag",
        example: "120,00 €",
      },
      {
        token: "rechnung.zahlungsziel",
        label: "Zahlungsziel",
        example: "30.10.2026",
      },
    ],
  },
];

export const COURSE_MAIL_PLACEHOLDERS: CourseMailPlaceholder[] =
  COURSE_MAIL_PLACEHOLDER_GROUPS.flatMap((group) => group.placeholders);

/**
 * The flat tokens this feature shipped with. Kept working — but no longer
 * offered — so drafts and archived mails written before the rename still
 * resolve instead of mailing a literal `{{vorname}}`.
 */
export const COURSE_MAIL_PLACEHOLDER_ALIASES: Record<string, string> = {
  vorname: "anmelder.vorname",
  nachname: "anmelder.nachname",
  name: "anmelder.name",
  email: "anmelder.email",
  strasse: "anmelder.strasse",
  plz: "anmelder.plz",
  ort: "anmelder.ort",
  adresse: "anmelder.anschrift",
  teilnehmer: "teilnehmer.namen",
  anzahl: "teilnehmer.anzahl",
  instrumente: "teilnehmer.instrumente",
  betrag: "anmeldung.betrag",
  kurs: "kurs.titel",
  beginn: "kurs.beginn",
  ende: "kurs.ende",
  kursort: "kurs.ort",
  rechnungsnummer: "rechnung.nummer",
  rechnungsbetrag: "rechnung.betrag",
  zahlungsziel: "rechnung.zahlungsziel",
};

const KNOWN_TOKENS = new Set(
  COURSE_MAIL_PLACEHOLDERS.map((placeholder) => placeholder.token),
);

/** `{{ anmelder.vorname }}` — whitespace tolerated, matching is case-insensitive. */
const PLACEHOLDER_PATTERN = /\{\{\s*([a-zA-Z]+(?:\.[a-zA-Z]+)*)\s*\}\}/g;

export type PlaceholderValues = Record<string, string>;

/** The current token behind a written one, or `null` if we cannot fill it. */
function resolveToken(rawToken: string): string | null {
  const token = rawToken.toLowerCase();
  if (KNOWN_TOKENS.has(token)) return token;
  return COURSE_MAIL_PLACEHOLDER_ALIASES[token] ?? null;
}

/**
 * Tokens used in the text that we cannot fill. Returned so the composer can
 * refuse to send rather than mailing a literal `{{teilnehmerX}}` to everyone.
 */
export function findUnknownPlaceholders(text: string): string[] {
  const unknown = new Set<string>();
  for (const match of text.matchAll(PLACEHOLDER_PATTERN)) {
    if (!resolveToken(match[1]!)) unknown.add(match[1]!);
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
    const token = resolveToken(rawToken);
    if (!token) return match;
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
