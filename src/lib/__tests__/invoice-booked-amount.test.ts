import { describe, expect, it } from "@jest/globals";
import { bookedAmountFor } from "@/lib/invoice-payment";

describe("bookedAmountFor", () => {
  it("speichert den vollen Betrag nicht als Zahl", () => {
    expect(bookedAmountFor(120, 120)).toBeUndefined();
  });

  it("behandelt Cent-gleiche Float-Summen als voll", () => {
    // 0.1 + 0.2 === 0.30000000000000004 — ohne Cent-Rundung wäre das eine
    // Teilzahlung über den vollen Betrag.
    expect(bookedAmountFor(0.1 + 0.2, 0.3)).toBeUndefined();
  });

  it("gibt Teilzahlungen als Zahl zurück", () => {
    expect(bookedAmountFor(50, 120)).toBe(50);
  });

  it("gibt auch Überzahlungen als Zahl zurück", () => {
    // Der Zahlungsstand rechnet sie als bezahlt, der Betrag bleibt aber
    // dokumentiert — sonst verschwindet die Differenz spurlos.
    expect(bookedAmountFor(130, 120)).toBe(130);
  });

  it("unterscheidet Beträge unterhalb eines Cents nicht", () => {
    expect(bookedAmountFor(120.001, 120)).toBeUndefined();
    expect(bookedAmountFor(120.01, 120)).toBe(120.01);
  });
});
