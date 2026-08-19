import { describe, expect, it } from "@jest/globals";
import {
  addressFilter,
  locationCacheKey,
  readRehearsalSchedules,
  readSocials,
  trimmed,
} from "../ensemble-import";

describe("trimmed", () => {
  it("keeps a trimmed string", () => {
    expect(trimmed("  Kirchstraße 9 ")).toBe("Kirchstraße 9");
  });

  it("treats blank and non-string values as missing", () => {
    expect(trimmed("   ")).toBeNull();
    expect(trimmed(undefined)).toBeNull();
    expect(trimmed(null)).toBeNull();
    expect(trimmed(42)).toBeNull();
  });
});

describe("addressFilter", () => {
  it("matches case-insensitively when a part is given", () => {
    expect(addressFilter("Kirchstraße 9")).toEqual({
      equals: "Kirchstraße 9",
      mode: "insensitive",
    });
  });

  it("matches SQL NULL when the part is missing, without a mode", () => {
    // `{ equals: null, mode: "insensitive" }` is not a valid Prisma filter.
    expect(addressFilter(null)).toBeNull();
  });
});

describe("locationCacheKey", () => {
  it("collapses casing so one address resolves once per run", () => {
    const a = locationCacheKey({
      street: "Kirchstraße 9",
      zipCode: "56269",
      city: "Dierdorf",
      country: null,
    });
    const b = locationCacheKey({
      street: "kirchstrasse 9".replace("ss", "ß"),
      zipCode: "56269",
      city: "DIERDORF",
      country: null,
    });
    expect(a).toBe(b);
  });

  it("keeps different addresses apart", () => {
    expect(
      locationCacheKey({
        street: "Kirchstraße 9",
        zipCode: "56269",
        city: "Dierdorf",
        country: null,
      }),
    ).not.toBe(
      locationCacheKey({
        street: "Kirchstraße 3",
        zipCode: "35581",
        city: "Wetzlar",
        country: null,
      }),
    );
  });

  it("does not let a missing part collide with a filled one", () => {
    expect(
      locationCacheKey({
        street: null,
        zipCode: "56564",
        city: "Neuwied",
        country: null,
      }),
    ).not.toBe(
      locationCacheKey({
        street: "56564",
        zipCode: null,
        city: "Neuwied",
        country: null,
      }),
    );
  });
});

describe("readSocials", () => {
  it("keeps well-formed links and trims them", () => {
    expect(
      readSocials([
        {
          type: "instagram",
          url: "  https://www.instagram.com/posaunenchor_dierdorf/  ",
          label: " @posaunenchor_dierdorf ",
        },
      ]),
    ).toEqual([
      {
        type: "instagram",
        url: "https://www.instagram.com/posaunenchor_dierdorf/",
        label: "@posaunenchor_dierdorf",
      },
    ]);
  });

  it("omits an empty label instead of storing a blank one", () => {
    expect(
      readSocials([
        { type: "instagram", url: "https://example.de", label: "" },
      ]),
    ).toEqual([{ type: "instagram", url: "https://example.de" }]);
  });

  it("defaults a missing type to website", () => {
    expect(readSocials([{ url: "https://example.de" }])).toEqual([
      { type: "website", url: "https://example.de" },
    ]);
  });

  it("drops entries without a usable url", () => {
    expect(
      readSocials([
        { type: "instagram", url: "   " },
        { type: "instagram" },
        null,
        "https://example.de",
        { type: "youtube", url: "https://youtube.com/@chor" },
      ]),
    ).toEqual([{ type: "youtube", url: "https://youtube.com/@chor" }]);
  });

  it("returns undefined for non-arrays and for arrays with nothing usable", () => {
    expect(readSocials(undefined)).toBeUndefined();
    expect(readSocials("https://example.de")).toBeUndefined();
    expect(readSocials([])).toBeUndefined();
    expect(readSocials([{ url: "" }])).toBeUndefined();
  });
});

describe("readRehearsalSchedules", () => {
  it("keeps rows that carry both day and time", () => {
    expect(
      readRehearsalSchedules([
        { day: "Montag", time: "19:30" },
        { day: " Freitag ", time: " 18:00 " },
      ]),
    ).toEqual([
      { day: "Montag", time: "19:30" },
      { day: "Freitag", time: "18:00" },
    ]);
  });

  it("drops half-filled rows, so 'nach Rücksprache' without a time is skipped", () => {
    expect(
      readRehearsalSchedules([
        { day: "nach Rücksprache" },
        { time: "19:30" },
        { day: "Montag", time: "  " },
      ]),
    ).toEqual([]);
  });

  it("ignores the extra keys an export round-trip carries", () => {
    expect(
      readRehearsalSchedules([
        {
          id: "abc",
          ensembleId: "def",
          day: "Mittwoch",
          time: "19:00",
          createdAt: "2026-08-19T00:00:00.000Z",
        },
      ]),
    ).toEqual([{ day: "Mittwoch", time: "19:00" }]);
  });

  it("returns an empty list for non-arrays", () => {
    expect(readRehearsalSchedules(undefined)).toEqual([]);
    expect(readRehearsalSchedules({ day: "Montag", time: "19:30" })).toEqual(
      [],
    );
  });
});
