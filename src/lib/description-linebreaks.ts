/**
 * Harte Zeilenumbrüche alter Beschreibungen glätten, nur wo der Satz erkennbar weiterläuft.
 * Idempotent: Markdown-Umbrüche (zwei Leerzeichen) bleiben. Ohne Importe, weil das
 * Laufzeit-Image nur aufgezählte Dateien aus `src/` enthält (siehe Dockerfile).
 */

/** Wörter, nach denen ein Satz trotz großem Folgewort weiterläuft („nach den \n Sommerferien“). */
const FUNKTIONSWOERTER = new Set([
  "aber",
  "als",
  "am",
  "an",
  "auf",
  "aus",
  "bei",
  "beim",
  "bis",
  "das",
  "dem",
  "den",
  "der",
  "des",
  "die",
  "durch",
  "ein",
  "eine",
  "einem",
  "einen",
  "einer",
  "eines",
  "für",
  "gegen",
  "ihr",
  "ihre",
  "ihrem",
  "ihren",
  "ihrer",
  "im",
  "in",
  "mit",
  "nach",
  "oder",
  "ohne",
  "pro",
  "seine",
  "seinem",
  "seinen",
  "seiner",
  "sowie",
  "über",
  "um",
  "und",
  "unser",
  "unsere",
  "unserem",
  "unseren",
  "unserer",
  "unter",
  "vom",
  "von",
  "vor",
  "während",
  "zu",
  "zum",
  "zur",
]);

const SATZENDE = /[.!?:;)\]"»“]\s*$/;
const LISTENANFANG = /^\s*([-*+>#]|\d+[.)])\s/;

/** Läuft der Satz von `vorige` in `naechste` weiter? */
export function laeuftWeiter(vorige: string, naechste: string): boolean {
  if (!vorige.trim() || !naechste.trim()) return false;
  if (SATZENDE.test(vorige)) return false;
  if (LISTENANFANG.test(naechste) || LISTENANFANG.test(vorige)) return false;
  // Zwei Leerzeichen am Zeilenende sind in Markdown ein ausdrücklicher Umbruch.
  if (/ {2}$/.test(vorige)) return false;
  if (/^[a-zäöüß]/.test(naechste.trimStart())) return true;
  const letztesWort = vorige.trim().split(/\s+/).pop() ?? "";
  return FUNKTIONSWOERTER.has(letztesWort.toLowerCase());
}

export function entwirreHarteUmbrueche(text: string): string {
  const zeilen = text.split("\n");
  const raus: string[] = [];
  for (const zeile of zeilen) {
    const vorige = raus[raus.length - 1];
    if (vorige !== undefined && laeuftWeiter(vorige, zeile)) {
      raus[raus.length - 1] = `${vorige.trimEnd()} ${zeile.trimStart()}`;
    } else {
      raus.push(zeile);
    }
  }
  return raus.join("\n");
}
