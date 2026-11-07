import "server-only";

import type ExcelJS from "exceljs";
import type { SheetMembershipRates } from "@/lib/membership-billing";
import {
  SheetError,
  cellAnyFormula,
  cellEmails,
  cellNumber,
  cellText,
  columnNumber,
  hasRedFill,
  hasRedText,
  headerKey,
  loadWorkbook,
  textOrNull,
} from "./sheet-cells";

/**
 * Liest die Mitgliedertabelle der Geschäftsstelle (Blatt „aktuelle“). Spalten
 * werden über ihre Überschrift gefunden, die Beitragssätze aus den Formeln:
 *
 *   StaffBetrag = MitEink * 16 + OhneEink * 8
 *   PCMBetrag   = PosMag * 3
 *   Gesamt      = StaffBetrag + PCMBetrag + RückstBeitrag + 45
 *
 * Steht statt einer Formel eine Zahl, hat die Geschäftsstelle den Betrag von
 * Hand gesetzt: beim Staffelbeitrag meist der Vorjahresbetrag, beim Gesamtbetrag
 * ein Sonderfall — beides wird übernommen und als Hinweis gezeigt. Zeilen ohne
 * Gesamtbetrag (Unternummern, Vorstand, Posaunenwarte …) bekommen keine Rechnung.
 */

export interface ParsedMembershipRow {
  sheetRow: number;
  choirNumber: string;
  choirName: string | null;
  recipientName1: string | null;
  recipientName2: string | null;
  recipientStreet: string | null;
  recipientCity: string | null;
  email: string | null;
  membersWithIncome: number | null;
  membersWithoutIncome: number | null;
  graduatedFeeFixed: number | null;
  magazineCount: number;
  arrears: number;
  sheetTotal: number | null;
  sheetTotalFixed: boolean;
  sheetHasTotal: boolean;
  sheetNote: string | null;
  /** Die ganze Zeile ist rot: so kennzeichnet die Geschäftsstelle „keine Rechnung“. */
  markedRed: boolean;
  warnings: string[];
}

export interface ParsedMembershipSheet {
  sheetName: string;
  rates: SheetMembershipRates;
  rows: ParsedMembershipRow[];
}

interface ColumnMap {
  choirNumber: number;
  choirName?: number;
  name1?: number;
  name2?: number;
  street?: number;
  city?: number;
  email?: number;
  withIncome: number;
  withoutIncome: number;
  graduated: number;
  magazineCount?: number;
  magazineAmount?: number;
  arrears?: number;
  total: number;
  note?: number;
}

const REQUIRED: [keyof ColumnMap, string][] = [
  ["choirNumber", "Chor-Nr."],
  ["withIncome", "MitEink"],
  ["withoutIncome", "OhneEink"],
  ["graduated", "StaffBetrag"],
  ["total", "Gesamt"],
];

function mapHeader(row: ExcelJS.Row): Partial<ColumnMap> {
  const map: Partial<ColumnMap> = {};
  row.eachCell((cell, col) => {
    const key = headerKey(cellText(cell.value));
    const set = (field: keyof ColumnMap) => {
      map[field] ??= col;
    };
    // Die Tabelle führt drei Anschriften (Chor, Chorleitung, Rechnung) —
    // nur die mit „Rg“ ist die Rechnungsanschrift.
    if (key === "chornr" || key === "chornummer") set("choirNumber");
    else if (key === "chorname") set("choirName");
    else if (/^rgn?name1$/.test(key)) set("name1");
    else if (/^rgn?name2$/.test(key)) set("name2");
    else if (/^rgn?stra?sse$/.test(key)) set("street");
    else if (/^rgn?ort$/.test(key)) set("city");
    else if (key === "emailversand") set("email");
    else if (key === "miteink") set("withIncome");
    else if (key === "ohneeink") set("withoutIncome");
    else if (key === "staffbetrag") set("graduated");
    else if (key === "posmag") set("magazineCount");
    else if (key === "pcmbetrag") set("magazineAmount");
    else if (key === "rueckstbeitrag") set("arrears");
    else if (key === "gesamt") set("total");
    else if (key === "kommentar") set("note");
  });
  return map;
}

function pickSheet(workbook: ExcelJS.Workbook): {
  sheet: ExcelJS.Worksheet;
  headerRow: number;
  columns: ColumnMap;
} {
  const sheets = [...workbook.worksheets].sort((a, b) => {
    const rank = (ws: ExcelJS.Worksheet) =>
      /^aktuelle?$/.test(ws.name.trim().toLowerCase()) ? 0 : 1;
    return rank(a) - rank(b);
  });
  let closest: { name: string; missing: string[] } | null = null;
  for (const sheet of sheets) {
    for (let r = 1; r <= Math.min(sheet.rowCount, 10); r++) {
      const map = mapHeader(sheet.getRow(r));
      const missing = REQUIRED.filter(
        ([field]) => map[field] === undefined,
      ).map(([, label]) => label);
      if (missing.length === 0) {
        return { sheet, headerRow: r, columns: map as ColumnMap };
      }
      if (
        missing.length < REQUIRED.length &&
        (!closest || missing.length < closest.missing.length)
      ) {
        closest = { name: sheet.name, missing };
      }
    }
  }
  throw new SheetError(
    closest
      ? `Im Blatt „${closest.name}“ fehlen die Spalten ${closest.missing.map((label) => `„${label}“`).join(", ")}.`
      : "Kein Tabellenblatt mit den Spalten Chor-Nr., MitEink, OhneEink, StaffBetrag und Gesamt gefunden.",
  );
}

/** "Z5*16+AA5*8" → [{ column: 26, factor: 16 }, { column: 27, factor: 8 }]; Konstanten mit column 0. */
function formulaTerms(formula: string): { column: number; factor: number }[] {
  return formula
    .replace(/^=/, "")
    .replace(/\s+/g, "")
    .replace(/^SUM\((.*)\)$/i, "$1")
    .split("+")
    .flatMap((term) => {
      const number = (text: string) => Number(text.replace(",", "."));
      let match = /^\$?([A-Z]+)\$?\d+\*(\d+(?:[.,]\d+)?)$/i.exec(term);
      if (match) {
        return [{ column: columnNumber(match[1]!), factor: number(match[2]!) }];
      }
      match = /^(\d+(?:[.,]\d+)?)\*\$?([A-Z]+)\$?\d+$/i.exec(term);
      if (match) {
        return [{ column: columnNumber(match[2]!), factor: number(match[1]!) }];
      }
      if (/^\d+(?:[.,]\d+)?$/.test(term)) {
        return [{ column: 0, factor: number(term) }];
      }
      return [];
    });
}

/** Sätze aus der ersten lesbaren Formel je Spalte. */
function readRates(
  sheet: ExcelJS.Worksheet,
  headerRow: number,
  columns: ColumnMap,
): SheetMembershipRates {
  const rates: SheetMembershipRates = {
    baseFee: null,
    rateWithIncome: null,
    rateWithoutIncome: null,
    magazinePrice: null,
  };
  for (let r = headerRow + 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const formula = (col: number | undefined) =>
      col === undefined ? null : cellAnyFormula(row.getCell(col));

    const graduated = formula(columns.graduated);
    if (graduated) {
      for (const term of formulaTerms(graduated)) {
        if (term.column === columns.withIncome) {
          rates.rateWithIncome ??= term.factor;
        } else if (term.column === columns.withoutIncome) {
          rates.rateWithoutIncome ??= term.factor;
        }
      }
    }
    const magazine = formula(columns.magazineAmount);
    if (magazine) {
      const term = formulaTerms(magazine).find(
        (entry) => entry.column === columns.magazineCount,
      );
      if (term) rates.magazinePrice ??= term.factor;
    }
    const total = formula(columns.total);
    if (total) {
      const constant = formulaTerms(total).find((entry) => entry.column === 0);
      if (constant) rates.baseFee ??= constant.factor;
    }
    if (Object.values(rates).every((value) => value !== null)) break;
  }
  return rates;
}

function hasValue(cell: ExcelJS.Cell): boolean {
  return cellAnyFormula(cell) !== null || cellText(cell.value) !== "";
}

/**
 * Die ganze Zeile rot, nicht nur ein Kommentar: mindestens die Hälfte der
 * gefüllten Zellen (ohne Kommentarspalte) rot geschrieben oder rot hinterlegt.
 */
function isRowRed(row: ExcelJS.Row, noteColumn: number | undefined): boolean {
  let filled = 0;
  let red = 0;
  row.eachCell((cell, col) => {
    if (col === noteColumn || !hasValue(cell)) return;
    filled++;
    if (hasRedFill(cell) || hasRedText(cell)) red++;
  });
  return filled > 0 && red * 2 >= filled;
}

/**
 * Nummernkreise, die keine Beitragsrechnung bekommen und gar nicht erst
 * auftauchen sollen: 40-, 41-, 50- bis 53- und die Geschäftsführung (GF).
 */
const SKIPPED_NUMBERS = /^(?:4[01]|5[0-3])-|^GF(?![a-z])/i;

/** Nur eine Anrede — bei Einzelmitgliedern steht der Name dann in der nächsten Zeile. */
const SALUTATION_ONLY = /^(?:frau|herrn?|familie|fam\.?)$/i;

export function isSkippedMemberNumber(choirNumber: string): boolean {
  return SKIPPED_NUMBERS.test(choirNumber.trim());
}

const euro = (value: number) =>
  `${value.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

export async function parseMembershipSheet(
  buffer: ArrayBuffer | Uint8Array,
): Promise<ParsedMembershipSheet> {
  const workbook = await loadWorkbook(buffer);
  const { sheet, headerRow, columns } = pickSheet(workbook);
  const rates = readRates(sheet, headerRow, columns);

  const rows: ParsedMembershipRow[] = [];
  const seenNumbers = new Map<string, number>();

  for (let r = headerRow + 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const cell = (col: number | undefined) =>
      col === undefined ? null : row.getCell(col);
    const value = (col: number | undefined) => cell(col)?.value ?? null;

    const rawNumber = value(columns.choirNumber);
    if (rawNumber instanceof Date) continue;
    const choirNumber = cellText(rawNumber).replace(/\s+/g, " ").trim();
    if (!choirNumber || isSkippedMemberNumber(choirNumber)) continue;

    const warnings: string[] = [];

    const count = (col: number | undefined, label: string): number | null => {
      const raw = value(col);
      if (!cellText(raw)) return null;
      const number = cellNumber(raw);
      if (number === null || !Number.isInteger(number) || number < 0) {
        warnings.push(
          `${label} ist keine gültige Anzahl („${cellText(raw)}“) und wurde ignoriert.`,
        );
        return null;
      }
      return number;
    };
    const membersWithIncome = count(columns.withIncome, "MitEink");
    const membersWithoutIncome = count(columns.withoutIncome, "OhneEink");
    const magazineCount = count(columns.magazineCount, "PosMag") ?? 0;
    const arrears = cellNumber(value(columns.arrears)) ?? 0;

    // Zahl statt Formel = von Hand gesetzt.
    const graduatedCell = cell(columns.graduated)!;
    const graduatedFeeFixed =
      cellAnyFormula(graduatedCell) === null
        ? cellNumber(graduatedCell.value)
        : null;
    const hasCounts =
      membersWithIncome !== null || membersWithoutIncome !== null;
    if (
      graduatedFeeFixed !== null &&
      hasCounts &&
      rates.rateWithIncome !== null &&
      rates.rateWithoutIncome !== null
    ) {
      const computed =
        (membersWithIncome ?? 0) * rates.rateWithIncome +
        (membersWithoutIncome ?? 0) * rates.rateWithoutIncome;
      if (Math.abs(computed - graduatedFeeFixed) > 0.005) {
        warnings.push(
          `Staffelbeitrag ist von Hand eingetragen (${euro(graduatedFeeFixed)}) und weicht von den Mitgliederzahlen ab (${euro(computed)}); er gilt so.`,
        );
      }
    }

    const magazineAmountCell = cell(columns.magazineAmount);
    if (
      magazineAmountCell &&
      cellAnyFormula(magazineAmountCell) === null &&
      rates.magazinePrice !== null
    ) {
      const written = cellNumber(magazineAmountCell.value);
      if (
        written !== null &&
        Math.abs(written - magazineCount * rates.magazinePrice) > 0.005
      ) {
        warnings.push(
          `Heftbetrag ist von Hand eingetragen (${euro(written)}); berechnet wird ${magazineCount} × ${euro(rates.magazinePrice)}.`,
        );
      }
    }

    const totalCell = cell(columns.total)!;
    const sheetHasTotal = hasValue(totalCell);
    const sheetTotalFixed = sheetHasTotal && cellAnyFormula(totalCell) === null;
    const sheetTotal = cellNumber(totalCell.value);
    if (sheetTotalFixed && sheetTotal !== null) {
      warnings.push(
        `Gesamtbetrag ist von Hand eingetragen (${euro(sheetTotal)}); er gilt für die Rechnung.`,
      );
    }

    const emails = cellEmails(value(columns.email));
    const recipientName1 = textOrNull(cellText(value(columns.name1)));
    const recipientName2 = textOrNull(cellText(value(columns.name2)));
    // Einzelmitglieder führen als Chorname und Empfänger nur „Herrn“ oder
    // „Frau“; angesprochen werden sie mit ihrem Namen aus Rg_Name2.
    let choirName = textOrNull(cellText(value(columns.choirName)));
    if (
      (!choirName || SALUTATION_ONLY.test(choirName)) &&
      recipientName1 &&
      SALUTATION_ONLY.test(recipientName1)
    ) {
      choirName = recipientName2;
      if (!recipientName2) {
        warnings.push("Nur die Anrede, kein Name in „Rg_Name2“.");
      }
    } else if (choirName && SALUTATION_ONLY.test(choirName)) {
      choirName = recipientName2 ?? choirName;
    }
    const recipientStreet = textOrNull(cellText(value(columns.street)));
    const recipientCity = textOrNull(cellText(value(columns.city)));

    if (sheetHasTotal) {
      if (emails.length === 0) {
        warnings.push("Keine Adresse in „Email Versand“.");
      }
      if (!recipientName1 || !recipientStreet || !recipientCity) {
        warnings.push("Rechnungsanschrift unvollständig.");
      }
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
      choirName,
      recipientName1,
      recipientName2,
      recipientStreet,
      recipientCity,
      email: emails.length > 0 ? emails.join(", ") : null,
      membersWithIncome,
      membersWithoutIncome,
      graduatedFeeFixed,
      magazineCount,
      arrears,
      sheetTotal,
      sheetTotalFixed,
      sheetHasTotal,
      sheetNote: textOrNull(cellText(value(columns.note))),
      markedRed: isRowRed(row, columns.note),
      warnings,
    });
  }

  return { sheetName: sheet.name, rates, rows };
}
