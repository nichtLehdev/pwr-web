import { describe, expect, it } from "@jest/globals";
import { containedRect, isOnContainedImage, zoomLabel } from "@/lib/image-zoom";

describe("zoomLabel", () => {
  it("nennt das Bild mit seinem Alternativtext", () => {
    expect(zoomLabel("Con Spirito im Dom")).toBe(
      "Bild vergrößern: Con Spirito im Dom",
    );
  });

  it("fällt ohne Alternativtext auf den reinen Befehl zurück", () => {
    expect(zoomLabel("")).toBe("Bild vergrößern");
    expect(zoomLabel("   ")).toBe("Bild vergrößern");
    expect(zoomLabel(null)).toBe("Bild vergrößern");
    expect(zoomLabel(undefined)).toBe("Bild vergrößern");
  });
});

describe("containedRect", () => {
  // Fläche der Lightbox bei 1440×900: 1312×771 ab (64, 68).
  const box = { left: 64, top: 68, width: 1312, height: 771 };

  it("rahmt ein Querformat links und rechts ein", () => {
    // 3:2 ist schmaler als die Fläche, die Höhe begrenzt.
    const rect = containedRect(box, 1500, 1000)!;
    expect(rect.height).toBeCloseTo(771);
    expect(rect.width).toBeCloseTo(1156.5);
    expect(rect.left).toBeCloseTo(64 + (1312 - 1156.5) / 2);
    expect(rect.top).toBeCloseTo(68);
  });

  it("rahmt ein Breitbild oben und unten ein", () => {
    const rect = containedRect(box, 3000, 1000)!;
    expect(rect.width).toBeCloseTo(1312);
    expect(rect.height).toBeCloseTo(437.33, 1);
    expect(rect.left).toBeCloseTo(64);
    expect(rect.top).toBeCloseTo(68 + (771 - 437.33) / 2, 1);
  });

  it("skaliert kleine Vorlagen auf die Fläche hoch", () => {
    const rect = containedRect(box, 285, 204)!;
    expect(rect.height).toBeCloseTo(771);
  });

  it("gibt ohne bekannte Vorlagengröße nichts zurück", () => {
    expect(containedRect(box, 0, 0)).toBeNull();
  });
});

describe("isOnContainedImage", () => {
  const box = { left: 0, top: 0, width: 1000, height: 500 };

  it("zählt Punkte auf dem Foto, nicht auf dem Rand daneben", () => {
    // Quadrat: 500×500 mittig, also x 250–750.
    expect(isOnContainedImage(box, 800, 800, 500, 250)).toBe(true);
    expect(isOnContainedImage(box, 800, 800, 250, 250)).toBe(true);
    expect(isOnContainedImage(box, 800, 800, 100, 250)).toBe(false);
    expect(isOnContainedImage(box, 800, 800, 900, 250)).toBe(false);
  });

  it("wertet vor dem Laden das ganze Element als Foto", () => {
    expect(isOnContainedImage(box, 0, 0, 10, 10)).toBe(true);
    expect(isOnContainedImage(box, 0, 0, 1001, 10)).toBe(false);
  });
});
