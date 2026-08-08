import { describe, expect, it } from "@jest/globals";
import {
  applyPlaceholders,
  findUnknownPlaceholders,
  joinNames,
} from "../course-mail-placeholders";

describe("findUnknownPlaceholders", () => {
  it("accepts known tokens regardless of case and padding", () => {
    expect(
      findUnknownPlaceholders("Hallo {{vorname}} / {{ Nachname }}"),
    ).toEqual([]);
  });

  it("reports tokens that cannot be filled", () => {
    expect(findUnknownPlaceholders("Hi {{vorname}} {{teilnehmerX}}")).toEqual([
      "teilnehmerX",
    ]);
  });

  it("reports each unknown token once", () => {
    expect(findUnknownPlaceholders("{{foo}} {{foo}}")).toEqual(["foo"]);
  });

  it("ignores braces that are not placeholders", () => {
    expect(findUnknownPlaceholders("{ vorname } und {{123}}")).toEqual([]);
  });
});

describe("applyPlaceholders", () => {
  const values = { vorname: "Anna", teilnehmer: "Ben & Clara" };

  it("substitutes known tokens", () => {
    expect(
      applyPlaceholders("Hallo {{vorname}}!", values, { escapeHtml: false }),
    ).toBe("Hallo Anna!");
  });

  it("matches case-insensitively and tolerates whitespace", () => {
    expect(
      applyPlaceholders("{{ VORNAME }}", values, { escapeHtml: false }),
    ).toBe("Anna");
  });

  it("escapes values when substituting into HTML", () => {
    expect(
      applyPlaceholders("<p>{{teilnehmer}}</p>", values, { escapeHtml: true }),
    ).toBe("<p>Ben &amp; Clara</p>");
  });

  it("does not escape values for plain-text targets like the subject", () => {
    expect(
      applyPlaceholders("{{teilnehmer}}", values, { escapeHtml: false }),
    ).toBe("Ben & Clara");
  });

  it("keeps a name that looks like markup from becoming markup", () => {
    const result = applyPlaceholders(
      "<p>{{vorname}}</p>",
      { vorname: '<img src=x onerror="alert(1)">' },
      { escapeHtml: true },
    );
    expect(result).not.toContain("<img");
    expect(result).toContain("&lt;img");
  });

  it("renders a known token with no value as an empty string", () => {
    expect(applyPlaceholders("[{{plz}}]", values, { escapeHtml: false })).toBe(
      "[]",
    );
  });

  it("leaves unknown tokens untouched", () => {
    expect(
      applyPlaceholders("{{unbekannt}}", values, { escapeHtml: false }),
    ).toBe("{{unbekannt}}");
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
