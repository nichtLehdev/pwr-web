import { describe, expect, it } from "@jest/globals";
import {
  ageOnDate,
  isAgeWithinPriceOption,
  isBirthDateWithinPriceOption,
  priceOptionAgeLabel,
  priceOptionAgeMismatchMessage,
  priceOptionAgeReferenceDate,
  priceOptionsForAge,
  validatePriceOptionAgeRange,
  validatePriceOptionAgeRanges,
} from "../course-price-option-age";

const courseStart = new Date("2026-07-20T00:00:00.000Z");

describe("ageOnDate", () => {
  it("counts completed years at the reference date", () => {
    expect(ageOnDate("2008-07-19", courseStart)).toBe(18);
    expect(ageOnDate("2008-07-20", courseStart)).toBe(18);
    expect(ageOnDate("2008-07-21", courseStart)).toBe(17);
  });

  it("uses the course start, not today", () => {
    // Birthday falls between "today" and the course: the course start is what
    // decides, so this participant already counts as 18.
    const born = new Date(courseStart);
    born.setFullYear(born.getFullYear() - 18);
    expect(ageOnDate(born, courseStart)).toBe(18);
  });

  it("returns null for a missing or unusable birth date", () => {
    expect(ageOnDate(null, courseStart)).toBeNull();
    expect(ageOnDate("", courseStart)).toBeNull();
    expect(ageOnDate("nonsense", courseStart)).toBeNull();
    expect(ageOnDate("2030-01-01", courseStart)).toBeNull();
  });
});

describe("priceOptionAgeReferenceDate", () => {
  it("is the first day of the course", () => {
    expect(
      priceOptionAgeReferenceDate({ startDate: courseStart }).getTime(),
    ).toBe(courseStart.getTime());
  });
});

describe("isAgeWithinPriceOption", () => {
  const youth = { minAge: 6, maxAge: 17 };

  it("treats both bounds as inclusive", () => {
    expect(isAgeWithinPriceOption(youth, 6)).toBe(true);
    expect(isAgeWithinPriceOption(youth, 17)).toBe(true);
    expect(isAgeWithinPriceOption(youth, 5)).toBe(false);
    expect(isAgeWithinPriceOption(youth, 18)).toBe(false);
  });

  it("applies a one-sided limit only on that side", () => {
    expect(isAgeWithinPriceOption({ minAge: 27, maxAge: null }, 80)).toBe(true);
    expect(isAgeWithinPriceOption({ minAge: 27, maxAge: null }, 26)).toBe(
      false,
    );
    expect(isAgeWithinPriceOption({ minAge: null, maxAge: 26 }, 0)).toBe(true);
    expect(isAgeWithinPriceOption({ minAge: null, maxAge: 26 }, 27)).toBe(
      false,
    );
  });

  it("accepts an unknown age instead of judging it", () => {
    expect(isAgeWithinPriceOption(youth, null)).toBe(true);
  });

  it("accepts anything when the option has no limits", () => {
    expect(isAgeWithinPriceOption({ minAge: null, maxAge: null }, 42)).toBe(
      true,
    );
    expect(isAgeWithinPriceOption({}, 42)).toBe(true);
  });
});

describe("isBirthDateWithinPriceOption", () => {
  it("is decided by the age at course start, not today", () => {
    // 17 years and 364 days old on the course's first day.
    expect(
      isBirthDateWithinPriceOption(
        { minAge: null, maxAge: 17 },
        "2008-07-21",
        courseStart,
      ),
    ).toBe(true);
    expect(
      isBirthDateWithinPriceOption(
        { minAge: null, maxAge: 17 },
        "2008-07-20",
        courseStart,
      ),
    ).toBe(false);
  });
});

describe("priceOptionAgeLabel", () => {
  it("names the limits that are set", () => {
    expect(priceOptionAgeLabel({ minAge: 12, maxAge: 17 })).toBe("12–17 Jahre");
    expect(priceOptionAgeLabel({ minAge: 18, maxAge: null })).toBe(
      "ab 18 Jahren",
    );
    expect(priceOptionAgeLabel({ minAge: null, maxAge: 26 })).toBe(
      "bis 26 Jahre",
    );
    expect(priceOptionAgeLabel({ minAge: null, maxAge: null })).toBeNull();
  });
});

describe("priceOptionAgeMismatchMessage", () => {
  it("names the category, its range and the actual age", () => {
    expect(
      priceOptionAgeMismatchMessage(
        { label: "Kinder & Jugendliche", minAge: 6, maxAge: 17 },
        19,
      ),
    ).toBe(
      "„Kinder & Jugendliche“ gilt für 6 bis 17 Jahre — am ersten Kurstag sind es 19 Jahre.",
    );
    expect(
      priceOptionAgeMismatchMessage(
        { label: "Erwachsene", minAge: 27, maxAge: null },
        26,
      ),
    ).toBe(
      "„Erwachsene“ gilt ab 27 Jahren — am ersten Kurstag sind es 26 Jahre.",
    );
  });

  it("stays silent when the age fits or is unknown", () => {
    expect(
      priceOptionAgeMismatchMessage({ label: "Jugend", maxAge: 17 }, 12),
    ).toBeNull();
    expect(
      priceOptionAgeMismatchMessage({ label: "Jugend", maxAge: 17 }, null),
    ).toBeNull();
  });
});

describe("priceOptionsForAge", () => {
  const options = [
    { label: "Kinder", minAge: null, maxAge: 12 },
    { label: "Jugendliche", minAge: 13, maxAge: 26 },
    { label: "Erwachsene", minAge: 27, maxAge: null },
    { label: "Tagesgast", minAge: null, maxAge: null },
  ];

  it("keeps the options a given age may book", () => {
    expect(priceOptionsForAge(options, 15).map((o) => o.label)).toEqual([
      "Jugendliche",
      "Tagesgast",
    ]);
  });

  it("keeps everything while the age is unknown", () => {
    expect(priceOptionsForAge(options, null)).toHaveLength(4);
  });

  it("can come back empty when no category covers the age", () => {
    expect(priceOptionsForAge(options.slice(0, 1), 40)).toEqual([]);
  });
});

describe("validatePriceOptionAgeRange", () => {
  it("rejects a minimum above the maximum", () => {
    expect(
      validatePriceOptionAgeRange({ label: "Jugend", minAge: 18, maxAge: 12 }),
    ).toBe(
      "„Jugend“: Das Mindestalter darf nicht über dem Höchstalter liegen.",
    );
  });

  it("rejects values outside the allowed span", () => {
    expect(
      validatePriceOptionAgeRange({ label: "Jugend", minAge: -1 }),
    ).toContain("ganze Zahlen");
    expect(
      validatePriceOptionAgeRange({ label: "Jugend", maxAge: 200 }),
    ).toContain("ganze Zahlen");
    expect(
      validatePriceOptionAgeRange({ label: "Jugend", maxAge: 17.5 }),
    ).toContain("ganze Zahlen");
  });

  it("accepts equal bounds and open-ended ranges", () => {
    expect(
      validatePriceOptionAgeRange({
        label: "Jahrgang",
        minAge: 17,
        maxAge: 17,
      }),
    ).toBeNull();
    expect(validatePriceOptionAgeRange({ label: "Alle" })).toBeNull();
  });

  it("reports the first offending option of a course", () => {
    expect(
      validatePriceOptionAgeRanges([
        { label: "Gut", minAge: 6, maxAge: 17 },
        { label: "Kaputt", minAge: 30, maxAge: 20 },
      ]),
    ).toContain("„Kaputt“");
  });
});
