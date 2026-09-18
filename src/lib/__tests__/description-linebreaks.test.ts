import { describe, expect, it } from "@jest/globals";
import { entwirreHarteUmbrueche } from "@/lib/description-linebreaks";

/**
 * Läuft bei jedem Container-Start: glättet alte Texte, lässt Editor-Ausgaben in Ruhe
 * und ändert beim zweiten Lauf nichts mehr.
 */
describe("entwirreHarteUmbrueche", () => {
  it("fügt Umbrüche mitten im Satz zusammen (echte Beispiele)", () => {
    expect(
      entwirreHarteUmbrueche(
        "Wir treffen uns am Freitag und Samstag der ersten Schulwoche nach den\nSommerferien – dieses Mal in Merzig.",
      ),
    ).toBe(
      "Wir treffen uns am Freitag und Samstag der ersten Schulwoche nach den Sommerferien – dieses Mal in Merzig.",
    );
    expect(
      entwirreHarteUmbrueche("aber auch der Spaß wird nicht zu kurz\nkommen!"),
    ).toBe("aber auch der Spaß wird nicht zu kurz kommen!");
  });

  it("lässt gewollte Zeilen stehen", () => {
    const text =
      "Leitung: RPW Matthias Schirg und Team\nZielgruppe: Posaunenchorbläser*innen";
    expect(entwirreHarteUmbrueche(text)).toBe(text);
    expect(entwirreHarteUmbrueche("Erster Satz.\nZweiter Satz.")).toBe(
      "Erster Satz.\nZweiter Satz.",
    );
  });

  it("fasst nichts an, was der Editor schreibt", () => {
    // Harter Umbruch aus dem Editor: zwei Leerzeichen am Zeilenende.
    const umbruch = "Treffpunkt am Eingang  \nbitte pünktlich sein";
    expect(entwirreHarteUmbrueche(umbruch)).toBe(umbruch);
    // Listen und Absätze.
    const liste = "Mitbringen:\n\n- Instrument\n- Notenständer\n- gute Laune";
    expect(entwirreHarteUmbrueche(liste)).toBe(liste);
    const nummeriert = "1. Anreise\n2. Probe\n3. Konzert";
    expect(entwirreHarteUmbrueche(nummeriert)).toBe(nummeriert);
    const absaetze = "### Ablauf\n\nWir beginnen mit\n\neiner Andacht.";
    expect(entwirreHarteUmbrueche(absaetze)).toBe(absaetze);
  });

  it("ändert beim zweiten Lauf nichts mehr", () => {
    const alt =
      "Bereits seit 20 Jahren lädt das Posaunenwerk Bläserinnen und Bläser mit ihren\nFamilien zu diesem Freizeitformat ein.\nEs besteht täglich die Möglichkeit zum Skifahren.";
    const einmal = entwirreHarteUmbrueche(alt);
    expect(einmal).not.toBe(alt);
    expect(entwirreHarteUmbrueche(einmal)).toBe(einmal);
  });
});
