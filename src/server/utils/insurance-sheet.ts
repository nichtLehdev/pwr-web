import "server-only";

import type ExcelJS from "exceljs";
import {
  SheetError,
  cellEmails,
  cellFormula,
  cellNumber,
  cellText,
  hasRedFill,
  hasRedText,
  headerKey,
  loadWorkbook,
  textOrNull,
} from "./sheet-cells";
import type { InsuranceQuantity } from "@/lib/insurance-billing";

/**
 * Liest die Versicherungstabelle der Geschäftsstelle. Das Format ist gewachsen,
 * nicht genormt: Spalten werden über ihre Überschrift gefunden, nicht über
 * ihren Buchstaben, und alles Unklare landet als Hinweis statt als Abbruch.
 *
 * Erwartet (Blatt "Aktuell", sonst das erste passende Blatt):
 *   Zeile 1: Chor-Nr. | Rgn_Name1 | Rg_Name2 | Rg_Strasse | Rgn_Ort | Kommentar (E-Mail)
 *            | Chor | Instrumente | bis 1.250 EUR | Instrumente | bis 2.500 EUR | … | Gesamt | LetzteMeldung
 *   Zeile 2: unter jeder Wertklasse die Nettoprämie, z.B. "x 6,00 EUR"
 *   ab Zeile 3: ein Chor je Zeile; Zeilen ohne Chor-Nr. werden übergangen.
 */

/** Dieselbe Klasse wie `SheetError`; der Name bleibt für die Aufrufer. */
export const InsuranceSheetError = SheetError;

export interface ParsedInsuranceCategory {
  maxValue: number;
  /** Nettoprämie laut Tabelle, null wenn sie dort nicht lesbar steht. */
  sheetNetPremium: number | null;
}

export interface ParsedInsuranceRow {
  sheetRow: number;
  choirNumber: string;
  choirName: string | null;
  recipientName1: string | null;
  recipientName2: string | null;
  recipientStreet: string | null;
  recipientCity: string | null;
  email: string | null;
  quantities: InsuranceQuantity[];
  sheetTotal: number | null;
  sheetNote: string | null;
  /** Rot markiert: so kennzeichnet die Geschäftsstelle Chöre ohne Rechnung. */
  markedRed: boolean;
  warnings: string[];
}

export interface ParsedInsuranceSheet {
  sheetName: string;
  categories: ParsedInsuranceCategory[];
  /** Aus den Formeln gelesener Steuersatz (z.B. 0.19 aus "*1.19"), sonst null. */
  sheetTaxRate: number | null;
  rows: ParsedInsuranceRow[];
}

const CATEGORY_PATTERN = /bis\s*([\d.\s]+)\s*(?:eur|€)/i;
const PRICE_PATTERN = /(\d+(?:[.,]\d+)?)\s*(?:eur|€)/i;
/** "SUM(I3*6*1.19)" → Preis 6, Faktor 1.19 */
const FORMULA_PATTERN = /\*\s*(\d+(?:\.\d+)?)\s*\*\s*(1\.\d+)/;

/**
 * Sichtbar rot: rote Schrift in einer Zelle mit Inhalt oder eine rote Füllung.
 * Eine rot formatierte, aber leere Zelle zählt nicht — in der echten Tabelle
 * gibt es solche Reste, die niemand sieht.
 */
function isMarkedRed(row: ExcelJS.Row): boolean {
  let red = false;
  row.eachCell({ includeEmpty: true }, (cell) => {
    if (!red && (hasRedFill(cell) || hasRedText(cell))) red = true;
  });
  return red;
}

interface ColumnMap {
  choirNumber: number;
  choirName?: number;
  name1?: number;
  name2?: number;
  street?: number;
  city?: number;
  email?: number;
  total?: number;
  note?: number;
  categories: { maxValue: number; priceColumn: number; countColumn: number }[];
}

function findHeaderRow(sheet: ExcelJS.Worksheet): number | null {
  const lastRow = Math.min(sheet.rowCount, 10);
  for (let r = 1; r <= lastRow; r++) {
    let hasCategory = false;
    sheet.getRow(r).eachCell((cell) => {
      if (CATEGORY_PATTERN.test(cellText(cell.value))) hasCategory = true;
    });
    if (hasCategory) return r;
  }
  return null;
}

function mapColumns(sheet: ExcelJS.Worksheet, headerRow: number): ColumnMap {
  const map: Partial<ColumnMap> & { categories: ColumnMap["categories"] } = {
    categories: [],
  };
  const row = sheet.getRow(headerRow);

  row.eachCell((cell, col) => {
    const text = cellText(cell.value);
    const key = headerKey(text);
    const category = CATEGORY_PATTERN.exec(text);

    if (category) {
      const maxValue = Number(category[1]!.replace(/[.\s]/g, ""));
      const left =
        col > 1 ? headerKey(cellText(row.getCell(col - 1).value)) : "";
      if (Number.isFinite(maxValue) && maxValue > 0 && left) {
        map.categories.push({
          maxValue,
          priceColumn: col,
          countColumn: col - 1,
        });
      }
      return;
    }
    // Die erste Chor-Nr.-Spalte zählt; die zweite wiederholt sie als "Nr. …".
    if (key === "chornr" || key === "chornummer") {
      map.choirNumber ??= col;
    } else if (key === "chor" || key === "chorname") {
      map.choirName ??= col;
    } else if (key.endsWith("name1")) {
      map.name1 ??= col;
    } else if (key.endsWith("name2")) {
      map.name2 ??= col;
    } else if (key.endsWith("strasse")) {
      map.street ??= col;
    } else if (key.endsWith("ort")) {
      map.city ??= col;
    } else if (key.includes("mail") || key === "kommentar") {
      map.email ??= col;
    } else if (key.startsWith("gesamt")) {
      map.total ??= col;
    } else if (key === "letztemeldung" || key === "bemerkung") {
      map.note ??= col;
    }
  });

  if (map.choirNumber === undefined) {
    throw new InsuranceSheetError(
      "Die Spalte „Chor-Nr.“ wurde in der Kopfzeile nicht gefunden.",
    );
  }
  if (map.categories.length === 0) {
    throw new InsuranceSheetError(
      "Keine Wertklassen gefunden. Erwartet werden Überschriften wie „bis 1.250 EUR“.",
    );
  }
  map.categories.sort((a, b) => a.maxValue - b.maxValue);
  return map as ColumnMap;
}

/** Sucht die Nettoprämie in den Zeilen unter der Kopfzeile ("x 6,00 EUR"). */
function readSheetPrices(
  sheet: ExcelJS.Worksheet,
  headerRow: number,
  columns: ColumnMap,
): Map<number, number> {
  const prices = new Map<number, number>();
  for (
    let r = headerRow + 1;
    r <= Math.min(headerRow + 3, sheet.rowCount);
    r++
  ) {
    const row = sheet.getRow(r);
    for (const category of columns.categories) {
      if (prices.has(category.maxValue)) continue;
      const value = row.getCell(category.priceColumn).value;
      // Eine Formel ist schon eine Datenzeile, kein Preis.
      if (cellFormula(value)) continue;
      const match = PRICE_PATTERN.exec(cellText(value));
      if (match) {
        prices.set(category.maxValue, Number(match[1]!.replace(",", ".")));
      }
    }
  }
  return prices;
}

/** Fallback und Steuersatz aus den Formeln der ersten Datenzeilen ("SUM(I3*6*1.19)"). */
function readFormulaPrices(
  sheet: ExcelJS.Worksheet,
  headerRow: number,
  columns: ColumnMap,
): { prices: Map<number, number>; taxRate: number | null } {
  const prices = new Map<number, number>();
  let taxRate: number | null = null;
  for (let r = headerRow + 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    for (const category of columns.categories) {
      const formula = cellFormula(row.getCell(category.priceColumn).value);
      const match = formula ? FORMULA_PATTERN.exec(formula) : null;
      if (!match) continue;
      if (!prices.has(category.maxValue)) {
        prices.set(category.maxValue, Number(match[1]));
      }
      taxRate ??= Math.round((Number(match[2]) - 1) * 10000) / 10000;
    }
    if (prices.size === columns.categories.length && taxRate !== null) break;
  }
  return { prices, taxRate };
}

function pickSheet(workbook: ExcelJS.Workbook): {
  sheet: ExcelJS.Worksheet;
  headerRow: number;
} {
  const sheets = [...workbook.worksheets].sort((a, b) => {
    // "Aktuell" zuerst; danach in der Reihenfolge der Mappe.
    const rank = (ws: ExcelJS.Worksheet) =>
      ws.name.trim().toLowerCase() === "aktuell" ? 0 : 1;
    return rank(a) - rank(b);
  });
  for (const sheet of sheets) {
    const headerRow = findHeaderRow(sheet);
    if (headerRow !== null) return { sheet, headerRow };
  }
  throw new InsuranceSheetError(
    "Kein Tabellenblatt mit Wertklassen („bis 1.250 EUR“ …) gefunden.",
  );
}

export async function parseInsuranceSheet(
  buffer: ArrayBuffer | Uint8Array,
): Promise<ParsedInsuranceSheet> {
  const workbook = await loadWorkbook(buffer);

  const { sheet, headerRow } = pickSheet(workbook);
  const columns = mapColumns(sheet, headerRow);
  const labelPrices = readSheetPrices(sheet, headerRow, columns);
  const formula = readFormulaPrices(sheet, headerRow, columns);

  const categories: ParsedInsuranceCategory[] = columns.categories.map(
    (category) => ({
      maxValue: category.maxValue,
      sheetNetPremium:
        labelPrices.get(category.maxValue) ??
        formula.prices.get(category.maxValue) ??
        null,
    }),
  );

  const rows: ParsedInsuranceRow[] = [];
  const seenNumbers = new Map<string, number>();

  for (let r = headerRow + 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const get = (col: number | undefined) =>
      col === undefined ? null : row.getCell(col).value;

    const rawNumber = get(columns.choirNumber);
    // Datumszellen sind Zwischenüberschriften oder Tippfehler, keine Chor-Nr.
    if (rawNumber instanceof Date) continue;
    const choirNumber = cellText(rawNumber)
      .replace(/^nr\.?\s*/i, "")
      .trim();
    if (!choirNumber) continue;

    const warnings: string[] = [];
    const quantities: InsuranceQuantity[] = [];
    for (const category of columns.categories) {
      const value = get(category.countColumn);
      const number = cellNumber(value);
      if (number === null) {
        if (cellText(value)) {
          warnings.push(
            `Anzahl bis ${category.maxValue} € ist keine Zahl („${cellText(value)}“) und wurde als 0 gezählt.`,
          );
        }
        quantities.push({ maxValue: category.maxValue, quantity: 0 });
        continue;
      }
      if (!Number.isInteger(number) || number < 0) {
        warnings.push(
          `Anzahl bis ${category.maxValue} € ist ungültig (${number}) und wurde als 0 gezählt.`,
        );
        quantities.push({ maxValue: category.maxValue, quantity: 0 });
        continue;
      }
      quantities.push({ maxValue: category.maxValue, quantity: number });
    }

    let emails = cellEmails(get(columns.email));
    if (emails.length === 0) {
      // Manche Zeilen führen die Adresse in einer anderen Spalte.
      row.eachCell((cell) => {
        if (emails.length === 0) emails = cellEmails(cell.value);
      });
    }

    const recipientName1 = textOrNull(cellText(get(columns.name1)));
    const recipientStreet = textOrNull(cellText(get(columns.street)));
    const recipientCity = textOrNull(cellText(get(columns.city)));

    if (emails.length === 0) warnings.push("Keine E-Mail-Adresse.");
    if (!recipientName1 || !recipientStreet || !recipientCity) {
      warnings.push("Rechnungsanschrift unvollständig.");
    }
    if (quantities.every((entry) => entry.quantity === 0)) {
      warnings.push("Keine versicherten Instrumente.");
    }

    const previous = seenNumbers.get(choirNumber);
    if (previous !== undefined) {
      warnings.push(`Chor-Nr. steht schon in Zeile ${previous}.`);
    } else {
      seenNumbers.set(choirNumber, r);
    }

    rows.push({
      sheetRow: r,
      choirNumber,
      choirName: textOrNull(cellText(get(columns.choirName))),
      recipientName1,
      recipientName2: textOrNull(cellText(get(columns.name2))),
      recipientStreet,
      recipientCity,
      email: emails.length > 0 ? emails.join(", ") : null,
      quantities,
      sheetTotal: cellNumber(get(columns.total)),
      sheetNote: textOrNull(cellText(get(columns.note))),
      markedRed: isMarkedRed(row),
      warnings,
    });
  }

  return {
    sheetName: sheet.name,
    categories,
    sheetTaxRate: formula.taxRate,
    rows,
  };
}
