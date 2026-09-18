import "server-only";

import ExcelJS from "exceljs";
import { berlinDayKey } from "@/lib/berlin-time";

/**
 * Echte .xlsx-Exporte. Werte werden immer als Wert gesetzt, nie als Formel
 * (keine Formel-Injection aus Freitext).
 */

export type XlsxCellValue = string | number | Date | null;

export type XlsxColumn = {
  header: string;
  key: string;
  /** Feste Breite in Zeichen; ohne Angabe aus dem Inhalt geschätzt. */
  width?: number;
  format?: "currency" | "date";
  /** In der Summenzeile aufaddieren (nur für `format: "currency"` sinnvoll). */
  total?: boolean;
  /** Langer Freitext: Zeilenumbruch statt Überlauf in die Nachbarspalte. */
  wrap?: boolean;
};

export type XlsxRow = Record<string, XlsxCellValue>;

const CURRENCY_FORMAT = '#,##0.00 "€"';
// Kleingeschrieben: Apple (Numbers, Vorschau) liest `DD` als Tag-im-Jahr und
// `YYYY` als wochenbasiertes Jahr.
const DATE_FORMAT = "dd.mm.yyyy";

/** Zeitzone, in der die Geschäftsstelle auf die Exporte schaut. */
const EXPORT_TIME_ZONE = "Europe/Berlin";

const EXPORT_DATE_PARTS = new Intl.DateTimeFormat("en-CA", {
  timeZone: EXPORT_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const BRAND_ARGB = "FFFAA619";
const HEADER_TEXT_ARGB = "FF1F2937";
const BORDER_ARGB = "FFD1D5DB";
const TOTALS_FILL_ARGB = "FFF3F4F6";

const MIN_WIDTH = 10;
const MAX_WIDTH = 48;

/**
 * Berliner Kalendertag auf UTC-Mitternacht: ExcelJS rechnet über die UTC-Anteile,
 * sonst stünde eine Anmeldung kurz nach Mitternacht einen Tag zu früh.
 */
function toExportDay(value: Date): Date {
  return new Date(`${EXPORT_DATE_PARTS.format(value)}T00:00:00Z`);
}

/** Excel verbietet `[]:*?/\` im Blattnamen und kappt bei 31 Zeichen. */
function sanitizeSheetName(name: string): string {
  const cleaned = name.replace(/[[\]:*?/\\]/g, " ").trim();
  return (cleaned || "Tabelle").slice(0, 31);
}

function displayLength(value: XlsxCellValue, column: XlsxColumn): number {
  if (value === null || value === undefined) return 0;
  if (value instanceof Date) return DATE_FORMAT.length;
  if (typeof value === "number") {
    return column.format === "currency" ? value.toFixed(2).length + 4 : 12;
  }
  // Umbrechende Spalten deckeln, sonst wird eine Bemerkung bildschirmbreit.
  const longestLine = value
    .split("\n")
    .reduce((max, line) => Math.max(max, line.length), 0);
  return column.wrap ? Math.min(longestLine, MAX_WIDTH) : longestLine;
}

function resolveWidth(column: XlsxColumn, rows: XlsxRow[]): number {
  if (column.width) return column.width;
  const widest = rows.reduce(
    (max, row) => Math.max(max, displayLength(row[column.key] ?? null, column)),
    column.header.length,
  );
  return Math.min(Math.max(widest + 2, MIN_WIDTH), MAX_WIDTH);
}

export async function buildXlsxBuffer(options: {
  sheetName: string;
  columns: XlsxColumn[];
  rows: XlsxRow[];
  /** Zeilen über der Tabelle, z.B. Kurstitel und Stand des Exports. */
  caption?: string[];
  /** Summenzeile unter der Tabelle für alle Spalten mit `total`. */
  totals?: boolean;
}): Promise<Buffer> {
  const { columns, rows } = options;
  const caption = options.caption ?? [];

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Posaunenwerk Rheinland";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sanitizeSheetName(options.sheetName), {
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1 },
  });

  caption.forEach((line, index) => {
    const row = sheet.addRow([line]);
    row.getCell(1).font = { bold: index === 0, size: index === 0 ? 14 : 11 };
    if (columns.length > 1) {
      sheet.mergeCells(row.number, 1, row.number, columns.length);
    }
  });
  if (caption.length > 0) {
    sheet.addRow([]);
  }

  const headerRow = sheet.addRow(columns.map((column) => column.header));
  headerRow.height = 22;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: HEADER_TEXT_ARGB } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: BRAND_ARGB },
    };
    cell.alignment = { vertical: "middle", wrapText: true };
    cell.border = { bottom: { style: "thin", color: { argb: BORDER_ARGB } } };
  });

  const firstDataRow = headerRow.number + 1;

  for (const row of rows) {
    const added = sheet.addRow(
      columns.map((column) => {
        const value = row[column.key] ?? null;
        return value instanceof Date ? toExportDay(value) : value;
      }),
    );
    added.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      const column = columns[columnNumber - 1];
      if (!column) return;
      if (column.format === "currency") cell.numFmt = CURRENCY_FORMAT;
      if (column.format === "date") cell.numFmt = DATE_FORMAT;
      cell.alignment = { vertical: "top", wrapText: column.wrap ?? false };
      cell.border = { bottom: { style: "hair", color: { argb: BORDER_ARGB } } };
    });
  }

  const lastDataRow = firstDataRow + rows.length - 1;

  if (options.totals && rows.length > 0) {
    const totalsRow = sheet.addRow([]);
    totalsRow.getCell(1).value = "Summe";
    columns.forEach((column, index) => {
      const cell = totalsRow.getCell(index + 1);
      if (column.total) {
        const letter = sheet.getColumn(index + 1).letter;
        const sum = rows.reduce((acc, row) => {
          const value = row[column.key];
          return acc + (typeof value === "number" ? value : 0);
        }, 0);
        // SUBTOTAL statt SUM, damit gefilterte Ansichten nur Sichtbares summieren.
        // `result` für Vorschauen, die keine Formeln rechnen.
        cell.value = {
          formula: `SUBTOTAL(109,${letter}${firstDataRow}:${letter}${lastDataRow})`,
          result: Math.round((sum + Number.EPSILON) * 100) / 100,
        };
        cell.numFmt = CURRENCY_FORMAT;
      }
      cell.font = { bold: true };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: TOTALS_FILL_ARGB },
      };
      cell.border = {
        top: { style: "thin", color: { argb: HEADER_TEXT_ARGB } },
      };
    });
  }

  columns.forEach((column, index) => {
    sheet.getColumn(index + 1).width = resolveWidth(column, rows);
  });

  // Filter nur über die Datenzeilen — eine Summenzeile im Filterbereich
  // wandert beim Sortieren mitten in die Liste.
  if (rows.length > 0) {
    sheet.autoFilter = {
      from: { row: headerRow.number, column: 1 },
      to: { row: lastDataRow, column: columns.length },
    };
  }

  sheet.views = [
    {
      state: "frozen",
      ySplit: headerRow.number,
      activeCell: "A" + firstDataRow,
    },
  ];

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

/** `2026-09-10` für Dateinamen, als deutscher Kalendertag (nicht UTC). */
export function exportDateStamp(date = new Date()): string {
  return berlinDayKey(date);
}

/**
 * Content-Disposition mit ASCII-Fallback und UTF-8-Variante — deutsche
 * Kurstitel tragen Umlaute, und ein rohes "ä" im Header ist nicht erlaubt.
 */
export function attachmentHeaders(filename: string): HeadersInit {
  const asciiName = filename.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "");
  return {
    "Content-Type":
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    "Cache-Control": "no-store",
  };
}
