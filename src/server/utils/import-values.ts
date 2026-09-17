/**
 * Lesehilfen für Import-Nutzlasten.
 *
 * Ein ZIP ist ungeprüfte Eingabe: Es kann aus einer älteren Ausgabe stammen,
 * von Hand geschrieben oder aus einer Tabelle zusammengesetzt sein. Jeder Wert
 * wird deshalb auf seine Form geprüft, statt ihn blind an Prisma zu reichen —
 * ein einziger falscher Typ ließe sonst den ganzen Import scheitern.
 *
 * Alles hier ist rein und ohne Datenbank, damit die Leseregeln einzeln
 * prüfbar bleiben.
 */

export function readText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

/**
 * JSON-Zahlen, aber auch Zahlen in Anführungszeichen — Tabellenausgaben
 * schreiben Preise gern als Zeichenkette. NaN und Unendlich fallen heraus:
 * damit ließe sich später kein Betrag mehr ausrechnen.
 */
export function readNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** Ganze Zahlen (Teilnehmerzahl, Altersgrenze, Reihenfolge, Dauer). */
export function readInteger(value: unknown): number | null {
  const parsed = readNumber(value);
  return parsed === null ? null : Math.trunc(parsed);
}

/** Datumsangaben stehen im Export als ISO-Zeichenkette. */
export function readDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

/**
 * Nur Werte, die das Schema kennt. Ein unbekannter Wert — aus einer älteren
 * Ausgabe oder einem fremden System — fällt auf den Standard zurück, statt den
 * Import an einem Prisma-Fehler abbrechen zu lassen.
 */
export function readEnum<T extends Record<string, string>>(
  value: unknown,
  values: T,
  fallback: T[keyof T],
): T[keyof T];
export function readEnum<T extends Record<string, string>>(
  value: unknown,
  values: T,
  fallback: null,
): T[keyof T] | null;
export function readEnum<T extends Record<string, string>>(
  value: unknown,
  values: T,
  fallback: T[keyof T] | null,
): T[keyof T] | null {
  const text = readText(value);
  if (text && (Object.values(values) as string[]).includes(text)) {
    return text as T[keyof T];
  }
  return fallback;
}

/**
 * Der Veröffentlichungszeitpunkt hängt am Status: Die Router setzen ihn beim
 * Freigeben und löschen ihn beim Zurückziehen. Ein Import, der ihn ungeprüft
 * übernähme, könnte einen Entwurf mit Veröffentlichungsdatum erzeugen; einer,
 * der ihn wegließe, einen freigegebenen Eintrag ohne — im Dashboard stünde
 * dann nichts in der Spalte „Veröffentlicht“. Also gilt dieselbe Regel wie
 * beim Freigeben, mit dem ausgegebenen Zeitpunkt, wo er mitkam.
 */
export function readPublishedAt(
  raw: unknown,
  isApproved: boolean,
): Date | null {
  if (!isApproved) return null;
  return readDate(raw) ?? new Date();
}
