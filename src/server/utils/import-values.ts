/**
 * Lesehilfen für Import-Nutzlasten: Ein ZIP ist ungeprüfte Eingabe, jeder Wert
 * wird auf seine Form geprüft, statt ihn blind an Prisma zu reichen.
 */

export function readText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

/** Auch Zahlen als Zeichenkette (Tabellenausgaben); NaN und Unendlich fallen heraus. */
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

/** Unbekannte Werte fallen auf den Standard zurück, statt den Import an Prisma scheitern zu lassen. */
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
 * Folgt dem Status wie beim Freigeben: nur freigegebene Einträge haben einen
 * Veröffentlichungszeitpunkt, notfalls jetzt.
 */
export function readPublishedAt(
  raw: unknown,
  isApproved: boolean,
): Date | null {
  if (!isApproved) return null;
  return readDate(raw) ?? new Date();
}
