import { describe, expect, it } from "@jest/globals";
import { invoiceYear } from "../invoice-number";

describe("invoiceYear", () => {
  it("nimmt das deutsche Kalenderjahr", () => {
    // 1.1.2027 00:30 deutscher Zeit ist in UTC noch der 31.12.2026.
    expect(invoiceYear(new Date("2026-12-31T23:30:00Z"))).toBe(2027);
    expect(invoiceYear(new Date("2026-12-31T22:30:00Z"))).toBe(2026);
  });
});
