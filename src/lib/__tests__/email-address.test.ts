import { describe, expect, it } from "@jest/globals";
import { isPlausibleEmail } from "@/lib/email-address";

describe("isPlausibleEmail", () => {
  it("akzeptiert gewöhnliche Adressen", () => {
    expect(isPlausibleEmail("max@example.com")).toBe(true);
    expect(isPlausibleEmail("max.mustermann+kurs@posaunenwerk.de")).toBe(true);
    expect(isPlausibleEmail("a@b.de")).toBe(true);
  });

  it("fängt die häufigen Tippfehler", () => {
    expect(isPlausibleEmail("max.example.com")).toBe(false); // @ vergessen
    expect(isPlausibleEmail("max@")).toBe(false); // Domain vergessen
    expect(isPlausibleEmail("@example.com")).toBe(false); // Name vergessen
    expect(isPlausibleEmail("max@example")).toBe(false); // keine Endung
    expect(isPlausibleEmail("max@@example.com")).toBe(false);
    expect(isPlausibleEmail("")).toBe(false);
  });

  it("weist Adressen mit Leerzeichen ab", () => {
    // Rand-Leerzeichen kommen über `input[type=email]` gar nicht erst an — die
    // schneidet der Browser ab. Die Funktion prüft sie trotzdem, weil sie auch
    // aus anderen Quellen aufgerufen werden kann; das Leerzeichen mitten drin
    // ist der Fall, der wirklich durchkommt.
    expect(isPlausibleEmail(" max@example.com")).toBe(false);
    expect(isPlausibleEmail("max@example.com ")).toBe(false);
    expect(isPlausibleEmail("max mustermann@example.com")).toBe(false);
  });
});
