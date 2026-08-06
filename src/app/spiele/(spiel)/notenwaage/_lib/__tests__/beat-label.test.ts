import { describe, expect, it } from "@jest/globals";
import { unitsToBeatLabel } from "../beat-label";

describe("unitsToBeatLabel", () => {
  it("rendert ganze Schlagzahlen mit korrektem Numerus", () => {
    expect(unitsToBeatLabel(24)).toBe("1 Schlag");
    expect(unitsToBeatLabel(48)).toBe("2 Schläge");
    expect(unitsToBeatLabel(72)).toBe("3 Schläge");
    expect(unitsToBeatLabel(96)).toBe("4 Schläge");
    expect(unitsToBeatLabel(144)).toBe("6 Schläge");
    expect(unitsToBeatLabel(0)).toBe("0 Schläge");
  });

  it("rendert reine Brüche als Unicode-Bruch", () => {
    expect(unitsToBeatLabel(12)).toBe("½ Schlag");
    expect(unitsToBeatLabel(6)).toBe("¼ Schlag");
    expect(unitsToBeatLabel(3)).toBe("⅛ Schlag");
    expect(unitsToBeatLabel(18)).toBe("¾ Schläge");
    expect(unitsToBeatLabel(9)).toBe("⅜ Schläge");
  });

  it("rendert gemischte Zahlen ohne Leerzeichen vor dem Unicode-Bruch", () => {
    expect(unitsToBeatLabel(36)).toBe("1½ Schläge");
    expect(unitsToBeatLabel(30)).toBe("1¼ Schläge");
    expect(unitsToBeatLabel(60)).toBe("2½ Schläge");
    expect(unitsToBeatLabel(42)).toBe("1¾ Schläge");
  });

  it("fällt auf x/y zurück, wenn kein Unicode-Bruch existiert", () => {
    expect(unitsToBeatLabel(1)).toBe("1/24 Schlag");
    expect(unitsToBeatLabel(5)).toBe("5/24 Schläge");
    expect(unitsToBeatLabel(25)).toBe("1 1/24 Schläge");
  });

  it("verwendet nie gerundete Dezimalzahlen", () => {
    // Regression: 32tel (3 Einheiten) war zuvor "0.13 Schläge".
    for (const units of [3, 6, 9, 12, 18, 24, 36, 48]) {
      expect(unitsToBeatLabel(units)).not.toMatch(/\d\.\d/);
    }
  });
});
