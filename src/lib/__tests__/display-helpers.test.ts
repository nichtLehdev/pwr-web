import { describe, expect, it } from "@jest/globals";
import {
  deadlineEndOfDay,
  isRegistrationDeadlinePassed,
} from "../registration-deadline";
import {
  calendarDaysInclusive,
  formatDateRange,
  isSameCalendarDay,
} from "../format-date-range";
import { formatAvailableSlots } from "../format-available-slots";
import { berlinDate, berlinParts } from "../berlin-time";

// Fristen gelten bis zum Ende ihres deutschen Kalendertages. Die Zeitpunkte
// entstehen über `berlinDate`, damit die Tests in jeder Zeitzone dasselbe
// prüfen — der Server läuft in UTC.
describe("registration deadline (whole-day inclusive)", () => {
  it("keeps a midnight-stored deadline open for its whole day", () => {
    const deadline = berlinDate(2026, 8, 10, 0, 0); // 10.08. 00:00 (legacy rows)
    const sameDayEvening = berlinDate(2026, 8, 10, 21, 30);
    expect(isRegistrationDeadlinePassed(deadline, sameDayEvening)).toBe(false);
  });

  it("closes after the deadline day is over", () => {
    const deadline = berlinDate(2026, 8, 10, 0, 0);
    const nextMorning = berlinDate(2026, 8, 11, 0, 1);
    expect(isRegistrationDeadlinePassed(deadline, nextMorning)).toBe(true);
  });

  it("handles end-of-day-stored deadlines identically", () => {
    const deadline = new Date(berlinDate(2026, 8, 11).getTime() - 1000); // 10.08. 23:59:59
    expect(
      isRegistrationDeadlinePassed(deadline, berlinDate(2026, 8, 10, 12, 0)),
    ).toBe(false);
    expect(
      isRegistrationDeadlinePassed(deadline, berlinDate(2026, 8, 11, 0, 1)),
    ).toBe(true);
  });

  it("treats a missing deadline as never passed", () => {
    expect(isRegistrationDeadlinePassed(null)).toBe(false);
    expect(isRegistrationDeadlinePassed(undefined)).toBe(false);
  });

  it("normalizes to 23:59:59.999 of the same German day", () => {
    const end = deadlineEndOfDay(berlinDate(2026, 8, 10, 3, 0));
    const teile = berlinParts(end);
    expect([teile.day, teile.hour, teile.minute, teile.second]).toEqual([
      10, 23, 59, 59,
    ]);
  });
});

// Termine sind deutsche Ortszeit: Die Zeitpunkte entstehen deshalb über
// `berlinDate` und nicht über `new Date(y, m, d)`, das der Zone der Maschine
// folgt — der Server läuft in UTC, die Anzeige muss trotzdem Berlin zeigen.
describe("date range formatting", () => {
  it("counts calendar days inclusively", () => {
    expect(
      calendarDaysInclusive(
        berlinDate(2026, 8, 14, 15, 0),
        berlinDate(2026, 8, 15, 13, 0),
      ),
    ).toBe(2); // 14.–15. Aug is 2 days even though it's < 24h
    expect(
      calendarDaysInclusive(
        berlinDate(2026, 8, 14, 9, 0),
        berlinDate(2026, 8, 14, 18, 0),
      ),
    ).toBe(1);
    expect(
      calendarDaysInclusive(
        berlinDate(2026, 8, 27, 2, 0),
        berlinDate(2026, 8, 30, 2, 0),
      ),
    ).toBe(4);
  });

  it("zählt deutsche Kalendertage, auch über Mitternacht und die Zeitumstellung", () => {
    // 04.05. 22:00 UTC ist der 05.05. 00:00 in Berlin.
    expect(
      calendarDaysInclusive(
        new Date("2027-05-04T22:00:00Z"),
        new Date("2027-05-09T11:00:00Z"),
      ),
    ).toBe(5);
    // Über den 25.10. (25 Stunden) hinweg.
    expect(
      calendarDaysInclusive(
        berlinDate(2026, 10, 24, 10, 0),
        berlinDate(2026, 10, 26, 10, 0),
      ),
    ).toBe(3);
  });

  it("shows times for single-day ranges only", () => {
    const singleDay = formatDateRange(
      berlinDate(2026, 8, 14, 15, 0),
      berlinDate(2026, 8, 14, 18, 0),
    );
    expect(singleDay).toBe("14. August 2026, 15:00 – 18:00 Uhr");

    const multiDay = formatDateRange(
      berlinDate(2026, 8, 27, 2, 0),
      berlinDate(2026, 8, 30, 2, 0),
    );
    expect(multiDay).toBe("27. – 30. August 2026");
  });

  it("zeigt Tag und Uhrzeit in Berliner Zeit, nicht in der des Servers", () => {
    // Ein Workshop am 05.09. von 10 bis 17 Uhr, gespeichert in UTC.
    expect(
      formatDateRange(
        new Date("2026-09-05T08:00:00Z"),
        new Date("2026-09-05T15:00:00Z"),
      ),
    ).toBe("5. September 2026, 10:00 – 17:00 Uhr");
    // Beginn um Mitternacht: in UTC noch der Vortag.
    expect(
      formatDateRange(
        new Date("2027-06-17T22:00:00Z"),
        new Date("2027-06-27T21:59:00Z"),
      ),
    ).toBe("18. – 27. Juni 2027");
  });

  it("spells out cross-month ranges", () => {
    const range = formatDateRange(
      berlinDate(2026, 8, 30),
      berlinDate(2026, 9, 2),
    );
    expect(range).toBe("30. Aug. – 2. Sept. 2026");
  });

  it("nennt beide Jahre, wenn der Kurs über Neujahr geht", () => {
    expect(
      formatDateRange(berlinDate(2026, 12, 28, 18), berlinDate(2027, 1, 5, 10)),
    ).toBe("28. Dez. 2026 – 5. Jan. 2027");
  });

  it("isSameCalendarDay compares dates, not timestamps", () => {
    expect(
      isSameCalendarDay(
        berlinDate(2026, 2, 1, 0, 0),
        berlinDate(2026, 2, 1, 23, 59),
      ),
    ).toBe(true);
    expect(
      isSameCalendarDay(
        berlinDate(2026, 2, 1, 23, 59),
        berlinDate(2026, 2, 2, 0, 0),
      ),
    ).toBe(false);
  });
});

describe("formatAvailableSlots", () => {
  it("shows exact numbers only when nearly full", () => {
    expect(formatAvailableSlots(0)).toBe("Ausgebucht");
    expect(formatAvailableSlots(-2)).toBe("Ausgebucht");
    expect(formatAvailableSlots(1)).toBe("Noch 1 Platz frei");
    expect(formatAvailableSlots(3)).toBe("Noch 3 Plätze frei");
    expect(formatAvailableSlots(10)).toBe("Noch 10 Plätze frei");
    expect(formatAvailableSlots(11)).toBe("Plätze verfügbar");
    expect(formatAvailableSlots(100)).toBe("Plätze verfügbar");
    expect(formatAvailableSlots(Infinity)).toBe("Plätze verfügbar");
  });

  it("scales the urgency threshold with course size (20%, capped at 10)", () => {
    // 100-person course: threshold stays 10
    expect(formatAvailableSlots(10, 100)).toBe("Noch 10 Plätze frei");
    expect(formatAvailableSlots(11, 100)).toBe("Plätze verfügbar");
    // 50-person course: 20% = 10
    expect(formatAvailableSlots(10, 50)).toBe("Noch 10 Plätze frei");
    expect(formatAvailableSlots(11, 50)).toBe("Plätze verfügbar");
    // 8-person workshop: 20% of 8 → 2, no longer leaks counts from day one
    expect(formatAvailableSlots(3, 8)).toBe("Plätze verfügbar");
    expect(formatAvailableSlots(2, 8)).toBe("Noch 2 Plätze frei");
    expect(formatAvailableSlots(1, 8)).toBe("Noch 1 Platz frei");
    // tiny course: threshold never drops below 1
    expect(formatAvailableSlots(1, 3)).toBe("Noch 1 Platz frei");
    // unknown / unlimited capacity falls back to the fixed threshold
    expect(formatAvailableSlots(5, null)).toBe("Noch 5 Plätze frei");
    expect(formatAvailableSlots(5, Infinity)).toBe("Noch 5 Plätze frei");
  });
});
