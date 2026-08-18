import { describe, expect, it } from "@jest/globals";
import {
  needsDistinguishingDescription,
  participantPriceOptionLabel,
  priceOptionDisplayLabel,
  resolveParticipantPriceOption,
  validatePriceOptionDistinctness,
} from "../course-price-options";

const options = [
  {
    label: "Erwachsene Einzelzimmer",
    description: "Übernachtung in Haus Wasserburg",
  },
  {
    label: "Erwachsene Einzelzimmer",
    description: "Übernachtung in Haus Marienau",
  },
  { label: "Kinder und Jugendliche", description: "Bis 18 Jahre" },
  { label: "Erwachsene Doppelzimmer", description: null },
];

describe("priceOptionDisplayLabel", () => {
  it("appends the description when the label is not unique", () => {
    expect(priceOptionDisplayLabel(options[0]!, options)).toBe(
      "Erwachsene Einzelzimmer (Übernachtung in Haus Wasserburg)",
    );
    expect(priceOptionDisplayLabel(options[1]!, options)).toBe(
      "Erwachsene Einzelzimmer (Übernachtung in Haus Marienau)",
    );
  });

  it("leaves a unique label alone even when it has a description", () => {
    expect(priceOptionDisplayLabel(options[2]!, options)).toBe(
      "Kinder und Jugendliche",
    );
  });

  it("leaves a label without a description alone", () => {
    expect(priceOptionDisplayLabel(options[3]!, options)).toBe(
      "Erwachsene Doppelzimmer",
    );
  });

  it("adds nothing when duplicates carry no description to tell them apart", () => {
    const bare = [
      { label: "Standard", description: null },
      { label: "Standard", description: null },
    ];
    expect(priceOptionDisplayLabel(bare[0]!, bare)).toBe("Standard");
  });

  it("ignores a whitespace-only description", () => {
    const blank = [
      { label: "Standard", description: "   " },
      { label: "Standard", description: "   " },
    ];
    expect(priceOptionDisplayLabel(blank[0]!, blank)).toBe("Standard");
  });

  it("works on a single-option course", () => {
    const one = [{ label: "Teilnehmerbeitrag", description: "inkl. Vollpension" }];
    expect(priceOptionDisplayLabel(one[0]!, one)).toBe("Teilnehmerbeitrag");
  });
});

describe("resolveParticipantPriceOption", () => {
  const withIds = [
    { id: "wasserburg", label: "Erwachsene Einzelzimmer", price: 195 },
    { id: "marienau", label: "Erwachsene Einzelzimmer", price: 255 },
    { id: "kinder", label: "Kinder und Jugendliche", price: 155 },
  ];

  it("resolves by id, ignoring an earlier same-label option", () => {
    const option = resolveParticipantPriceOption(
      { priceOptionId: "marienau", priceOption: "Erwachsene Einzelzimmer" },
      withIds,
    );
    expect(option?.price).toBe(255);
  });

  it("falls back to a unique label when no id is stored", () => {
    const option = resolveParticipantPriceOption(
      { priceOptionId: null, priceOption: "Kinder und Jugendliche" },
      withIds,
    );
    expect(option?.id).toBe("kinder");
  });

  it("refuses to guess when the label is duplicated", () => {
    expect(
      resolveParticipantPriceOption(
        { priceOptionId: null, priceOption: "Erwachsene Einzelzimmer" },
        withIds,
      ),
    ).toBeUndefined();
  });

  it("returns undefined for an unknown id", () => {
    expect(
      resolveParticipantPriceOption({ priceOptionId: "gone" }, withIds),
    ).toBeUndefined();
  });

  it("handles a course without price options", () => {
    expect(
      resolveParticipantPriceOption({ priceOption: "Egal" }, []),
    ).toBeUndefined();
    expect(
      resolveParticipantPriceOption({ priceOption: "Egal" }, null),
    ).toBeUndefined();
  });
});

describe("participantPriceOptionLabel", () => {
  const courseOptions = [
    {
      id: "wasserburg",
      label: "Erwachsene Einzelzimmer",
      description: "Übernachtung in Haus Wasserburg",
    },
    {
      id: "marienau",
      label: "Erwachsene Einzelzimmer",
      description: "Übernachtung in Haus Marienau",
    },
    { id: "kinder", label: "Kinder und Jugendliche", description: null },
  ];

  it("disambiguates a booked duplicate via its id", () => {
    expect(
      participantPriceOptionLabel(
        { priceOptionId: "wasserburg", priceOption: "Erwachsene Einzelzimmer" },
        courseOptions,
      ),
    ).toBe("Erwachsene Einzelzimmer (Übernachtung in Haus Wasserburg)");
  });

  it("leaves a unique category as-is", () => {
    expect(
      participantPriceOptionLabel({ priceOptionId: "kinder" }, courseOptions),
    ).toBe("Kinder und Jugendliche");
  });

  it("keeps the stored snapshot when the category cannot be resolved", () => {
    // Altbestand mit mehrdeutigem Label: disambiguieren geht nicht, aber der
    // Name von damals ist besser als eine leere Zelle.
    expect(
      participantPriceOptionLabel(
        { priceOptionId: null, priceOption: "Erwachsene Einzelzimmer" },
        courseOptions,
      ),
    ).toBe("Erwachsene Einzelzimmer");
  });

  it("keeps the snapshot of a deleted category", () => {
    expect(
      participantPriceOptionLabel(
        { priceOptionId: null, priceOption: "Doppelzimmer⠀" },
        courseOptions,
      ),
    ).toBe("Doppelzimmer⠀");
  });

  it("returns an empty string when nothing was stored", () => {
    expect(participantPriceOptionLabel({}, courseOptions)).toBe("");
  });
});

describe("validatePriceOptionDistinctness", () => {
  it("accepts unique labels without descriptions", () => {
    expect(
      validatePriceOptionDistinctness([
        { label: "Erwachsene" },
        { label: "Kinder" },
      ]),
    ).toBeNull();
  });

  it("accepts duplicated labels with distinct descriptions", () => {
    expect(
      validatePriceOptionDistinctness([
        { label: "Einzelzimmer", description: "Haus Wasserburg" },
        { label: "Einzelzimmer", description: "Haus Marienau" },
      ]),
    ).toBeNull();
  });

  it("rejects duplicated labels without descriptions", () => {
    const error = validatePriceOptionDistinctness([
      { label: "Einzelzimmer" },
      { label: "Einzelzimmer" },
    ]);
    expect(error).toContain("Einzelzimmer");
    expect(error).toContain("Beschreibung");
  });

  it("rejects when only one of the duplicates has a description", () => {
    expect(
      validatePriceOptionDistinctness([
        { label: "Einzelzimmer", description: "Haus Marienau" },
        { label: "Einzelzimmer", description: "" },
      ]),
    ).toContain("Einzelzimmer");
  });

  it("rejects duplicated labels with identical descriptions", () => {
    expect(
      validatePriceOptionDistinctness([
        { label: "Einzelzimmer", description: "Haus Marienau" },
        { label: "Einzelzimmer", description: "Haus Marienau" },
      ]),
    ).toContain("dieselbe Beschreibung");
  });

  it("treats a whitespace-only description as missing", () => {
    expect(
      validatePriceOptionDistinctness([
        { label: "Einzelzimmer", description: "  " },
        { label: "Einzelzimmer", description: "Haus Marienau" },
      ]),
    ).toContain("Beschreibung");
  });

  it("ignores leading and trailing space when comparing labels", () => {
    expect(
      validatePriceOptionDistinctness([
        { label: "Einzelzimmer" },
        { label: " Einzelzimmer " },
      ]),
    ).toContain("Einzelzimmer");
  });

  it("passes an empty list", () => {
    expect(validatePriceOptionDistinctness([])).toBeNull();
  });
});

describe("needsDistinguishingDescription", () => {
  it("flags a duplicate name without a description", () => {
    const options = [{ label: "Standard" }, { label: "Standard" }];
    expect(needsDistinguishingDescription(options[0]!, options)).toBe(true);
  });

  it("flags duplicates that share the same description", () => {
    const options = [
      { label: "Einzelzimmer", description: "Marienau" },
      { label: "Einzelzimmer", description: "Marienau" },
    ];
    expect(needsDistinguishingDescription(options[0]!, options)).toBe(true);
  });

  it("clears once the descriptions differ", () => {
    const options = [
      { label: "Einzelzimmer", description: "Wasserburg" },
      { label: "Einzelzimmer", description: "Marienau" },
    ];
    expect(needsDistinguishingDescription(options[0]!, options)).toBe(false);
  });

  it("stays quiet for a unique name", () => {
    const options = [{ label: "Erwachsene" }, { label: "Kinder" }];
    expect(needsDistinguishingDescription(options[0]!, options)).toBe(false);
  });

  it("stays quiet for a row the user has not named yet", () => {
    const options = [{ label: "" }, { label: "" }];
    expect(needsDistinguishingDescription(options[0]!, options)).toBe(false);
  });
});
