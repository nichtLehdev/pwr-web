import { describe, expect, it } from "@jest/globals";
import {
  USERNAME_MAX_LENGTH,
  describeUsernameProblem,
  normalizeUsername,
  suggestUsername,
} from "@/lib/username";

/**
 * Die Erwartungen spiegeln das username-Plugin von better-auth: 3–30 Zeichen,
 * `[a-zA-Z0-9_.]`, Vergleich kleingeschrieben. Ein Vorschlag, der hier
 * durchfällt, wird bei der Registrierung mit 400 abgelehnt.
 */

describe("suggestUsername", () => {
  it("setzt Vor- und Nachnamen zusammen", () => {
    expect(suggestUsername("Anna", "Meyer")).toBe("anna.meyer");
  });

  it("wirft den Bindestrich aus Doppelnamen weg", () => {
    expect(suggestUsername("Anna", "Meyer-Klein")).toBe("anna.meyerklein");
  });

  it("schreibt Umlaute und ß aus", () => {
    expect(suggestUsername("Jürgen", "Weiß")).toBe("juergen.weiss");
    expect(suggestUsername("Ökonom", "Ärmel")).toBe("oekonom.aermel");
  });

  it("kürzt lange Namen auf die erlaubte Länge", () => {
    const suggestion = suggestUsername("Maximilian", "Baumgartner-Hofmeister");

    expect(suggestion.length).toBeLessThanOrEqual(USERNAME_MAX_LENGTH);
    expect(suggestion).toBe("maximilian.baumgartnerhofmeist");
    expect(describeUsernameProblem(suggestion)).toBeNull();
  });

  it("kürzt auch, wenn schon der Vorname zu lang ist", () => {
    const suggestion = suggestUsername(
      "Konstantinopolitanischerdudelsackpfeifer",
      "Meyer",
    );

    expect(suggestion.length).toBeLessThanOrEqual(USERNAME_MAX_LENGTH);
    expect(suggestion.endsWith(".")).toBe(false);
    expect(describeUsernameProblem(suggestion)).toBeNull();
  });

  it("liefert für Namen ohne verwertbare Zeichen einen leeren Vorschlag", () => {
    // Lieber leer als ein Vorschlag, den die Registrierung ablehnt.
    expect(suggestUsername("", "")).toBe("");
    expect(suggestUsername("李", "王")).toBe("");
  });
});

describe("describeUsernameProblem", () => {
  it("nimmt gültige Namen an", () => {
    expect(describeUsernameProblem("anna.meyer")).toBeNull();
    expect(describeUsernameProblem("anna_meyer99")).toBeNull();
    // Großschreibung ist erlaubt, better-auth schreibt selbst klein.
    expect(describeUsernameProblem("Anna.Meyer")).toBeNull();
  });

  it("lehnt Bindestriche ab", () => {
    expect(describeUsernameProblem("anna.meyer-klein")).toMatch(/Unterstrich/);
  });

  it("lehnt Leerzeichen und Umlaute ab", () => {
    expect(describeUsernameProblem("anna meyer")).not.toBeNull();
    expect(describeUsernameProblem("jürgen.weiss")).not.toBeNull();
  });

  it("achtet auf die Länge", () => {
    expect(describeUsernameProblem("ab")).toMatch(/Mindestens/);
    expect(describeUsernameProblem("a".repeat(31))).toMatch(/Höchstens/);
    expect(describeUsernameProblem("a".repeat(30))).toBeNull();
  });
});

describe("normalizeUsername", () => {
  it("schreibt klein und entfernt Leerraum", () => {
    expect(normalizeUsername("  Anna.Meyer ")).toBe("anna.meyer");
  });
});
