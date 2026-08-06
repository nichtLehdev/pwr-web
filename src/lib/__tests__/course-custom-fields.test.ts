import { describe, expect, it } from "@jest/globals";
import {
  customFieldTypeNeedsOptions,
  formatCustomFieldValueForDisplay,
  isRequiredCustomFieldEmpty,
  isValidCustomFieldValueFormat,
  normalizeParticipantCustomFieldsValues,
  parseSelectOptionValues,
  resolveParticipantCustomFieldsForPersist,
  type CourseCustomFieldRule,
} from "../course-custom-fields";

const rule = (
  overrides: Partial<CourseCustomFieldRule> & { fieldType: string },
): CourseCustomFieldRule => ({
  fieldName: "Feld",
  options: null,
  isRequired: false,
  ...overrides,
});

describe("customFieldTypeNeedsOptions", () => {
  it("requires options for SELECT and MULTISELECT only", () => {
    expect(customFieldTypeNeedsOptions("SELECT")).toBe(true);
    expect(customFieldTypeNeedsOptions("MULTISELECT")).toBe(true);
    for (const t of ["TEXT", "NUMBER", "CHECKBOX", "DATE", "EMAIL"]) {
      expect(customFieldTypeNeedsOptions(t)).toBe(false);
    }
  });
});

describe("isValidCustomFieldValueFormat", () => {
  it("validates DATE as real ISO dates", () => {
    expect(isValidCustomFieldValueFormat("DATE", "2026-08-06")).toBe(true);
    expect(isValidCustomFieldValueFormat("DATE", "2026-02-31")).toBe(false);
    expect(isValidCustomFieldValueFormat("DATE", "06.08.2026")).toBe(false);
    expect(isValidCustomFieldValueFormat("DATE", "kein datum")).toBe(false);
  });

  it("validates TIME as HH:MM with optional seconds", () => {
    expect(isValidCustomFieldValueFormat("TIME", "09:30")).toBe(true);
    expect(isValidCustomFieldValueFormat("TIME", "23:59:59")).toBe(true);
    expect(isValidCustomFieldValueFormat("TIME", "24:00")).toBe(false);
    expect(isValidCustomFieldValueFormat("TIME", "9 Uhr")).toBe(false);
  });

  it("validates YEAR within 1900-2100", () => {
    expect(isValidCustomFieldValueFormat("YEAR", "2015")).toBe(true);
    expect(isValidCustomFieldValueFormat("YEAR", "1899")).toBe(false);
    expect(isValidCustomFieldValueFormat("YEAR", "2101")).toBe(false);
    expect(isValidCustomFieldValueFormat("YEAR", "15")).toBe(false);
  });

  it("validates EMAIL shape", () => {
    expect(isValidCustomFieldValueFormat("EMAIL", "a@b.de")).toBe(true);
    expect(isValidCustomFieldValueFormat("EMAIL", "keine mail")).toBe(false);
    expect(isValidCustomFieldValueFormat("EMAIL", "a@b")).toBe(false);
  });

  it("validates PHONE loosely but requires 6 digits", () => {
    expect(isValidCustomFieldValueFormat("PHONE", "+49 221 123456")).toBe(true);
    expect(isValidCustomFieldValueFormat("PHONE", "0221/123456")).toBe(true);
    expect(isValidCustomFieldValueFormat("PHONE", "12345")).toBe(false);
    expect(isValidCustomFieldValueFormat("PHONE", "ruf mich an")).toBe(false);
  });

  it("accepts anything for legacy types", () => {
    expect(isValidCustomFieldValueFormat("TEXT", "beliebig")).toBe(true);
    expect(isValidCustomFieldValueFormat("NUMBER", "abc")).toBe(true);
  });
});

describe("MULTISELECT normalization", () => {
  const field = rule({
    fieldName: "Instrumente",
    fieldType: "MULTISELECT",
    options: "Trompete, Posaune, Horn",
  });

  it("filters unknown options and keeps course option order", () => {
    const out = normalizeParticipantCustomFieldsValues(
      { Instrumente: ["Posaune", "Geige", "Trompete"] },
      [field],
    );
    expect(out.Instrumente).toEqual(["Trompete", "Posaune"]);
  });

  it("splits legacy comma strings", () => {
    const out = normalizeParticipantCustomFieldsValues(
      { Instrumente: "Horn, Posaune" },
      [field],
    );
    expect(out.Instrumente).toEqual(["Posaune", "Horn"]);
  });

  it("drops duplicates", () => {
    const out = normalizeParticipantCustomFieldsValues(
      { Instrumente: ["Horn", "Horn"] },
      [field],
    );
    expect(out.Instrumente).toEqual(["Horn"]);
  });
});

describe("isRequiredCustomFieldEmpty", () => {
  it("treats empty MULTISELECT arrays as missing", () => {
    expect(isRequiredCustomFieldEmpty("MULTISELECT", [])).toBe(true);
    expect(isRequiredCustomFieldEmpty("MULTISELECT", undefined)).toBe(true);
    expect(isRequiredCustomFieldEmpty("MULTISELECT", ["Horn"])).toBe(false);
  });

  it("keeps CHECKBOX and text semantics", () => {
    expect(isRequiredCustomFieldEmpty("CHECKBOX", false)).toBe(true);
    expect(isRequiredCustomFieldEmpty("CHECKBOX", true)).toBe(false);
    expect(isRequiredCustomFieldEmpty("DATE", "  ")).toBe(true);
    expect(isRequiredCustomFieldEmpty("DATE", "2026-08-06")).toBe(false);
  });
});

describe("resolveParticipantCustomFieldsForPersist", () => {
  it("rejects malformed values for the new types", () => {
    const fields = [rule({ fieldName: "Anreise", fieldType: "DATE" })];
    const bad = resolveParticipantCustomFieldsForPersist(
      { Anreise: "irgendwann" },
      fields,
    );
    expect(bad.ok).toBe(false);

    const good = resolveParticipantCustomFieldsForPersist(
      { Anreise: "2026-08-06" },
      fields,
    );
    expect(good.ok).toBe(true);
  });

  it("requires at least one MULTISELECT choice when required", () => {
    const fields = [
      rule({
        fieldName: "Workshops",
        fieldType: "MULTISELECT",
        options: "A, B",
        isRequired: true,
      }),
    ];
    expect(
      resolveParticipantCustomFieldsForPersist({ Workshops: [] }, fields).ok,
    ).toBe(false);
    const ok = resolveParticipantCustomFieldsForPersist(
      { Workshops: ["B"] },
      fields,
    );
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.customFields.Workshops).toEqual(["B"]);
  });

  it("still validates SELECT options", () => {
    const fields = [
      rule({ fieldName: "Größe", fieldType: "SELECT", options: "S, M, L" }),
    ];
    expect(
      resolveParticipantCustomFieldsForPersist({ Größe: "XL" }, fields).ok,
    ).toBe(false);
    expect(
      resolveParticipantCustomFieldsForPersist({ Größe: "M" }, fields).ok,
    ).toBe(true);
  });

  it("ignores format checks for empty optional values", () => {
    const fields = [rule({ fieldName: "Mail", fieldType: "EMAIL" })];
    expect(
      resolveParticipantCustomFieldsForPersist({ Mail: "" }, fields).ok,
    ).toBe(true);
    expect(resolveParticipantCustomFieldsForPersist({}, fields).ok).toBe(true);
  });
});

describe("formatCustomFieldValueForDisplay", () => {
  it("joins arrays and formats booleans and ISO dates", () => {
    expect(formatCustomFieldValueForDisplay(["A", "B"])).toBe("A, B");
    expect(formatCustomFieldValueForDisplay([])).toBe("–");
    expect(formatCustomFieldValueForDisplay(true)).toBe("Ja");
    expect(formatCustomFieldValueForDisplay(false)).toBe("Nein");
    expect(formatCustomFieldValueForDisplay("2026-08-06")).toBe("06.08.2026");
    expect(formatCustomFieldValueForDisplay("frei")).toBe("frei");
    expect(formatCustomFieldValueForDisplay(null)).toBe("–");
  });
});

describe("parseSelectOptionValues", () => {
  it("parses comma strings and arrays", () => {
    expect(parseSelectOptionValues("A, B ,C,")).toEqual(["A", "B", "C"]);
    expect(parseSelectOptionValues(["A", " B "])).toEqual(["A", "B"]);
    expect(parseSelectOptionValues(null)).toEqual([]);
  });
});
