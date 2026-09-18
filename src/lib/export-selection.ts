import { slugify } from "@/lib/slug";

/**
 * Auswahl einzelner Einträge für `/api/export/[type]?ids=…`; dieselbe ZIP-Struktur
 * wie der Gesamtexport, damit der Import sie ohne Sonderweg liest.
 */

/** Feste Liste: bei anderen Typen würde `ids` still ignoriert und alles exportiert. */
export const SELECTABLE_EXPORT_TYPES = ["posts", "events", "courses"] as const;
export type SelectableExportType = (typeof SELECTABLE_EXPORT_TYPES)[number];

/** Obergrenze, damit eine Adresszeile nicht zur Datenbankabfrage ohne Maß wird. */
export const MAX_EXPORT_SELECTION = 100;

/** Nicht auf UUIDs beschränkt: ältere Datensätze tragen auch sprechende ids. */
const ID_PATTERN = /^[A-Za-z0-9_-]{1,100}$/;

export type ExportSelection =
  { ok: true; ids: string[] | null } | { ok: false; error: string };

export function isSelectableExportType(
  type: string,
): type is SelectableExportType {
  return (SELECTABLE_EXPORT_TYPES as readonly string[]).includes(type);
}

/**
 * `ids: null` heißt „alles exportieren“. Ein vorhandener, aber leerer Parameter ist
 * ein Fehler, sonst lieferte ein kaputtes `?ids=` still den kompletten Bestand.
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

/** Ein Teil-Export sähe vollständig aus — fehlende ids lassen ihn daher ganz scheitern. */
export function findMissingIds(
  requested: readonly string[],
  found: ReadonlyArray<{ id: string }>,
): string[] {
  const foundIds = new Set(found.map((entry) => entry.id));
  return requested.filter((id) => !foundIds.has(id));
}

/**
 * `-export-` steht vor dem Datum, weil Slugs oft auf eine Jahreszahl enden. Alles läuft
 * durch `slugify`: der Name landet ungeschützt im `Content-Disposition`-Header.
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
