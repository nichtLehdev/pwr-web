/**
 * Beschriftungen der Termin-Kategorien für die öffentliche Terminseite.
 *
 * Die Filterleiste arbeitet mit den Klartexten und übersetzt sie in die
 * Datenbankwerte, die Listen gehen den umgekehrten Weg. Beide Richtungen aus
 * derselben Tabelle abzuleiten hält sie zusammen — sonst heißt `OTHER` im
 * Filter "Andere" und in der Liste "Other".
 */
export const EVENT_CATEGORY_MAP: Record<string, string> = {
  Konzert: "KONZERT",
  Gottesdienst: "GOTTESDIENST",
  Probe: "PROBE",
  Andere: "ANDERE",
};

export const COURSE_TYPE_MAP: Record<string, string> = {
  Lehrgang: "LEHRGANG",
  Freizeit: "FREIZEIT",
  Workshop: "WORKSHOP",
  Komponistenportrait: "KOMPONISTENPORTRAIT",
  Veranstaltung: "VERANSTALTUNG",
  Andere: "OTHER",
};

function invert(map: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(map).map(([label, value]) => [value, label]),
  );
}

const EVENT_CATEGORY_LABELS = invert(EVENT_CATEGORY_MAP);
const COURSE_TYPE_LABELS = invert(COURSE_TYPE_MAP);

/** Fällt auf den Rohwert zurück, falls die Datenbank einen neuen Wert kennt. */
export function eventCategoryLabel(category: string): string {
  return EVENT_CATEGORY_LABELS[category] ?? category;
}

export function courseTypeLabel(courseType: string): string {
  return COURSE_TYPE_LABELS[courseType] ?? courseType;
}
