import { describe, expect, it } from "@jest/globals";
import ExcelJS from "exceljs";
import { parseMembershipSheet } from "@/server/utils/membership-sheet";
import { SheetError } from "@/server/utils/sheet-cells";
import {
  membershipInvoiceLines,
  membershipInvoiceTotal,
} from "@/lib/membership-billing";

/*
 * Aufbau wie die Mitgliedertabelle der Geschäftsstelle, verkürzt:
 *   A Chor-Nr. | B Chorname | C Rgn_Name1 | D Rg_Name2 | E Rg_Strasse | F Rgn_Ort
 *   G Email Versand | H MitEink | I OhneEink | J StaffBetrag | K PosMag
 *   L PCMBetrag | M RückstBeitrag | N Gesamt | O Kommentar
 * Alle Daten sind ausgedacht.
 */
const HEADER = [
  "Chor-Nr.",
  "Chorname",
  "Rgn_Name1",
  "Rg_Name2",
  "Rg_Strasse",
  "Rgn_Ort",
  "Email Versand",
  "MitEink",
  "OhneEink",
  "StaffBetrag",
  "PosMag",
  "PCMBetrag",
  "RückstBeitrag",
  "Gesamt",
  "Kommentar",
];

interface Line {
  nr: string;
  withIncome?: number | null;
  withoutIncome?: number | null;
  /** Zahl = von Hand eingetragen, undefined = Formel. */
  graduated?: number | null;
  magazine?: number;
  arrears?: number;
  /** Zahl = von Hand, undefined = Formel, null = leer. */
  total?: number | null;
  email?: string | null;
  note?: string;
  /** Chorname, Rgn_Name1, Rg_Name2 — sonst die Standardwerte unten. */
  names?: [string, string, string | null];
}

async function buildSheet(
  lines: Line[],
  style?: (row: ExcelJS.Row, index: number) => void,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.addWorksheet("Ausgeschiedene").addRow(["Chor-Nr.", "Chorname"]);
  const sheet = workbook.addWorksheet("aktuelle");
  sheet.addRow(HEADER);
  lines.forEach((line, index) => {
    const r = index + 2;
    const withIncome = line.withIncome ?? null;
    const withoutIncome = line.withoutIncome ?? null;
    const graduatedValue = (withIncome ?? 0) * 16 + (withoutIncome ?? 0) * 8;
    const graduated =
      line.graduated === undefined
        ? { formula: `H${r}*16+I${r}*8`, result: graduatedValue }
        : line.graduated;
    const magazine = line.magazine ?? 0;
    const formulaTotal =
      (typeof graduated === "number" ? graduated : graduatedValue) +
      magazine * 3 +
      (line.arrears ?? 0) +
      45;
    const total =
      line.total === undefined
        ? { formula: `J${r}+L${r}+M${r}+45`, result: formulaTotal }
        : line.total;
    const row = sheet.addRow([
      line.nr,
      ...(line.names ?? [
        `Posaunenchor ${line.nr}`,
        "Ev. Kirchengemeinde Beispiel",
        "Posaunenchor",
      ]),
      "Musterweg 1",
      "12345 Musterstadt",
      line.email === undefined ? "kasse@example.org" : line.email,
      withIncome,
      withoutIncome,
      graduated,
      magazine,
      { formula: `K${r}*3`, result: magazine * 3 },
      line.arrears ?? 0,
      total,
      line.note ?? null,
    ]);
    style?.(row, index);
  });
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

const RATES = {
  baseFee: 45,
  rateWithIncome: 16,
  rateWithoutIncome: 8,
  magazinePrice: 3,
};

describe("parseMembershipSheet", () => {
  it("liest Sätze aus den Formeln und rechnet wie die Tabelle", async () => {
    const parsed = await parseMembershipSheet(
      await buildSheet([
        { nr: "02-07", withIncome: 16, withoutIncome: 16 },
        { nr: "03-01", withIncome: 4, withoutIncome: 0, magazine: 5 },
      ]),
    );
    expect(parsed.sheetName).toBe("aktuelle");
    expect(parsed.rates).toEqual(RATES);
    expect(parsed.rows).toHaveLength(2);
    const [first, second] = parsed.rows;
    expect(first).toMatchObject({
      sheetRow: 2,
      choirNumber: "02-07",
      email: "kasse@example.org",
      membersWithIncome: 16,
      membersWithoutIncome: 16,
      graduatedFeeFixed: null,
      sheetTotal: 429,
      sheetTotalFixed: false,
      sheetHasTotal: true,
      markedRed: false,
      warnings: [],
    });
    // Das Beispiel aus dem bisherigen Brief: 45 + 384 = 429 €.
    const lines = membershipInvoiceLines(RATES, first!);
    expect(lines.map((line) => [line.key, line.amount])).toEqual([
      ["base", 45],
      ["graduated", 384],
    ]);
    // formatEuro setzt ein geschütztes Leerzeichen vor „€“.
    expect(lines[1]!.details.map((d) => d.replace(/ /g, " "))).toEqual([
      "16 Mitglieder ohne eigenes Einkommen je 8,00 €",
      "16 Mitglieder mit eigenem Einkommen je 16,00 €",
    ]);
    expect(membershipInvoiceTotal(lines)).toBe(429);
    expect(membershipInvoiceTotal(membershipInvoiceLines(RATES, second!))).toBe(
      second!.sheetTotal,
    );
  });

  it("übernimmt den Vorjahresbetrag, wenn Mitgliederzahlen fehlen", async () => {
    const [row] = (
      await parseMembershipSheet(
        await buildSheet([{ nr: "04-02", graduated: 200 }]),
      )
    ).rows;
    expect(row).toMatchObject({
      membersWithIncome: null,
      membersWithoutIncome: null,
      graduatedFeeFixed: 200,
      sheetTotal: 245,
    });
    const lines = membershipInvoiceLines(RATES, row!);
    expect(lines[1]).toMatchObject({ key: "graduated", amount: 200 });
    expect(membershipInvoiceTotal(lines)).toBe(245);
  });

  it("Einzelmitglied: nur der Grundbeitrag", async () => {
    const [row] = (
      await parseMembershipSheet(await buildSheet([{ nr: "05-12 (EZ)" }]))
    ).rows;
    const lines = membershipInvoiceLines(RATES, row!);
    expect(lines.map((line) => line.key)).toEqual(["base"]);
    expect(membershipInvoiceTotal(lines)).toBe(45);
  });

  it("von Hand eingetragener Gesamtbetrag gilt, mit Ausgleichsposition", async () => {
    const [row] = (
      await parseMembershipSheet(
        await buildSheet([{ nr: "06-01", withIncome: 10, total: 150 }]),
      )
    ).rows;
    expect(row).toMatchObject({ sheetTotal: 150, sheetTotalFixed: true });
    expect(row!.warnings[0]).toMatch(/von Hand eingetragen/);
    const lines = membershipInvoiceLines(RATES, row!);
    expect(lines.at(-1)).toMatchObject({ key: "adjustment", amount: -55 });
    expect(membershipInvoiceTotal(lines)).toBe(150);
  });

  it("Zeilen ohne Gesamt bekommen keine Rechnung, ohne Hinweise zur Anschrift", async () => {
    const [row] = (
      await parseMembershipSheet(
        await buildSheet([{ nr: "02-07-1", total: null, email: null }]),
      )
    ).rows;
    expect(row).toMatchObject({ sheetHasTotal: false, warnings: [] });
  });

  it("rot heißt: die ganze Zeile, nicht nur der Kommentar", async () => {
    const rows = (
      await parseMembershipSheet(
        await buildSheet(
          [
            { nr: "01-01", withIncome: 1 },
            { nr: "01-02", withIncome: 1, note: "nachfragen" },
            { nr: "01-03", withIncome: 1 },
          ],
          (row, index) => {
            if (index === 0) row.font = { color: { argb: "FFFF0000" } };
            if (index === 1) {
              row.getCell(15).font = { color: { argb: "FFFF0000" } };
            }
            if (index === 2) {
              // ExcelJS kennt `indexed` nicht im Typ, schreibt es aber.
              row.eachCell((cell) => {
                cell.font = {
                  color: { indexed: 2 } as unknown as ExcelJS.Color,
                };
              });
            }
          },
        ),
      )
    ).rows;
    expect(rows.map((row) => row.markedRed)).toEqual([true, false, true]);
  });

  it("meldet fehlende Versandadresse und doppelte Nummern", async () => {
    const rows = (
      await parseMembershipSheet(
        await buildSheet([{ nr: "07-01", email: null }, { nr: "07-01" }]),
      )
    ).rows;
    expect(rows[0]!.warnings).toContain("Keine Adresse in „Email Versand“.");
    expect(rows[1]!.warnings).toContain("Chor-Nr. steht schon in Zeile 2.");
  });

  it("lässt 40-, 41-, 50- bis 53- und GF ganz weg", async () => {
    const rows = (
      await parseMembershipSheet(
        await buildSheet(
          [
            "02-07",
            "40-01",
            "41-03",
            "GF",
            "50-01",
            "51-02",
            "52-10",
            "53-04",
            "54-01",
            "14-01 (EZ)",
          ].map((nr) => ({ nr })),
        ),
      )
    ).rows;
    expect(rows.map((row) => row.choirNumber)).toEqual([
      "02-07",
      "54-01",
      "14-01 (EZ)",
    ]);
  });

  it("spricht Einzelmitglieder mit Namen statt nur mit der Anrede an", async () => {
    const rows = (
      await parseMembershipSheet(
        await buildSheet([
          { nr: "05-12 (EZ)", names: ["Herrn", "Herrn", "Max Mustermann"] },
          { nr: "05-13 (EZ)", names: ["Frau", "Frau", "Dr. Erika Musterfrau"] },
          { nr: "05-14 (EZ)", names: ["Frau", "Frau", null] },
        ]),
      )
    ).rows;
    expect(rows.map((row) => row.choirName)).toEqual([
      "Max Mustermann",
      "Dr. Erika Musterfrau",
      null,
    ]);
    // Die Anschrift bleibt briefgerecht: Anrede, dann Name.
    expect(rows[0]).toMatchObject({
      recipientName1: "Herrn",
      recipientName2: "Max Mustermann",
    });
    expect(rows[2]!.warnings).toContain(
      "Nur die Anrede, kein Name in „Rg_Name2“.",
    );
  });

  it("lehnt Tabellen ohne die Beitragsspalten ab", async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet("aktuelle").addRow(["Chor-Nr.", "Gesamt"]);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    await expect(parseMembershipSheet(buffer)).rejects.toThrow(/MitEink/);
    await expect(parseMembershipSheet(buffer)).rejects.toBeInstanceOf(
      SheetError,
    );
  });
});
