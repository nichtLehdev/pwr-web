/**
 * Lesbare Fassung einer fehlgeschlagenen Anmeldung.
 *
 * Schlägt die Eingabeprüfung serverseitig fehl, serialisiert tRPC die
 * Zod-Issues als JSON-Array in `message`. Das ist für Anmelder:innen unlesbar,
 * weshalb die Oberfläche es durch einen allgemeinen Satz ersetzt hat — der
 * aber nicht sagt, was falsch war. Ein erneuter Versuch scheitert dann genauso,
 * und niemand erfährt, an welchem Feld es liegt.
 */

/** Feldnamen aus dem Server-Schema, wie sie im Formular heißen. */
const FIELD_LABELS: Record<string, string> = {
  registrantFirstName: "Vorname",
  registrantLastName: "Nachname",
  registrantEmail: "E-Mail-Adresse",
  registrantPhone: "Telefonnummer",
  registrantStreet: "Straße",
  registrantZipCode: "PLZ",
  registrantCity: "Ort",
  billingCompany: "Firma (Rechnung)",
  billingFirstName: "Vorname (Rechnung)",
  billingLastName: "Nachname (Rechnung)",
  billingStreet: "Straße (Rechnung)",
  billingZipCode: "PLZ (Rechnung)",
  billingCity: "Ort (Rechnung)",
  billingEmail: "E-Mail für Rechnung",
  firstName: "Vorname",
  lastName: "Nachname",
  birthDate: "Geburtsdatum",
  city: "Ort",
  instrument: "Instrument",
  priceOptionId: "Preisoption",
  customFields: "Zusatzangaben",
  notes: "Anmerkungen",
  paymentMethod: "Zahlungsart",
};

export const GENERIC_REGISTRATION_ERROR =
  "Fehler bei der Anmeldung. Bitte versuchen Sie es erneut.";

type ZodIssueLike = { path?: unknown };

/** `["participants", 0, "firstName"]` → `"Teilnehmer 1: Vorname"`. */
function labelForPath(path: unknown): string | null {
  if (!Array.isArray(path) || path.length === 0) return null;

  if (path[0] === "participants" && typeof path[1] === "number") {
    const field = typeof path[2] === "string" ? FIELD_LABELS[path[2]] : null;
    const who = `Teilnehmer ${path[1] + 1}`;
    return field ? `${who}: ${field}` : who;
  }

  const first = path[0];
  return typeof first === "string" ? (FIELD_LABELS[first] ?? null) : null;
}

/**
 * @param raw `error.message` der fehlgeschlagenen Mutation.
 * @returns Die Meldung des Servers, wenn sie für Menschen geschrieben ist
 *   (Kurs voll, Frist abgelaufen, doppelte Anmeldung); sonst die betroffenen
 *   Felder; sonst der allgemeine Satz.
 */
export function registrationErrorMessage(raw: string | undefined): string {
  const message = raw?.trim();
  if (!message) return GENERIC_REGISTRATION_ERROR;

  // Alles, was kein Zod-Array ist, hat der Server selbst formuliert.
  if (!message.startsWith("[")) return message;

  let issues: unknown;
  try {
    issues = JSON.parse(message);
  } catch {
    return GENERIC_REGISTRATION_ERROR;
  }
  if (!Array.isArray(issues)) return GENERIC_REGISTRATION_ERROR;

  const labels: string[] = [];
  for (const issue of issues as ZodIssueLike[]) {
    const label = labelForPath(issue?.path);
    if (label && !labels.includes(label)) labels.push(label);
  }

  if (labels.length === 0) return GENERIC_REGISTRATION_ERROR;

  return `Bitte prüfen Sie ${labels.length === 1 ? "dieses Feld" : "diese Felder"}: ${labels.join(", ")}.`;
}
