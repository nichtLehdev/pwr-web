/**
 * Harte Zeilenumbrüche aus alten Beschreibungen glätten.
 *
 * Beschreibungen werden seit #311 als Markdown mit `breaks: true` angezeigt,
 * jeder einzelne Umbruch bleibt also sichtbar. Die alten Klartexte wurden im
 * Textfeld aber teils mitten im Satz umbrochen. Diese Regel fügt zwei Zeilen
 * nur zusammen, wenn der Satz erkennbar weiterläuft; gewollte Umbrüche
 * („Leitung: …" / „Zielgruppe: …"), Listen und Absätze bleiben.
 *
 * Sie ist so gebaut, dass sie bei jedem Start laufen darf: Der Editor
 * speichert einen Zeilenumbruch als Markdown-Umbruch mit zwei Leerzeichen am
 * Zeilenende, und solche Zeilen fasst die Regel nie an. Ein zweiter Lauf über
 * dasselbe Ergebnis ändert nichts mehr.
 *
 * Eigene Datei ohne Importe, weil das Laufzeit-Image nur ausdrücklich
 * aufgezählte Dateien aus `src/` enthält (siehe Dockerfile).
 */

/**
 * Wörter, nach denen ein Satz weiterläuft, auch wenn das nächste Wort groß
 * beginnt — im Deutschen sind das die Artikel, Präpositionen, Konjunktionen
 * und Pronomen vor einem Substantiv („nach den \n Sommerferien“).
 */
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
