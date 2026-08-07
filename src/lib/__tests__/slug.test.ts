import { describe, expect, it } from "@jest/globals";
import { ensembleSlugBase, isUuid, slugify, uniqueSlug } from "../slug";

describe("slugify", () => {
  it("lowercases and joins words with dashes", () => {
    expect(slugify("Wichtige Impulse im Vorstand")).toBe(
      "wichtige-impulse-im-vorstand",
    );
  });

  it("transliterates umlauts instead of stripping them", () => {
    expect(slugify("Jungbläserlehrgang")).toBe("jungblaeserlehrgang");
    expect(slugify("Über uns")).toBe("ueber-uns");
    expect(slugify("Große Straße")).toBe("grosse-strasse");
  });

  it("spells out ampersands", () => {
    expect(slugify("Literatur & CDs")).toBe("literatur-und-cds");
  });

  it("strips diacritics that survive transliteration", () => {
    expect(slugify("Café Résumé")).toBe("cafe-resume");
  });

  it("collapses punctuation and trims stray dashes", () => {
    expect(slugify("  Posaunenwart*in — gesucht!  ")).toBe(
      "posaunenwart-in-gesucht",
    );
  });

  it("returns an empty string when nothing usable remains", () => {
    expect(slugify("!!! ???")).toBe("");
    expect(slugify("日本語")).toBe("");
  });

  it("truncates long titles on a word boundary", () => {
    const slug = slugify(
      "Ein ganz besonders langer Titel ueber einen Lehrgang fuer fortgeschrittene Blaeserinnen und Blaeser im Rheinland",
    );
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith("-")).toBe(false);
    // The cut lands between words, so no partial word is left behind.
    expect(slug).toBe(
      "ein-ganz-besonders-langer-titel-ueber-einen-lehrgang-fuer-fortgeschrittene",
    );
  });
});

describe("uniqueSlug", () => {
  it("returns the base slug when it is free", async () => {
    await expect(
      uniqueSlug("konzert", async () => false, "beitrag"),
    ).resolves.toBe("konzert");
  });

  it("appends a counter until it finds a free slug", async () => {
    const taken = new Set(["konzert", "konzert-2", "konzert-3"]);
    await expect(
      uniqueSlug(
        "konzert",
        async (candidate) => taken.has(candidate),
        "beitrag",
      ),
    ).resolves.toBe("konzert-4");
  });

  it("falls back when the title produced no usable slug", async () => {
    await expect(uniqueSlug("", async () => false, "beitrag")).resolves.toBe(
      "beitrag",
    );
  });
});

describe("ensembleSlugBase", () => {
  it("appends the town when the name does not carry it", () => {
    expect(ensembleSlugBase("Bläserkreis der Friedenskirche", "Essen")).toBe(
      "blaeserkreis-der-friedenskirche-essen",
    );
  });

  it("does not repeat a town the name already states", () => {
    expect(ensembleSlugBase("Posaunenchor Voerde", "Voerde")).toBe(
      "posaunenchor-voerde",
    );
    expect(ensembleSlugBase("Posaunenchor Essen-Altendorf", "Essen")).toBe(
      "posaunenchor-essen-altendorf",
    );
  });

  it("matches a town that is only part of the location's city", () => {
    expect(ensembleSlugBase("Posaunenchor Orsoy", "Rheinberg-Orsoy")).toBe(
      "posaunenchor-orsoy",
    );
    expect(
      ensembleSlugBase(
        "Posaunenchor des CVJM Styrum",
        "Mülheim an der Ruhr-Styrum",
      ),
    ).toBe("posaunenchor-des-cvjm-styrum");
  });

  it("ignores short connectors shared by many Ortsnamen", () => {
    // "an"/"der" must not count as proof the town is already named.
    expect(ensembleSlugBase("Bläserkreis an der Kirche", "Moers")).toBe(
      "blaeserkreis-an-der-kirche-moers",
    );
  });

  it("falls back to the name when there is no location", () => {
    expect(ensembleSlugBase("Posaunenchor Neuweiler", null)).toBe(
      "posaunenchor-neuweiler",
    );
  });
});

describe("isUuid", () => {
  it("recognises the legacy identifiers", () => {
    expect(isUuid("a9a92252-aa4c-4543-98bd-e9b51d3cd984")).toBe(true);
  });

  it("rejects slugs", () => {
    expect(isUuid("wichtige-impulse-im-vorstand")).toBe(false);
    expect(isUuid("a9a92252")).toBe(false);
  });
});
