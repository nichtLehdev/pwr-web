import { describe, expect, it } from "@jest/globals";
import { isNeuerTermin, neuSeit } from "@/lib/neue-termine";

/** Neu sind bezirksübergreifende Angebote für sieben deutsche Kalendertage ab dem Erstellungstag. */
describe("neuSeit", () => {
  it("beginnt um 00:00 Uhr deutscher Zeit sechs Tage vor heute", () => {
    // 27.10.2026 12:00 Winterzeit → 21.10. 00:00 Sommerzeit
    expect(neuSeit(new Date("2026-10-27T11:00:00Z")).toISOString()).toBe(
      "2026-10-20T22:00:00.000Z",
    );
  });
});

describe("isNeuerTermin", () => {
  const now = new Date("2026-10-27T11:00:00Z");

  it("zählt Angebote ohne Bezirk aus den letzten sieben Tagen", () => {
    expect(
      isNeuerTermin({ createdAt: "2026-10-20T22:00:00Z", bezirkId: null }, now),
    ).toBe(true);
    expect(
      isNeuerTermin({ createdAt: "2026-10-27T10:00:00Z", bezirkId: null }, now),
    ).toBe(true);
  });

  it("zählt ältere Angebote nicht", () => {
    expect(
      isNeuerTermin({ createdAt: "2026-10-20T21:59:59Z", bezirkId: null }, now),
    ).toBe(false);
  });

  it("zählt Bezirkstermine nie", () => {
    expect(
      isNeuerTermin({ createdAt: "2026-10-27T10:00:00Z", bezirkId: "b1" }, now),
    ).toBe(false);
  });
});
