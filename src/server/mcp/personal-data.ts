/**
 * Personenbezogene Daten verlassen den MCP-Server nicht: Was ein KI-Client
 * liest, geht an den Anbieter des Modells. Die Werkzeuge nutzen dieselben
 * Prozeduren wie die Webseite, die oft ganze Personen mitliefern (Autorin,
 * Chorleitung, Obleute); diese Felder werden hier aus jedem Ergebnis
 * entfernt. Namen bleiben, damit der Client Personen zuordnen kann.
 *
 * Teilnehmende und Anmeldungen sind strenger geschützt: Ihre Datensätze
 * fallen komplett weg, auch der Name. Übrig bleiben nur Zahlen (z. B.
 * `_count.participants`, `registrationStats`).
 */

/** Kontakt-, Login- und Privatfelder, gleich wo sie stehen. */
const PERSONAL_KEY =
  /email|phone|^(registrant|billing|guardian)|^(firstName|lastName|username|displayUsername|birthDate|bio|preferences|password|token|ipAddress|userAgent|twoFactorEnabled|lastLoginAt|iban|bic|accountHolder)$/i;

/**
 * Anschriftsfelder: bei Personen privat, bei Veranstaltungsorten öffentlich.
 * Auch mit Präfix (`conductorStreet`, `representativeZipCode`); die
 * Großschreibung verhindert Treffer wie `capacity`.
 */
const ADDRESS_KEY =
  /^(street|zipCode|city|address)$|(Street|ZipCode|City|Address)$/;

/**
 * Relationen, die Anmeldungen, Teilnehmende, Rechnungen oder Mails an sie
 * enthalten. Als Liste/Objekt fallen sie weg; eine reine Anzahl bleibt.
 */
const PARTICIPANT_RELATION_KEY =
  /^(registrations?|courseRegistrations|participants?|savedParticipants|registrationGroups?|invoices?|waitlist\w*|promotionOffers?|courseMails?|recipients?)$/i;

/**
 * Datensätze von Teilnehmenden (`Participant`, `SavedParticipant`) und
 * Anmeldungen (`CourseRegistration`), egal unter welchem Schlüssel sie stehen.
 */
function isParticipantRecord(record: Record<string, unknown>): boolean {
  return (
    "registrationId" in record ||
    "registrationStatus" in record ||
    "registrantFirstName" in record ||
    "siblingGroupId" in record ||
    ("instrument" in record && "birthDate" in record)
  );
}

/** Orte (Location) erkennt man an ihren Geodaten bzw. dem Ortszusatz. */
function isVenue(record: Record<string, unknown>): boolean {
  return (
    "latitude" in record || "longitude" in record || "additionalInfo" in record
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value) as unknown;
  return prototype === Object.prototype || prototype === null;
}

const REMOVED = Symbol("removed");

function strip(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(strip).filter((item) => item !== REMOVED);
  }
  // Date, Prisma-Decimal usw. bleiben, wie sie sind (eigenes toJSON).
  if (!isPlainObject(value)) return value;
  if (isParticipantRecord(value)) return REMOVED;

  const venue = isVenue(value);
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (PERSONAL_KEY.test(key)) continue;
    if (!venue && ADDRESS_KEY.test(key)) continue;
    if (
      PARTICIPANT_RELATION_KEY.test(key) &&
      item !== null &&
      typeof item === "object"
    ) {
      continue;
    }
    const stripped = strip(item);
    if (stripped !== REMOVED) result[key] = stripped;
  }
  return result;
}

export function stripPersonalData(value: unknown): unknown {
  const stripped = strip(value);
  return stripped === REMOVED ? null : stripped;
}
