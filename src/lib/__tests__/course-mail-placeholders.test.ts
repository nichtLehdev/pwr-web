import { describe, expect, it } from "@jest/globals";
import {
  applyPlaceholders,
  COURSE_MAIL_PLACEHOLDER_ALIASES,
  COURSE_MAIL_PLACEHOLDER_GROUPS,
  COURSE_MAIL_PLACEHOLDERS,
  findUnknownPlaceholders,
  joinNames,
} from "../course-mail-placeholders";

describe("findUnknownPlaceholders", () => {
  it("accepts known tokens regardless of case and padding", () => {
    expect(
      findUnknownPlaceholders(
        "Hallo {{anmelder.vorname}} / {{ Anmelder.Nachname }}",
      ),
    ).toEqual([]);
  });

  it("reports tokens that cannot be filled", () => {
    expect(
      findUnknownPlaceholders("Hi {{anmelder.vorname}} {{teilnehmer.xyz}}"),
    ).toEqual(["teilnehmer.xyz"]);
  });

  it("reports each unknown token once", () => {
    expect(findUnknownPlaceholders("{{foo}} {{foo}}")).toEqual(["foo"]);
  });

  it("ignores braces that are not placeholders", () => {
    expect(findUnknownPlaceholders("{ vorname } und {{123}}")).toEqual([]);
  });

  it("still accepts the flat tokens used before the rename", () => {
    expect(
      findUnknownPlaceholders("{{vorname}} {{teilnehmer}} {{rechnungsbetrag}}"),
    ).toEqual([]);
  });
});

describe("applyPlaceholders", () => {
  const values = {
    "anmelder.vorname": "Anna",
    "teilnehmer.namen": "Ben & Clara",
  };

  it("substitutes known tokens", () => {
    expect(
      applyPlaceholders("Hallo {{anmelder.vorname}}!", values, {
        escapeHtml: false,
      }),
    ).toBe("Hallo Anna!");
  });

  it("matches case-insensitively and tolerates whitespace", () => {
    expect(
      applyPlaceholders("{{ ANMELDER.VORNAME }}", values, {
        escapeHtml: false,
      }),
    ).toBe("Anna");
  });

  it("escapes values when substituting into HTML", () => {
    expect(
      applyPlaceholders("<p>{{teilnehmer.namen}}</p>", values, {
        escapeHtml: true,
      }),
    ).toBe("<p>Ben &amp; Clara</p>");
  });

  it("does not escape values for plain-text targets like the subject", () => {
    expect(
      applyPlaceholders("{{teilnehmer.namen}}", values, { escapeHtml: false }),
    ).toBe("Ben & Clara");
  });

  it("keeps a name that looks like markup from becoming markup", () => {
    const result = applyPlaceholders(
      "<p>{{anmelder.vorname}}</p>",
      { "anmelder.vorname": '<img src=x onerror="alert(1)">' },
      { escapeHtml: true },
    );
    expect(result).not.toContain("<img");
    expect(result).toContain("&lt;img");
  });

  it("renders a known token with no value as an empty string", () => {
    expect(
      applyPlaceholders("[{{anmelder.plz}}]", values, { escapeHtml: false }),
    ).toBe("[]");
  });

  it("leaves unknown tokens untouched", () => {
    expect(
      applyPlaceholders("{{unbekannt}}", values, { escapeHtml: false }),
    ).toBe("{{unbekannt}}");
  });

  it("fills an old flat token from its renamed value", () => {
    expect(
      applyPlaceholders("Hallo {{vorname}}, {{teilnehmer}}", values, {
        escapeHtml: false,
      }),
    ).toBe("Hallo Anna, Ben & Clara");
  });
});

describe("placeholder catalogue", () => {
  it("has no duplicate tokens across groups", () => {
    const tokens = COURSE_MAIL_PLACEHOLDERS.map(
      (placeholder) => placeholder.token,
    );
    expect(new Set(tokens).size).toBe(tokens.length);
  });

  it("has a group for every placeholder", () => {
    expect(
      COURSE_MAIL_PLACEHOLDER_GROUPS.flatMap((group) => group.placeholders)
        .length,
    ).toBe(COURSE_MAIL_PLACEHOLDERS.length);
  });

  it("points every alias at a token that still exists", () => {
    const tokens = new Set(
      COURSE_MAIL_PLACEHOLDERS.map((placeholder) => placeholder.token),
    );
    for (const target of Object.values(COURSE_MAIL_PLACEHOLDER_ALIASES)) {
      expect(tokens.has(target)).toBe(true);
    }
  });
});

describe("joinNames", () => {
  it("joins one, two and three names the way a German sentence reads", () => {
    expect(joinNames(["Anna"])).toBe("Anna");
    expect(joinNames(["Anna", "Ben"])).toBe("Anna und Ben");
    expect(joinNames(["Anna", "Ben", "Clara"])).toBe("Anna, Ben und Clara");
  });

  it("drops blank entries", () => {
    expect(joinNames(["Anna", "  ", ""])).toBe("Anna");
    expect(joinNames([])).toBe("");
  });
});
