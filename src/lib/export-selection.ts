import { slugify } from "@/lib/slug";

/**
 * Auswahl einzelner Einträge für `/api/export/[type]?ids=…`.
 *
 * Ohne `ids` bleibt der Export, was er war: der ganze Bestand. Mit `ids` wird
 * dieselbe ZIP-Struktur nur für die genannten Einträge geschrieben, damit der
 * bestehende Import sie ohne Sonderweg liest.
 */

/**
 * Inhaltstypen, deren Export sich einschränken lässt. Bewusst eine feste
 * Liste: Bei den übrigen Typen würde `ids` sonst still ignoriert und der
 * ganze Bestand käme heraus — genau das, was die Auswahl verhindern soll.
 */
export const SELECTABLE_EXPORT_TYPES = ["posts", "events", "courses"] as const;
export type SelectableExportType = (typeof SELECTABLE_EXPORT_TYPES)[number];

/** Obergrenze, damit eine Adresszeile nicht zur Datenbankabfrage ohne Maß wird. */
export const MAX_EXPORT_SELECTION = 100;

/**
 * Nicht auf UUIDs beschränkt: Ältere oder von Hand angelegte Datensätze tragen
 * auch sprechende ids. Das Muster hält nur Trennzeichen und Überlängen fern.
 */
const ID_PATTERN = /^[A-Za-z0-9_-]{1,100}$/;

export type ExportSelection =
  { ok: true; ids: string[] | null } | { ok: false; error: string };

export function isSelectableExportType(
  type: string,
): type is SelectableExportType {
  return (SELECTABLE_EXPORT_TYPES as readonly string[]).includes(type);
}

/**
 * Liest die Auswahl aus den `ids`-Parametern (`searchParams.getAll("ids")`).
 * Erlaubt sind kommagetrennte Listen und wiederholte Parameter.
 *
 * `ids: null` heißt „alles exportieren“. Ein vorhandener, aber leerer
 * Parameter ist dagegen ein Fehler — sonst würde `?ids=` aus einer kaputt
 * zusammengesetzten Adresse still den kompletten Bestand liefern.
 */
export function parseExportSelection(
  type: string,
  rawValues: readonly string[],
): ExportSelection {
  if (rawValues.length === 0) return { ok: true, ids: null };

  if (!isSelectableExportType(type)) {
    return {
      ok: false,
      error: `Für „${type}“ gibt es keinen Export einzelner Einträge.`,
    };
  }

  const ids = [
    ...new Set(
      rawValues
        .flatMap((value) => value.split(","))
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ];

  if (ids.length === 0) {
    return { ok: false, error: "Die Auswahl (ids) ist leer." };
  }

  if (ids.length > MAX_EXPORT_SELECTION) {
    return {
      ok: false,
      error: `Höchstens ${MAX_EXPORT_SELECTION} Einträge auf einmal exportieren.`,
    };
  }

  const invalid = ids.find((id) => !ID_PATTERN.test(id));
  if (invalid !== undefined) {
    return { ok: false, error: `Ungültige id: ${invalid.slice(0, 100)}` };
  }

  return { ok: true, ids };
}

/**
 * Die angefragten ids, zu denen die Datenbank keinen Eintrag geliefert hat.
 * Ein Export, der einen Teil der Auswahl stillschweigend weglässt, sähe aus
 * wie ein vollständiger — deshalb scheitert er lieber ganz.
 */
export function findMissingIds(
  requested: readonly string[],
  found: ReadonlyArray<{ id: string }>,
): string[] {
  const foundIds = new Set(found.map((entry) => entry.id));
  return requested.filter((id) => !foundIds.has(id));
}

/**
 * Dateiname des ZIP. Der Gesamtexport behält seinen bisherigen Namen; ein
 * Einzelexport trägt den Slug (oder, wo keiner gesetzt ist, den Titel), damit
 * man im Download-Ordner erkennt, welcher Termin darin steckt. `-export-` steht
 * vor dem Datum, weil Slugs selbst oft auf eine Jahreszahl enden.
 *
 * Alles läuft durch `slugify`: Der Name landet ungeschützt im
 * `Content-Disposition`-Header und darf weder Anführungszeichen noch
 * Nicht-ASCII enthalten.
 */
export function buildExportFilename(
  type: string,
  date: string,
  selected: ReadonlyArray<{
    id: string;
    slug?: string | null;
    title?: string | null;
  }> | null,
): string {
  if (!selected) return `${type}-export-${date}.zip`;

  if (selected.length === 1) {
    const [entry] = selected;
    const name =
      slugify(entry?.slug ?? "") ||
      slugify(entry?.title ?? "") ||
      slugify(entry?.id ?? "") ||
      "eintrag";
    return `${type}-${name}-export-${date}.zip`;
  }

  return `${type}-auswahl-${selected.length}-export-${date}.zip`;
}
