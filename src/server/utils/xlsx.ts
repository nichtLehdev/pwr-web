import "server-only";

import ExcelJS from "exceljs";

/**
 * Der eine Weg, aus Zeilen eine echte .xlsx-Datei zu machen.
 *
 * Vorher waren alle "Excel"-Exporte semikolongetrennte CSVs mit .xls-Endung:
 * Beträge kamen als Text an, Excel warnte beim Öffnen vor dem falschen Format,
 * und ein Semikolon in einem Namen verschob die halbe Zeile. Hier entstehen
 * stattdessen Zahlen als Zahlen, Daten als Daten und Freitext als Freitext —
 * eine Formel wird daraus nie, denn Werte setzen wir immer als Wert.
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
const DATE_FORMAT = "DD.MM.YYYY";

const BRAND_ARGB = "FFFAA619";
const HEADER_TEXT_ARGB = "FF1F2937";
const BORDER_ARGB = "FFD1D5DB";
const TOTALS_FILL_ARGB = "FFF3F4F6";

const MIN_WIDTH = 10;
const MAX_WIDTH = 48;

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
  // Bei umbrechenden Spalten bestimmt nicht die längste Zeile die Breite,
  // sonst wird aus einer Bemerkung eine bildschirmbreite Spalte.
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
      columns.map((column) => row[column.key] ?? null),
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

  // Ohne Datenzeilen hätte die Summenzeile keinen Bereich zum Aufaddieren.
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
        // SUBTOTAL statt SUM: filtert jemand die Liste, zählt die Summe nur
        // noch die sichtbaren Zeilen — sonst steht unter einer gefilterten
        // Ansicht eine Zahl, die zu ihr nicht passt.
        //
        // `result` mitgeben, weil Vorschauen und Konverter, die keine Formeln
        // rechnen, sonst eine leere Zelle statt der Summe zeigen.
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

/** `2026-09-10` — Datumsteil für Dateinamen. */
export function exportDateStamp(date = new Date()): string {
  return date.toISOString().split("T")[0]!;
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
