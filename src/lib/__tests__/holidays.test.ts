import { describe, expect, it } from "@jest/globals";
import {
  getGermanPublicHolidays,
  getHolidaysForMonth,
  isGermanPublicHoliday,
} from "../holidays";
import { berlinDate, berlinDayKey, formatBerlin } from "../berlin-time";

// Feiertage kommen als 00:00 Berliner Zeit zurück; eine lokale Mitternacht läge
// in einer Zone östlich von Berlin auf dem Vortag.
describe("Feiertage", () => {
  const byName = (year: number, name: string) =>
    getGermanPublicHolidays(year).find((holiday) => holiday.name === name);

  it("liefert jeden Feiertag als Berliner Mitternacht", () => {
    const christmas = byName(2026, "1. Weihnachtsfeiertag");
    expect(christmas?.date).toEqual(berlinDate(2026, 12, 25));
    // Sommerzeit: Mitternacht in Berlin ist 22:00 UTC am Vortag.
    expect(byName(2026, "Tag der Deutschen Einheit")?.date.toISOString()).toBe(
      "2026-10-02T22:00:00.000Z",
    );
  });

  it("rechnet die beweglichen Feiertage richtig", () => {
    // Ostersonntag 2026 ist der 5. April.
    expect(berlinDayKey(byName(2026, "Karfreitag")!.date)).toBe("2026-04-03");
    expect(berlinDayKey(byName(2026, "Pfingstmontag")!.date)).toBe(
      "2026-05-25",
    );
    expect(berlinDayKey(byName(2026, "1. Advent")!.date)).toBe("2026-11-29");
    expect(formatBerlin(byName(2026, "Totensonntag")!.date, "datumLang")).toBe(
      "22. November 2026",
    );
  });

  it("ordnet Feiertage dem Monat zu (Monat ab 0 wie getMonth)", () => {
    const december = getHolidaysForMonth(2026, 11).map((h) => h.name);
    expect(december).toEqual(
      expect.arrayContaining([
        "Heiligabend",
        "1. Weihnachtsfeiertag",
        "2. Weihnachtsfeiertag",
        "Silvester",
      ]),
    );
    expect(december).not.toContain("Neujahr");
    expect(getHolidaysForMonth(2026, 0).map((h) => h.name)).toContain(
      "Neujahr",
    );
  });

  it("erkennt einen Feiertag an einem beliebigen Zeitpunkt des deutschen Tages", () => {
    // 03.10. 00:30 in Berlin ist in UTC noch der 02.10.
    expect(isGermanPublicHoliday(new Date("2026-10-02T22:30:00Z"))?.name).toBe(
      "Tag der Deutschen Einheit",
    );
    expect(isGermanPublicHoliday(new Date("2026-10-02T21:30:00Z"))).toBeNull();
  });
});
