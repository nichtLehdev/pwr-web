import { describe, expect, it } from "@jest/globals";
import { PASSWORD_MIN_LENGTH, scorePassword } from "../password-strength";

describe("password strength", () => {
  it("stays at zero below the enforced minimum", () => {
    expect(scorePassword("Ab1!x").score).toBe(0);
    expect(scorePassword("Ab1!x").hint).toContain("Zeichen bis zum Minimum");
  });

  it("returns no verdict for an untouched field", () => {
    expect(scorePassword("")).toEqual({
      score: 0,
      label: "Sehr schwach",
      hint: "",
    });
  });

  it("caps short passwords at 'Mittel' even with all character classes", () => {
    const short = "Ab1!Cd2?"; // exactly the minimum, all four classes
    expect(short).toHaveLength(PASSWORD_MIN_LENGTH);
    expect(scorePassword(short).score).toBe(2);
  });

  it("rewards length over character-class bingo", () => {
    const longSimple = scorePassword("blechblasinstrumente");
    const shortComplex = scorePassword("Xk7$pQ2!");
    expect(longSimple.score).toBeGreaterThan(shortComplex.score);
  });

  it("reaches the top score for a long mixed password", () => {
    expect(scorePassword("Weit3rNoten!Pult#7x").score).toBe(4);
  });

  it("penalises common words", () => {
    const strength = scorePassword("MeinPasswort2026!");
    expect(strength.hint).toBe("Enthält ein sehr gebräuchliches Wort");
    expect(strength.score).toBeLessThan(4);
  });

  it("penalises keyboard and alphabet sequences", () => {
    expect(scorePassword("Xy!mnopqrst9Lk").hint).toContain("Zeichenfolge");
    expect(scorePassword("Zq!efgh4712mn").hint).toContain("Zeichenfolge");
  });

  it("penalises repeated characters", () => {
    expect(scorePassword("Blech!aaaa9Ton").hint).toBe(
      "Enthält ein mehrfach wiederholtes Zeichen",
    );
  });
});
