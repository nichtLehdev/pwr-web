import { describe, expect, it } from "@jest/globals";
import { pairPriceOptions } from "../price-option-pairing";

const stored = [
  { id: "a", label: "Erwachsene Doppelzimmer", price: 195 },
  { id: "b", label: "Erwachsene Einzelzimmer", price: 195 },
  { id: "c", label: "Erwachsene Einzelzimmer", price: 255 },
  { id: "d", label: "Kinder und Jugendliche", price: 155 },
];

describe("price option pairing", () => {
  it("keeps duplicate labels apart by id", () => {
    // Der gemeldete Fall: zwei Kategorien heißen gleich, haben aber
    // verschiedene Preise. Ein Label-Treffer darf den id-Treffer nicht
    // überholen — sonst meldet der Guard eine Preisänderung, die niemand
    // vorgenommen hat.
    const inputs = stored.map((option) => ({ ...option }));
    const pairing = pairPriceOptions(inputs, stored);

    for (const input of inputs) {
      expect(pairing.get(input)?.id).toBe(input.id);
      expect(pairing.get(input)?.price).toBe(input.price);
    }
  });

  it("survives an input order that puts the second duplicate first", () => {
    const inputs = [
      { id: "c", label: "Erwachsene Einzelzimmer", price: 255 },
      { id: "b", label: "Erwachsene Einzelzimmer", price: 195 },
    ];
    const pairing = pairPriceOptions(inputs, stored);
    expect(pairing.get(inputs[0]!)?.id).toBe("c");
    expect(pairing.get(inputs[1]!)?.id).toBe("b");
  });

  it("never hands the same stored row to two inputs", () => {
    const inputs = [
      { label: "Erwachsene Einzelzimmer" },
      { label: "Erwachsene Einzelzimmer" },
    ];
    const pairing = pairPriceOptions(inputs, stored);
    const claimed = [...pairing.values()].map((option) => option.id);
    expect(new Set(claimed).size).toBe(claimed.length);
    expect(claimed).toHaveLength(2);
  });

  it("falls back to the label when the input carries no id", () => {
    const inputs = [{ label: "Kinder und Jugendliche" }];
    const pairing = pairPriceOptions(inputs, stored);
    expect(pairing.get(inputs[0]!)?.id).toBe("d");
  });

  it("prefers the id match even when another row's label collides first", () => {
    const inputs = [{ id: "c", label: "Erwachsene Einzelzimmer" }];
    const pairing = pairPriceOptions(inputs, stored);
    expect(pairing.get(inputs[0]!)?.id).toBe("c");
  });

  it("leaves a genuinely new option unpaired", () => {
    const inputs = [{ id: undefined, label: "Neue Kategorie" }];
    const pairing = pairPriceOptions(inputs, stored);
    expect(pairing.get(inputs[0]!)).toBeUndefined();
  });

  it("leaves an unknown id unpaired rather than guessing by label", () => {
    const inputs = [{ id: "gone", label: "Erwachsene Doppelzimmer" }];
    const pairing = pairPriceOptions(inputs, stored);
    // Label-Fallback greift, weil "a" noch frei ist — das ist gewollt: eine
    // umbenannte id-lose Kategorie soll weiterhin zugeordnet werden.
    expect(pairing.get(inputs[0]!)?.id).toBe("a");
  });
});
