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

describe("registration deadline (whole-day inclusive)", () => {
  it("keeps a midnight-stored deadline open for its whole day", () => {
    const deadline = new Date(2026, 7, 10, 0, 0, 0); // 10.08. 00:00 (legacy rows)
    const sameDayEvening = new Date(2026, 7, 10, 21, 30);
    expect(isRegistrationDeadlinePassed(deadline, sameDayEvening)).toBe(false);
  });

  it("closes after the deadline day is over", () => {
    const deadline = new Date(2026, 7, 10, 0, 0, 0);
    const nextMorning = new Date(2026, 7, 11, 0, 1);
    expect(isRegistrationDeadlinePassed(deadline, nextMorning)).toBe(true);
  });

  it("handles end-of-day-stored deadlines identically", () => {
    const deadline = new Date(2026, 7, 10, 23, 59, 59);
    expect(
      isRegistrationDeadlinePassed(deadline, new Date(2026, 7, 10, 12, 0)),
    ).toBe(false);
    expect(
      isRegistrationDeadlinePassed(deadline, new Date(2026, 7, 11, 0, 1)),
    ).toBe(true);
  });

  it("treats a missing deadline as never passed", () => {
    expect(isRegistrationDeadlinePassed(null)).toBe(false);
    expect(isRegistrationDeadlinePassed(undefined)).toBe(false);
  });

  it("normalizes to 23:59:59.999 of the same day", () => {
    const end = deadlineEndOfDay(new Date(2026, 7, 10, 3, 0));
    expect(end.getDate()).toBe(10);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
  });
});

describe("date range formatting", () => {
  it("counts calendar days inclusively", () => {
    expect(
      calendarDaysInclusive(
        new Date(2026, 7, 14, 15, 0),
        new Date(2026, 7, 15, 13, 0),
      ),
    ).toBe(2); // 14.–15. Aug is 2 days even though it's < 24h
    expect(
      calendarDaysInclusive(
        new Date(2026, 7, 14, 9, 0),
        new Date(2026, 7, 14, 18, 0),
      ),
    ).toBe(1);
    expect(
      calendarDaysInclusive(
        new Date(2026, 7, 27, 2, 0),
        new Date(2026, 7, 30, 2, 0),
      ),
    ).toBe(4);
  });

  it("shows times for single-day ranges only", () => {
    const singleDay = formatDateRange(
      new Date(2026, 7, 14, 15, 0),
      new Date(2026, 7, 14, 18, 0),
    );
    expect(singleDay).toContain("15:00");
    expect(singleDay).toContain("Uhr");

    const multiDay = formatDateRange(
      new Date(2026, 7, 27, 2, 0),
      new Date(2026, 7, 30, 2, 0),
    );
    expect(multiDay).not.toContain("02:00");
    expect(multiDay).not.toContain("Uhr");
    expect(multiDay).toContain("27.");
    expect(multiDay).toContain("30.");
  });

  it("spells out cross-month ranges", () => {
    const range = formatDateRange(new Date(2026, 7, 30), new Date(2026, 8, 2));
    expect(range).toContain("Aug");
    expect(range).toContain("Sep");
  });

  it("isSameCalendarDay compares dates, not timestamps", () => {
    expect(
      isSameCalendarDay(
        new Date(2026, 1, 1, 0, 0),
        new Date(2026, 1, 1, 23, 59),
      ),
    ).toBe(true);
    expect(
      isSameCalendarDay(
        new Date(2026, 1, 1, 23, 59),
        new Date(2026, 1, 2, 0, 0),
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
