import { describe, expect, it } from "@jest/globals";
import {
  invoiceFilename,
  invoicePaymentReference,
  invoiceTotal,
  isValidCourseNumber,
  lineItemTotal,
  normalizeCourseNumber,
  recipientName,
  type InvoiceLineItem,
} from "../invoice-document";

const line = (overrides: Partial<InvoiceLineItem> = {}): InvoiceLineItem => ({
  description: "Teilnahme",
  quantity: 1,
  unitPrice: 145,
  ...overrides,
});

describe("lineItemTotal", () => {
  it("multiplies quantity by unit price", () => {
    expect(lineItemTotal(line({ quantity: 3, unitPrice: 45.5 }))).toBe(136.5);
  });

  it("rounds to cents rather than carrying float noise", () => {
    expect(lineItemTotal(line({ quantity: 3, unitPrice: 0.1 }))).toBe(0.3);
    expect(lineItemTotal(line({ quantity: 1, unitPrice: 45.5 * 0.2 }))).toBe(
      9.1,
    );
  });

  it("keeps negative unit prices negative (discounts, deposits)", () => {
    expect(lineItemTotal(line({ quantity: 1, unitPrice: -29 }))).toBe(-29);
  });

  it("is zero for a zero quantity", () => {
    expect(lineItemTotal(line({ quantity: 0, unitPrice: 145 }))).toBe(0);
  });
});

describe("invoiceTotal", () => {
  it("is zero for an empty invoice", () => {
    expect(invoiceTotal([])).toBe(0);
  });

  it("sums participants and subtracts discount lines", () => {
    const total = invoiceTotal([
      line({ description: "Anna", unitPrice: 145 }),
      line({ description: "Ben", unitPrice: 145 }),
      line({ description: "Geschwisterkindrabatt (20 %)", unitPrice: -29 }),
    ]);
    expect(total).toBe(261);
  });

  it("does not accumulate drift across many cent-sized lines", () => {
    const lines = Array.from({ length: 10 }, () =>
      line({ quantity: 1, unitPrice: 0.1 }),
    );
    expect(invoiceTotal(lines)).toBe(1);
  });

  it("can go negative when a credit exceeds the charges", () => {
    expect(
      invoiceTotal([
        line({ unitPrice: 50 }),
        line({ description: "Anzahlung", unitPrice: -80 }),
      ]),
    ).toBe(-30);
  });
});

describe("recipientName", () => {
  it("joins first and last name", () => {
    expect(recipientName({ firstName: "Anna", lastName: "Muster" })).toBe(
      "Anna Muster",
    );
  });

  it("tolerates a missing half without leaving whitespace", () => {
    expect(recipientName({ lastName: "Muster" })).toBe("Muster");
    expect(recipientName({ firstName: "Anna" })).toBe("Anna");
    expect(recipientName({})).toBe("");
  });
});

describe("invoiceFilename", () => {
  it("includes the invoice number and the recipient", () => {
    expect(invoiceFilename("RE-2026-00042", { lastName: "Muster" })).toBe(
      "Rechnung_RE-2026-00042_Muster.pdf",
    );
  });

  it("transliterates umlauts and strips punctuation", () => {
    expect(invoiceFilename("RE-2026-00042", { lastName: "Müller-Groß" })).toBe(
      "Rechnung_RE-2026-00042_Mueller_Gross.pdf",
    );
  });

  it("drops diacritics on non-German letters", () => {
    expect(invoiceFilename("RE-2026-00042", { lastName: "Ceçek" })).toBe(
      "Rechnung_RE-2026-00042_Cecek.pdf",
    );
  });

  it("falls back to the company, then to the number alone", () => {
    expect(
      invoiceFilename("RE-2026-00042", { company: "Kirchengemeinde Bonn" }),
    ).toBe("Rechnung_RE-2026-00042_Kirchengemeinde_Bonn.pdf");
    expect(invoiceFilename("RE-2026-00042", {})).toBe(
      "Rechnung_RE-2026-00042.pdf",
    );
  });

  it("never produces a path separator, whatever the name contains", () => {
    const filename = invoiceFilename("RE-2026-00042", {
      lastName: "../../etc/passwd",
    });
    expect(filename).not.toContain("/");
    expect(filename).toBe("Rechnung_RE-2026-00042_etc_passwd.pdf");
  });
});

describe("isValidCourseNumber", () => {
  it("accepts one to ten digits", () => {
    expect(isValidCourseNumber("1")).toBe(true);
    expect(isValidCourseNumber("2601")).toBe(true);
    expect(isValidCourseNumber("1234567890")).toBe(true);
  });

  it("rejects anything that could not name a file or a number range", () => {
    expect(isValidCourseNumber("")).toBe(false);
    expect(isValidCourseNumber("26-01")).toBe(false);
    expect(isValidCourseNumber("L2601")).toBe(false);
    expect(isValidCourseNumber("26 01")).toBe(false);
    expect(isValidCourseNumber("../etc")).toBe(false);
    expect(isValidCourseNumber("12345678901")).toBe(false);
  });
});

describe("normalizeCourseNumber", () => {
  it("treats blank input as no number", () => {
    expect(normalizeCourseNumber("")).toBeNull();
    expect(normalizeCourseNumber("   ")).toBeNull();
    expect(normalizeCourseNumber(null)).toBeNull();
    expect(normalizeCourseNumber(undefined)).toBeNull();
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeCourseNumber("  2601 ")).toBe("2601");
  });
});

describe("invoicePaymentReference", () => {
  it("is just the invoice number when the course has none", () => {
    expect(invoicePaymentReference("RE-2026-00042")).toBe("RE-2026-00042");
    expect(invoicePaymentReference("RE-2026-00042", null)).toBe(
      "RE-2026-00042",
    );
    expect(invoicePaymentReference("RE-2026-00042", "  ")).toBe(
      "RE-2026-00042",
    );
  });

  it("names the course in front of the invoice number", () => {
    expect(invoicePaymentReference("RE-2601-001", "2601")).toBe(
      "Bläserlehrgang 2601 RE-2601-001",
    );
  });

  it("stays inside the 140 characters an EPC QR remittance allows", () => {
    expect(
      invoicePaymentReference("RE-1234567890-999", "1234567890").length,
    ).toBeLessThanOrEqual(140);
  });
});
