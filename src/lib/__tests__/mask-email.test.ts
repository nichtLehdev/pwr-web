import { describe, expect, it } from "@jest/globals";
import { maskEmail } from "@/lib/mask-email";

describe("maskEmail", () => {
  it("behält die Domain und verbirgt die Person", () => {
    expect(maskEmail("max.mustermann@gmx.de")).toBe("m***@gmx.de");
    expect(maskEmail("a@t-online.de")).toBe("a***@t-online.de");
  });

  it("trennt an der letzten Klammeraffen-Stelle", () => {
    // Ein @ im lokalen Teil ist zulässig, wenn er in Anführungszeichen steht.
    expect(maskEmail('"weird@local"@example.com')).toBe('"***@example.com');
  });

  it("gibt nichts preis, wenn die Eingabe keine Adresse ist", () => {
    expect(maskEmail("keine-adresse")).toBe("***");
    expect(maskEmail("@example.com")).toBe("***");
    expect(maskEmail("max@")).toBe("***");
  });

  it("verträgt fehlende Werte", () => {
    expect(maskEmail(null)).toBe("(keine Adresse)");
    expect(maskEmail(undefined)).toBe("(keine Adresse)");
    expect(maskEmail("")).toBe("(keine Adresse)");
  });
});
