import { describe, expect, it } from "@jest/globals";
import { descriptionToHtml } from "@/lib/description-html";
import {
  markdownToPlainText,
  markdownToSingleLine,
} from "@/lib/markdown-to-plain-text";

/**
 * Beschreibungen von Terminen und Kursen werden als Markdown gespeichert und
 * an zwei Enden ausgewertet: als HTML in den Detailansichten und als Klartext
 * in Kalender, Metadaten, Suche und Vorlagen. Beide Enden müssen denselben
 * Text meinen — deshalb prüft der letzte Block sie gegeneinander.
 */

/** Grobes Abräumen der Tags, nur für den Vergleich der beiden Enden. */
function htmlZuText(html: string): string {
  return html
    .replace(/>\n+</g, "><")
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/<\/li>/g, "\n")
    .replace(/<\/(p|h[1-6]|ul|ol|blockquote)>/g, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

describe("Darstellung der Beschreibung", () => {
  it("behält Absätze und einzelne Zeilenumbrüche des Altbestands", () => {
    const altbestand =
      "Leitung: RPW Matthias Schirg und Team\nZielgruppe: Posaunenchorbläser\n\nAnmeldung bis zum 1. Mai.";

    const html = descriptionToHtml(altbestand);

    expect(html).toContain("<br>");
    expect(html.match(/<p>/g)).toHaveLength(2);
    expect(htmlZuText(html)).toBe(
      "Leitung: RPW Matthias Schirg und Team\nZielgruppe: Posaunenchorbläser\n\nAnmeldung bis zum 1. Mai.",
    );
  });

  it("lässt das Gendersternchen im Altbestand in Ruhe", () => {
    // Einzelnes Sternchen ohne Gegenstück: Markdown zeichnet nichts aus.
    const html = descriptionToHtml("Lehrgang für Jungbläser*innen");

    expect(html).not.toContain("<em>");
    expect(html).toContain("Jungbläser*innen");
  });

  it("stellt Überschriften, Listen, Links und Hervorhebungen dar", () => {
    const html = descriptionToHtml(
      "### Ablauf\n\nBitte **pünktlich** sein, Noten _mitbringen_.\n\n- Anreise\n- Probe\n\n[Anmeldung](https://posaunenwerk.de/anmeldung)",
    );

    expect(html).toContain("<h3>Ablauf</h3>");
    expect(html).toContain("<strong>pünktlich</strong>");
    expect(html).toContain("<em>mitbringen</em>");
    expect(html).toContain("<li>Anreise</li>");
    expect(html).toContain(
      '<a href="https://posaunenwerk.de/anmeldung">Anmeldung</a>',
    );
  });

  it("schreibt spitze Klammern aus dem Klartext als Text", () => {
    expect(descriptionToHtml("Kinder <10 Jahre zahlen nichts")).toContain(
      "Kinder &lt;10 Jahre",
    );
  });

  it("liefert leeren Text für leere Beschreibungen", () => {
    expect(descriptionToHtml("")).toBe("");
    expect(descriptionToHtml("   \n  ")).toBe("");
  });
});

describe("markdownToPlainText", () => {
  it("entfernt Überschriften, Hervorhebungen und Listenzeichen", () => {
    expect(
      markdownToPlainText(
        "## Ablauf\n\n**Fett** und *kursiv* und ~~weg~~\n\n- Anreise\n- Probe",
      ),
    ).toBe("Ablauf\n\nFett und kursiv und weg\n\nAnreise\nProbe");
  });

  it("behält die Nummern nummerierter Listen", () => {
    expect(markdownToPlainText("1. Anreise\n2. Probe")).toBe(
      "1. Anreise\n2. Probe",
    );
  });

  it("gibt von Links nur den Text wieder, von Bildern den Alternativtext", () => {
    expect(
      markdownToPlainText(
        "Mehr auf [unserer Seite](https://posaunenwerk.de/x) und ![Plakat](/api/uploads/media/p.jpg)",
      ),
    ).toBe("Mehr auf unserer Seite und Plakat");
  });

  it("löst Maskierungen auf, die der Editor beim Speichern setzt", () => {
    // Turndown maskiert Satzzeichen, die Markdown deuten würde.
    expect(markdownToPlainText("1\\. Tag: Anreise\n\\*Hinweis\\*")).toBe(
      "1. Tag: Anreise\n*Hinweis*",
    );
  });

  it("entfernt rohe Tags, aber keine einzelnen spitzen Klammern", () => {
    expect(markdownToPlainText("Ein <u>Wort</u> und Kinder <10 Jahre")).toBe(
      "Ein Wort und Kinder <10 Jahre",
    );
  });

  it("entfernt Skriptblöcke samt Inhalt", () => {
    expect(
      markdownToPlainText("### Ablauf\n\n<script>alert(1)</script>Text danach"),
    ).toBe("Ablauf\n\nText danach");
  });

  it("verschluckt kein Klammerpaar im Linkziel", () => {
    expect(
      markdownToPlainText("[Klick](https://de.wikipedia.org/wiki/Zug_(Musik))"),
    ).toBe("Klick");
  });

  it("löst HTML-Entitäten auf", () => {
    expect(markdownToPlainText("Bläser &amp; Chor")).toBe("Bläser & Chor");
  });

  it("behält das Gendersternchen und einzelne Unterstriche", () => {
    expect(markdownToPlainText("Für Jungbläser*innen")).toBe(
      "Für Jungbläser*innen",
    );
    expect(markdownToPlainText("Datei kurs_2026 beachten")).toBe(
      "Datei kurs_2026 beachten",
    );
  });

  it("behält Absätze und Umbrüche des Altbestands unverändert", () => {
    const altbestand =
      "Leitung: RPW Matthias Schirg und Team\nZielgruppe: Posaunenchorbläser\n\nAnmeldung bis zum 1. Mai.";

    expect(markdownToPlainText(altbestand)).toBe(altbestand);
  });

  it("faltet für einzeilige Felder alle Umbrüche zusammen", () => {
    expect(markdownToSingleLine("## Ablauf\n\nProbe\nKonzert\n\n- Noten")).toBe(
      "Ablauf Probe Konzert Noten",
    );
  });

  it("verträgt leere Eingaben", () => {
    expect(markdownToPlainText("")).toBe("");
    expect(markdownToSingleLine("   ")).toBe("");
  });
});

describe("Klartext und Darstellung sagen dasselbe", () => {
  const proben = [
    "Vorweihnachtliches Konzert für Blechbläser und Orgel",
    "Lehrgang für Jungbläser*innen aller Altersstufen",
    "Leitung: RPW Matthias Schirg und Team\nZielgruppe: Posaunenchorbläser",
    "Erste Zeile\nZweite Zeile\n\nNeuer Absatz",
    "### Ablauf\n\nBitte **pünktlich** sein.\n\n- Anreise\n- Probe\n\n[Anmeldung](https://posaunenwerk.de/anmeldung)",
    "Ein Zitat:\n\n> Musik verbindet.\n\nDanach *kursiv*.",
  ];

  it.each(proben)("Probe %#", (markdown) => {
    expect(markdownToPlainText(markdown)).toBe(
      htmlZuText(descriptionToHtml(markdown)),
    );
  });
});
