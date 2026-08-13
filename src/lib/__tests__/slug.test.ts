import { describe, expect, it } from "@jest/globals";
import {
  datedSlugBase,
  ensembleSlugBase,
  isUuid,
  normalizeSlugInput,
  slugify,
  slugProblem,
  uniqueSlug,
} from "../slug";

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

describe("datedSlugBase", () => {
  it("appends the year of the Termin", () => {
    expect(
      datedSlugBase("Adventskonzert", new Date("2026-12-06T17:00:00Z")),
    ).toBe("adventskonzert-2026");
  });

  it("does not repeat a year the title already states", () => {
    expect(
      datedSlugBase("Landesposaunentag 2026", new Date("2026-06-14T10:00:00Z")),
    ).toBe("landesposaunentag-2026");
  });

  it("takes the year from German local time, not UTC", () => {
    // 00:30 on 1.1.2027 in Berlin is still 31.12.2026 in UTC.
    expect(
      datedSlugBase("Neujahrsblasen", new Date("2026-12-31T23:30:00Z")),
    ).toBe("neujahrsblasen-2027");
  });

  it("returns an empty string when the title yields nothing", () => {
    // A bare year is a worse slug than the caller's fallback.
    expect(datedSlugBase("???", new Date("2026-03-14T10:00:00Z"))).toBe("");
  });
});

describe("slugProblem", () => {
  it("accepts a well-formed slug", () => {
    expect(slugProblem("adventskonzert-2026")).toBeNull();
  });

  it("rejects an empty slug", () => {
    expect(slugProblem("")).toBe("empty");
  });

  it("rejects anything outside lowercase, digits and single dashes", () => {
    expect(slugProblem("Adventskonzert")).toBe("format");
    expect(slugProblem("advents konzert")).toBe("format");
    expect(slugProblem("adventskonzert!")).toBe("format");
    expect(slugProblem("jungbläser")).toBe("format");
    expect(slugProblem("advents--konzert")).toBe("format");
    expect(slugProblem("-adventskonzert")).toBe("format");
    expect(slugProblem("adventskonzert-")).toBe("format");
  });

  it("rejects a slug longer than the cap", () => {
    expect(slugProblem("a".repeat(81))).toBe("tooLong");
  });

  it("rejects a UUID, which the detail routes would resolve as an id", () => {
    expect(slugProblem("a9a92252-aa4c-4543-98bd-e9b51d3cd984")).toBe(
      "uuidLike",
    );
  });
});

describe("normalizeSlugInput", () => {
  it("keeps a trailing dash so the next word can still be typed", () => {
    expect(normalizeSlugInput("advents-")).toBe("advents-");
  });

  it("transliterates umlauts and turns spaces into dashes", () => {
    expect(normalizeSlugInput("Jungbläser Lehrgang")).toBe(
      "jungblaeser-lehrgang",
    );
  });

  it("collapses repeated dashes and drops a leading one", () => {
    expect(normalizeSlugInput("--advents---konzert")).toBe("advents-konzert");
  });

  it("drops characters a slug cannot carry", () => {
    expect(normalizeSlugInput("advents/konzert!2026")).toBe(
      "advents-konzert-2026",
    );
  });

  it("caps the length", () => {
    expect(normalizeSlugInput("a".repeat(200))).toHaveLength(80);
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
