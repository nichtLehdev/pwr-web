import { describe, expect, it } from "@jest/globals";
import ExcelJS from "exceljs";
import {
  InsuranceSheetError,
  parseInsuranceSheet,
} from "@/server/utils/insurance-sheet";

const CATEGORIES = [
  { label: "bis 1.250 EUR", net: 6 },
  { label: "bis 2.500 EUR", net: 12 },
  { label: "bis 5.000 EUR", net: 24 },
];

/** Baut eine Tabelle im Aufbau der Geschäftsstelle (Blatt "Aktuell"). */
async function buildSheet(
  rows: ExcelJS.CellValue[][],
  options: {
    priceRow?: boolean;
    extraSheetFirst?: boolean;
    /** Formatiert eine Datenzeile (0-basiert) nach dem Einfügen. */
    style?: (row: ExcelJS.Row, index: number) => void;
  } = {},
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  if (options.extraSheetFirst) {
    workbook.addWorksheet("Notizen").addRow(["Nichts hier"]);
  }
  const sheet = workbook.addWorksheet("Aktuell");
  sheet.addRow([
    "Chor-Nr.",
    "Rgn_Name1",
    "Rg_Name2",
    "Rg_Strasse",
    "Rgn_Ort",
    "Kommentar",
    "Chor-Nr.",
    "Chor",
    ...CATEGORIES.flatMap((c) => ["Instrumente", c.label]),
    "Gesamt ",
    "LetzteMeldung",
  ]);
  if (options.priceRow !== false) {
    sheet.addRow([
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      ...CATEGORIES.flatMap((c) => [
        "Anzahl",
        `x ${c.net.toFixed(2).replace(".", ",")} EUR`,
      ]),
      "brutto",
    ]);
  }
  rows.forEach((values, index) => {
    const row = sheet.addRow(values);
    options.style?.(row, index);
  });
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function formulaRow(rowNumber: number): ExcelJS.CellValue[] {
  // I/K/M sind die Anzahlspalten, J/L/N die Beträge.
  return [
    { formula: `SUM(I${rowNumber}*6*1.19)`, result: 0 },
    null,
    { formula: `SUM(K${rowNumber}*12*1.19)`, result: 0 },
    null,
    { formula: `SUM(M${rowNumber}*24*1.19)`, result: 0 },
  ];
}

describe("parseInsuranceSheet", () => {
  it("liest Wertklassen, Preise und Chorzeilen", async () => {
    const buffer = await buildSheet([
      [
        "02-07",
        "Ev. Kirchengemeinde Musterstadt",
        "Posaunenchor",
        "Musterstraße 1",
        "12345 Musterstadt",
        { text: "Kasse@Example.org", hyperlink: "mailto:Kasse@Example.org" },
        "Nr. 02-07",
        "PC Musterstadt",
        12,
        { formula: "SUM(I3*6*1.19)", result: 85.68 },
        14,
        { formula: "SUM(K3*12*1.19)", result: 199.92 },
        13,
        { formula: "SUM(M3*24*1.19)", result: 371.28 },
        { formula: "SUM(J3+L3+N3)", result: 656.88 },
        "Aenderung 012026",
      ],
    ]);

    const parsed = await parseInsuranceSheet(buffer);

    expect(parsed.sheetName).toBe("Aktuell");
    expect(parsed.categories).toEqual([
      { maxValue: 1250, sheetNetPremium: 6 },
      { maxValue: 2500, sheetNetPremium: 12 },
      { maxValue: 5000, sheetNetPremium: 24 },
    ]);
    expect(parsed.sheetTaxRate).toBe(0.19);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]).toMatchObject({
      sheetRow: 3,
      choirNumber: "02-07",
      choirName: "PC Musterstadt",
      recipientName1: "Ev. Kirchengemeinde Musterstadt",
      recipientName2: "Posaunenchor",
      recipientStreet: "Musterstraße 1",
      recipientCity: "12345 Musterstadt",
      email: "kasse@example.org",
      quantities: [
        { maxValue: 1250, quantity: 12 },
        { maxValue: 2500, quantity: 14 },
        { maxValue: 5000, quantity: 13 },
      ],
      sheetTotal: 656.88,
      sheetNote: "Aenderung 012026",
      warnings: [],
    });
  });

  it("übergeht Summen- und Leerzeilen ohne Chor-Nr.", async () => {
    const buffer = await buildSheet([
      [
        "01-01",
        "A",
        null,
        "Weg 1",
        "11111 Ort",
        "a@example.org",
        null,
        "PC A",
        1,
      ],
      [],
      [
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        "Gesamt:",
        7.14,
      ],
    ]);
    const parsed = await parseInsuranceSheet(buffer);
    expect(parsed.rows.map((row) => row.choirNumber)).toEqual(["01-01"]);
  });

  it("nimmt die Preise aus den Formeln, wenn die Preiszeile fehlt", async () => {
    const buffer = await buildSheet(
      [
        [
          "01-01",
          "A",
          null,
          "Weg 1",
          "11111 Ort",
          "a@example.org",
          null,
          "PC A",
          2,
          ...formulaRow(2),
        ],
      ],
      { priceRow: false },
    );
    const parsed = await parseInsuranceSheet(buffer);
    expect(parsed.categories.map((c) => c.sheetNetPremium)).toEqual([
      6, 12, 24,
    ]);
    expect(parsed.sheetTaxRate).toBe(0.19);
  });

  it("meldet fehlende E-Mail, Anschrift und Instrumente als Hinweis", async () => {
    const buffer = await buildSheet([["03-03", "Nur Name"]]);
    const [row] = (await parseInsuranceSheet(buffer)).rows;
    expect(row?.email).toBeNull();
    expect(row?.warnings).toEqual([
      "Keine E-Mail-Adresse.",
      "Rechnungsanschrift unvollständig.",
      "Keine versicherten Instrumente.",
    ]);
  });

  it("zählt Unlesbares als 0 und sagt es", async () => {
    const buffer = await buildSheet([
      [
        "04-04",
        "A",
        null,
        "Weg 1",
        "11111 Ort",
        "a@example.org",
        null,
        null,
        "zwei",
        null,
        1.5,
      ],
    ]);
    const [row] = (await parseInsuranceSheet(buffer)).rows;
    expect(row?.quantities.map((q) => q.quantity)).toEqual([0, 0, 0]);
    expect(row?.warnings).toHaveLength(3);
  });

  it("findet doppelte Chor-Nummern", async () => {
    const line = [
      "05-05",
      "A",
      null,
      "Weg 1",
      "11111 Ort",
      "a@example.org",
      null,
      null,
      1,
    ];
    const buffer = await buildSheet([line, line]);
    const rows = (await parseInsuranceSheet(buffer)).rows;
    expect(rows[1]?.warnings).toContain("Chor-Nr. steht schon in Zeile 3.");
  });

  it("sucht das Blatt „Aktuell“ auch hinter anderen Blättern", async () => {
    const buffer = await buildSheet(
      [
        [
          "06-06",
          "A",
          null,
          "Weg 1",
          "11111 Ort",
          "a@example.org",
          null,
          null,
          1,
        ],
      ],
      { extraSheetFirst: true },
    );
    expect((await parseInsuranceSheet(buffer)).sheetName).toBe("Aktuell");
  });

  describe("rote Markierung", () => {
    const line = (number: string): ExcelJS.CellValue[] => [
      number,
      "Gemeinde",
      null,
      "Weg 1",
      "11111 Ort",
      "a@example.org",
      null,
      null,
      1,
    ];

    async function markedRows(
      style: (row: ExcelJS.Row, index: number) => void,
    ) {
      const buffer = await buildSheet(
        [line("01-01"), line("02-02"), line("03-03")],
        { style },
      );
      return (await parseInsuranceSheet(buffer)).rows.map(
        (row) => row.markedRed,
      );
    }

    it("erkennt rote Schrift als RGB und als Indexfarbe", async () => {
      expect(
        await markedRows((row, index) => {
          if (index === 0) row.font = { color: { argb: "FFC00000" } };
          if (index === 2) {
            // ExcelJS kennt `indexed` nicht im Typ, schreibt es aber.
            row.getCell(2).font = {
              color: { indexed: 2 } as unknown as ExcelJS.Color,
            };
          }
        }),
      ).toEqual([true, false, true]);
    });

    it("erkennt die blassrote Füllung von „Schlecht“", async () => {
      expect(
        await markedRows((row, index) => {
          if (index === 1) {
            row.getCell(1).fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFFFC7CE" },
            };
          }
        }),
      ).toEqual([false, true, false]);
    });

    it("übergeht rot formatierte, aber leere Zellen", async () => {
      expect(
        await markedRows((row, index) => {
          if (index === 0) {
            row.getCell(20).font = { color: { argb: "FFFF0000" } };
          }
        }),
      ).toEqual([false, false, false]);
    });

    it("hält Orange, Schwarz und Designfarben nicht für Rot", async () => {
      expect(
        await markedRows((row, index) => {
          if (index === 0) row.font = { color: { argb: "FFFFC000" } };
          if (index === 1) row.font = { color: { argb: "FF000000" } };
          if (index === 2) row.font = { color: { theme: 5 } };
        }),
      ).toEqual([false, false, false]);
    });
  });

  it("lehnt Dateien ohne Wertklassen ab", async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet("Liste").addRow(["Name", "Ort"]);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    await expect(parseInsuranceSheet(buffer)).rejects.toBeInstanceOf(
      InsuranceSheetError,
    );
  });

  it("lehnt Nicht-Excel-Dateien ab", async () => {
    await expect(
      parseInsuranceSheet(Buffer.from("kein excel")),
    ).rejects.toBeInstanceOf(InsuranceSheetError);
  });
});
