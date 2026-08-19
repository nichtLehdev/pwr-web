import { describe, expect, it } from "@jest/globals";
import { formatPhoneNumber, formatPhoneNumberOrNull } from "../phone-number";

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
