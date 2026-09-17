import { describe, expect, it } from "@jest/globals";
import ExcelJS from "exceljs";
import { buildXlsxBuffer, type XlsxColumn } from "@/server/utils/xlsx";

const columns: XlsxColumn[] = [
  { header: "Name", key: "name" },
  { header: "Geburtsdatum", key: "geburtsdatum", format: "date" },
];

async function readBack(rows: Record<string, string | Date | null>[]) {
  const buffer = await buildXlsxBuffer({
    sheetName: "Teilnehmende",
    columns,
    rows,
  });
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(
    buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    ) as ArrayBuffer,
  );
  const sheet = workbook.worksheets[0]!;
  // Zeile 1 ist die Kopfzeile, danach je Datensatz eine Zeile.
  return rows.map((_, index) => sheet.getRow(index + 2).getCell(2));
}

describe("buildXlsxBuffer date cells", () => {
  it("uses the lowercase format code from the OOXML spec", async () => {
    const [cell] = await readBack([
      { name: "Jonas", geburtsdatum: new Date("2010-06-15T00:00:00Z") },
    ]);

    // Excel liest Formatcodes ohne Rücksicht auf Groß- und Kleinschreibung,
    // Apples Tabellendarstellung nicht: dort ist `DD` der Tag im Jahr und
    // `YYYY` das wochenbasierte Jahr — aus dem 15.06.2010 wurde "166.06.2010".
    expect(cell!.numFmt).toBe("dd.mm.yyyy");
    expect(cell!.numFmt).not.toMatch(/[DY]/);
  });

  it("writes the calendar day as seen in Germany, not in UTC", async () => {
    const cells = await readBack([
      // Anmeldung kurz nach Mitternacht deutscher Sommerzeit — in UTC noch der
      // Vortag.
      { name: "Lena", geburtsdatum: new Date("2026-06-03T01:30:00+02:00") },
      // Und kurz vor Mitternacht am Jahresende.
      { name: "Mia", geburtsdatum: new Date("2026-12-31T23:45:00+01:00") },
    ]);

    expect(cells.map((cell) => cell!.value)).toEqual([
      new Date("2026-06-03T00:00:00Z"),
      new Date("2026-12-31T00:00:00Z"),
    ]);
  });

  it("keeps empty date cells empty", async () => {
    const [cell] = await readBack([{ name: "Paul", geburtsdatum: null }]);

    expect(cell!.value).toBeNull();
  });
});
