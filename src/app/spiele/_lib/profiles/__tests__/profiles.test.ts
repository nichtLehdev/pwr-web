import { describe, expect, it } from "@jest/globals";
import {
  isNameAdjective,
  isNameNoun,
  NAME_ADJECTIVES,
  NAME_NOUNS,
  profileName,
  randomName,
} from "../names";
import { gameInstruments, PROFILE_INSTRUMENTS } from "../options";
import { mergeProgress } from "../progress-merge";

describe("profile names", () => {
  it("declines the adjective to fit the noun", () => {
    expect(profileName("Flink", "Posaune")).toBe("Flinke Posaune");
    expect(profileName("Mutig", "Bass")).toBe("Mutiger Bass");
    expect(profileName("Fröhlich", "Horn")).toBe("Fröhliches Horn");
  });

  it("never shows stored text it does not know", () => {
    expect(profileName("<script>", "Horn")).toBe("Spieler:in");
    expect(profileName("Flink", "Arsch")).toBe("Spieler:in");
  });

  it("rerolls to a different name", () => {
    const avoid = { adjective: "Flink", noun: "Posaune" };
    let calls = 0;
    const rng = () => (calls++ < 2 ? 0 : 0.5);
    const next = randomName(rng, {
      adjective: NAME_ADJECTIVES[0],
      noun: "Posaune",
    });
    expect(next).not.toEqual(avoid);
    expect(isNameAdjective(next.adjective) && isNameNoun(next.noun)).toBe(true);
  });

  it("has a grammatical gender for every noun", () => {
    for (const gender of Object.values(NAME_NOUNS)) {
      expect(["m", "f", "n"]).toContain(gender);
    }
  });
});

describe("profile instruments", () => {
  it("maps to each game without duplicates", () => {
    expect(gameInstruments(["posaune", "tenorhorn"], "noten")).toEqual([
      "trombone",
    ]);
    expect(gameInstruments(["horn", "tuba"], "griffe")).toEqual([]);
    expect(gameInstruments(["trompete", "gibtsnicht"], "griffe")).toEqual([
      "trumpet_c",
    ]);
    expect(PROFILE_INSTRUMENTS.length).toBe(5);
  });
});

describe("mergeProgress", () => {
  it("keeps the better value from each device", () => {
    const phone = {
      "notenwaage.path": { ganze: { stars: 3 }, achtel: { stars: 1 } },
    };
    const tablet = {
      "notenwaage.path": {
        achtel: { stars: 2 },
        "challenge-0": { stars: 1, passed: true },
      },
    };
    expect(mergeProgress(phone, tablet)).toEqual({
      "notenwaage.path": {
        ganze: { stars: 3 },
        achtel: { stars: 2 },
        "challenge-0": { stars: 1, passed: true },
      },
    });
  });

  it("never loses a passed challenge or a record", () => {
    expect(
      mergeProgress({ passed: true, best: 40 }, { passed: false, best: 12 }),
    ).toEqual({
      passed: true,
      best: 40,
    });
  });

  it("starts from whatever exists", () => {
    expect(mergeProgress(undefined, { a: 1 })).toEqual({ a: 1 });
    expect(mergeProgress({}, { a: 1 })).toEqual({ a: 1 });
  });
});
