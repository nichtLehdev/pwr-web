import { describe, expect, it } from "@jest/globals";
import {
  formatPhoneNumber,
  formatPhoneNumberInternational,
  formatPhoneNumberOrNull,
  internationalPhoneSchema,
  phoneSchema,
} from "../phone-number";

describe("formatPhoneNumber", () => {
  it("keeps the split the author wrote and swaps the separator", () => {
    expect(formatPhoneNumber("0176/22994781")).toBe("0176 22994781");
    expect(formatPhoneNumber("01575-2362265")).toBe("01575 2362265");
    expect(formatPhoneNumber("06897 5010706")).toBe("06897 5010706");
  });

  it("collapses grouping inside the subscriber number", () => {
    expect(formatPhoneNumber("0178- 617 2000")).toBe("0178 6172000");
    expect(formatPhoneNumber("0261/667 98 27")).toBe("0261 6679827");
  });

  it("writes a German number nationally rather than as +49", () => {
    expect(formatPhoneNumber("+49 171-9530 373")).toBe("0171 9530373");
    expect(formatPhoneNumber("+49171/9530373")).toBe("0171 9530373");
  });

  it("keeps a foreign country code", () => {
    expect(formatPhoneNumber("+41 44/123 45 67")).toBe("+41 44 1234567");
  });

  it("handles the short numbers in the data", () => {
    expect(formatPhoneNumber("02228/327")).toBe("02228 327");
    expect(formatPhoneNumber("06441/24890")).toBe("06441 24890");
  });

  it("strips non-breaking spaces from spreadsheet exports", () => {
    expect(formatPhoneNumber(" +49 171-9530 373")).toBe("0171 9530373");
    expect(formatPhoneNumber("0176 72213949")).toBe("0176 72213949");
  });

  it("leaves a number without a separator unsplit instead of guessing", () => {
    // Area code length is not derivable from the digits, so nothing is invented.
    expect(formatPhoneNumber("017622994781")).toBe("017622994781");
  });

  it("is idempotent, so re-running the backfill changes nothing", () => {
    const once = formatPhoneNumber("0178- 617 2000");
    expect(formatPhoneNumber(once)).toBe(once);
  });

  it("returns an empty string for blank input", () => {
    expect(formatPhoneNumber("")).toBe("");
    expect(formatPhoneNumber("   ")).toBe("");
  });

  it("drops a trailing separator without inventing a subscriber number", () => {
    expect(formatPhoneNumber("0261/")).toBe("0261");
  });
});

describe("formatPhoneNumberOrNull", () => {
  it("passes null and undefined through", () => {
    expect(formatPhoneNumberOrNull(null)).toBeNull();
    expect(formatPhoneNumberOrNull(undefined)).toBeNull();
  });

  it("turns a blank value into null rather than an empty string", () => {
    expect(formatPhoneNumberOrNull("  ")).toBeNull();
  });

  it("formats a real value", () => {
    expect(formatPhoneNumberOrNull("0151-54373041")).toBe("0151 54373041");
  });
});

describe("formatPhoneNumberInternational", () => {
  it("turns a German national number into +49", () => {
    expect(formatPhoneNumberInternational("0176/22994781")).toBe(
      "+49 176 22994781",
    );
    expect(formatPhoneNumberInternational("06897 5010706")).toBe(
      "+49 6897 5010706",
    );
    expect(formatPhoneNumberInternational("02228/327")).toBe("+49 2228 327");
  });

  it("keeps a country code that is already there", () => {
    expect(formatPhoneNumberInternational("+49 171-9530 373")).toBe(
      "+49 171 9530373",
    );
    expect(formatPhoneNumberInternational("+41 44/123 45 67")).toBe(
      "+41 44 1234567",
    );
  });

  it("reads 00 as the international prefix", () => {
    expect(formatPhoneNumberInternational("0049 176/22994781")).toBe(
      "+49 176 22994781",
    );
    expect(formatPhoneNumberInternational("0041 44/1234567")).toBe(
      "+41 44 1234567",
    );
  });

  it("handles a +49 number written without a separator", () => {
    expect(formatPhoneNumberInternational("+4917634264358")).toBe(
      "+49 17634264358",
    );
  });

  it("leaves a foreign number without a separator alone", () => {
    // Where the country code ends is not decidable here, and a wrong split
    // is worse than an unsplit number.
    expect(formatPhoneNumberInternational("+41791234567")).toBe("+41791234567");
  });

  it("is idempotent, so re-running the backfill changes nothing", () => {
    const once = formatPhoneNumberInternational("0176/22994781");
    expect(formatPhoneNumberInternational(once)).toBe(once);
    const foreign = formatPhoneNumberInternational("+41 44/123 45 67");
    expect(formatPhoneNumberInternational(foreign)).toBe(foreign);
  });

  it("returns an empty string for blank input", () => {
    expect(formatPhoneNumberInternational("   ")).toBe("");
  });

  it("leaves input without any digits alone instead of making it +49", () => {
    // Old registration rows hold junk like this; turning it into "+49" would
    // read as a real number.
    expect(formatPhoneNumberInternational("bbbbbbb")).toBe("bbbbbbb");
    expect(formatPhoneNumberInternational('console.log("aaaa");  ')).toBe(
      'console.log("aaaa");',
    );
  });
});

describe("the zod schemas", () => {
  it("normalise a valid number while parsing", () => {
    expect(phoneSchema.parse("0176/22994781")).toBe("0176 22994781");
    expect(internationalPhoneSchema.parse("0176/22994781")).toBe(
      "+49 176 22994781",
    );
  });

  it("still reject what the old inline validator rejected", () => {
    expect(phoneSchema.safeParse("kein Telefon").success).toBe(false);
    expect(internationalPhoneSchema.safeParse("kein Telefon").success).toBe(
      false,
    );
    expect(phoneSchema.safeParse("1".repeat(51)).success).toBe(false);
  });
});
