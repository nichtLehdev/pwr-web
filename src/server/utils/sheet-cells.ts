import "server-only";

import ExcelJS from "exceljs";

/**
 * Lesehilfen für die Excel-Tabellen der Geschäftsstelle. Die Tabellen sind
 * gewachsen, nicht genormt: Zellen können Text, Zahl, Hyperlink, Rich Text oder
 * Formel sein, Farben stehen mal als RGB, mal als alter Paletten-Index.
 */

export class SheetError extends Error {}

export async function loadWorkbook(
  buffer: ArrayBuffer | Uint8Array,
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(
      buffer instanceof Uint8Array
        ? (buffer.buffer.slice(
            buffer.byteOffset,
            buffer.byteOffset + buffer.byteLength,
          ) as ArrayBuffer)
        : buffer,
    );
  } catch {
    throw new SheetError(
      "Die Datei konnte nicht als Excel-Tabelle (.xlsx) gelesen werden.",
    );
  }
  return workbook;
}

/** Eine Excel-Zelle als Text — Hyperlinks, Rich Text und Formelergebnisse eingeschlossen. */
export function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("richText" in value) {
      return value.richText
        .map((part) => part.text)
        .join("")
        .trim();
    }
    if ("text" in value && typeof value.text === "string") {
      return value.text.trim();
    }
    if ("result" in value) return cellText(value.result as ExcelJS.CellValue);
    if ("error" in value) return "";
  }
  return "";
}

/** Zahl oder Formelergebnis; Text in deutscher Schreibweise wird gelesen. */
export function cellNumber(value: ExcelJS.CellValue): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  if (typeof value === "object" && !(value instanceof Date)) {
    if ("result" in value) return cellNumber(value.result as ExcelJS.CellValue);
    if ("formula" in value || "sharedFormula" in value) return null;
  }
  const text = cellText(value).replace(/\s|€/g, "");
  if (!text) return null;
  // Deutsche Schreibweise: Punkt als Tausender-, Komma als Dezimaltrenner.
  const normalized = text.includes(",")
    ? text.replace(/\./g, "").replace(",", ".")
    : text;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

/** Nur die eigene Formel, nicht die einer geteilten Formel. */
export function cellFormula(value: ExcelJS.CellValue): string | null {
  if (value && typeof value === "object" && "formula" in value) {
    return typeof value.formula === "string" ? value.formula : null;
  }
  return null;
}

/** Formel einer Zelle, auch wenn sie als geteilte Formel von oben übernommen ist. */
export function cellAnyFormula(cell: ExcelJS.Cell): string | null {
  const value = cell.value;
  if (!value || typeof value !== "object") return null;
  if (!("formula" in value) && !("sharedFormula" in value)) return null;
  return typeof cell.formula === "string" ? cell.formula : null;
}

/** Rot aus Excels alter Indexpalette: 2 und 10 sind #FF0000, 16 ist #800000. */
const RED_INDEXED_COLORS = new Set([2, 10, 16]);

/** ExcelJS liest `indexed` mit, kennt es aber nicht im Typ. */
type SheetColor = { argb?: string; indexed?: number };

/**
 * Rot, Dunkelrot und das blasse Rot von „Schlecht“ — aber nicht Orange, Rosa-Violett
 * oder Grau. Designfarben (`theme`) bleiben außen vor: ohne das Design der Mappe
 * ist nicht zu sagen, welche Farbe sie sind.
 */
export function isRedColor(color: unknown, minLead: number): boolean {
  if (!color || typeof color !== "object") return false;
  const { argb, indexed } = color as SheetColor;
  if (indexed !== undefined) return RED_INDEXED_COLORS.has(indexed);
  if (!argb || !/^[0-9a-f]{8}$/i.test(argb)) return false;
  const r = parseInt(argb.slice(2, 4), 16);
  const g = parseInt(argb.slice(4, 6), 16);
  const b = parseInt(argb.slice(6, 8), 16);
  return r >= 0x80 && r - Math.max(g, b) >= minLead && Math.abs(g - b) <= 0x40;
}

/** Rote Füllung (auch das blasse Rot von „Schlecht“). */
export function hasRedFill(cell: ExcelJS.Cell): boolean {
  const fill = cell.fill;
  return (
    fill?.type === "pattern" &&
    fill.pattern !== "none" &&
    isRedColor(fill.fgColor, 0x30)
  );
}

/** Rote Schrift in einer Zelle, die auch etwas zeigt. */
export function hasRedText(cell: ExcelJS.Cell): boolean {
  return Boolean(cellText(cell.value)) && isRedColor(cell.font?.color, 0x50);
}

const EMAIL_PATTERN = /[^\s@<>"';,:()]+@[^\s@<>"';,:()]+\.[A-Za-z]{2,}/g;

/** Alle Adressen einer Zelle, aus Text und mailto-Link, klein geschrieben. */
export function cellEmails(value: ExcelJS.CellValue): string[] {
  const parts: string[] = [cellText(value)];
  if (value && typeof value === "object" && "hyperlink" in value) {
    parts.push(String(value.hyperlink ?? "").replace(/^mailto:/i, ""));
  }
  const found = parts.flatMap((part) => part.match(EMAIL_PATTERN) ?? []);
  return [...new Set(found.map((email) => email.toLowerCase()))];
}

/** "Rg_Strasse" → "rgstrasse", "Chor-Nr." → "chornr", "RückstBeitrag" → "rueckstbeitrag" */
export function headerKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/[^a-z0-9]/g, "");
}

export function textOrNull(text: string): string | null {
  const collapsed = text.replace(/\s+/g, " ").trim();
  return collapsed === "" ? null : collapsed;
}

/** "AB" → 28 */
export function columnNumber(letters: string): number {
  return [...letters.toUpperCase()].reduce(
    (sum, letter) => sum * 26 + letter.charCodeAt(0) - 64,
    0,
  );
}
