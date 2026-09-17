/**
 * HTML-Entitäten, die in gespeichertem Markdown vorkommen können.
 *
 * Der Editor schreibt sie nicht selbst, aber importierte und von Hand
 * eingefügte Texte tragen sie; in der Anzeige werden sie zu Zeichen. Ohne
 * diese Auflösung stünde „Bläser &amp; Chor" im Kalender statt „Bläser & Chor".
 */
const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

/**
 * Ablage für maskierte Satzzeichen im privaten Unicode-Bereich (U+E000 ff.).
 * Alle maskierbaren Zeichen sind ASCII, landen also zwischen U+E020 und
 * U+E07F und kollidieren mit nichts, was in einer Beschreibung stehen kann.
 */
const MASKIERT_AB = 0xe000;

/**
 * Wandelt Markdown in Klartext um.
 *
 * Für alles, was keine Auszeichnung darstellen kann: iCal-Feed, Seiten- und
 * Social-Media-Metadaten, Suchtreffer, E-Mail-Entwürfe, Vorlagen. Die
 * Syntaxzeichen werden direkt aus dem Quelltext entfernt, statt erst HTML zu
 * erzeugen und es wieder abzuräumen — so entsteht nie HTML, das jemand
 * filtern müsste, und der Helfer bleibt ohne Markdown-Bibliothek im
 * Browser-Bündel.
 *
 * Absätze und Zeilenumbrüche bleiben erhalten, weil die Beschreibungen mit
 * `breaks: true` dargestellt werden: Was dort ein Umbruch ist, ist hier eine
 * neue Zeile. Wer eine einzeilige Fassung braucht (Metadaten), faltet die
 * Zeilen anschließend selbst zusammen — siehe `plainTextExcerpt`.
 *
 * Die Reihenfolge der Ersetzungen ist bewusst: Bilder vor Links (sonst bleibt
 * vom `![alt](url)` ein einzelnes „!" stehen), Codeblöcke vor Inline-Code,
 * Hervorhebungen vor den Maskierungen (`\*` soll ein Sternchen bleiben).
 */
export function markdownToPlainText(markdown: string): string {
  if (!markdown) return "";

  let text = markdown.replace(/\r\n?/g, "\n");

  // Codeblöcke ganz weg — ihr Inhalt ist kein Fließtext.
  text = text.replace(/```[\s\S]*?```/g, "");

  // Maskierte Satzzeichen zuerst aus dem Weg räumen: Turndown schreibt jedes
  // Zeichen, das Markdown deuten würde, mit Rückstrich — aus der Zeile „1.
  // Tag: Anreise" wird beim Speichern „1\. Tag: Anreise". Blieben sie stehen,
  // hielten die Regeln weiter unten „\*Hinweis\*" für eine Hervorhebung und
  // ließen die Rückstriche übrig. Deshalb wandern sie so lange in den
  // privaten Unicode-Bereich, dass keine Regel sie mehr sieht.
  text = text.replace(/\\([\\`*_{}[\]()#+\-.!>~|])/g, (_treffer, zeichen) =>
    String.fromCharCode(MASKIERT_AB + (zeichen as string).charCodeAt(0)),
  );

  // Skript- und Stilblöcke samt Inhalt: Der steht nie im Fließtext. Ohne
  // diese Zeile bliebe von `<script>alert(1)</script>` das „alert(1)" im
  // Kalendereintrag stehen — gemessen. Gefährlich ist das nicht (Klartext
  // wird nirgends ausgeführt), nur falsch.
  text = text.replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, "");

  // Sonst nur echte Tags entfernen, nicht jedes spitze Klammerpaar: „Kinder
  // <10 Jahre" ist Text und wird in der Anzeige auch als Text dargestellt.
  // Die frühere Fassung löschte pauschal `<` und `>` und machte aus
  // `<u>Wort</u>` das Wort „uWort/u".
  text = text.replace(/<\/?[a-zA-Z][^<>]*>/g, "");

  // Das Ziel darf ein Klammerpaar enthalten (`javascript:alert(1)`, aber auch
  // Wikipedia-Adressen mit Klammern) — eine Ebene reicht dafür. Vorher blieb
  // von `[Klick](javascript:alert(1))` ein „Klick)" übrig.
  const ZIEL = /\((?:[^()]|\([^()]*\))*\)/.source;
  text = text.replace(new RegExp(`!\\[([^\\]]*)\\]${ZIEL}`, "g"), "$1");
  text = text.replace(new RegExp(`\\[([^\\]]+)\\]${ZIEL}`, "g"), "$1");

  // Zeilenanfänge: Überschrift, Zitat, Aufzählung, Trennlinie. Die Nummern
  // nummerierter Listen bleiben stehen — ohne sie verlöre „1. Anreise, 2.
  // Probe" seine Ordnung.
  text = text.replace(/^ {0,3}#{1,6}\s+/gm, "");
  text = text.replace(/^ {0,3}>\s?/gm, "");
  text = text.replace(/^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/gm, "");
  text = text.replace(/^ {0,3}[-*+][ \t]+/gm, "");
  text = text.replace(/^ {0,3}(\d{1,9})[.)][ \t]+/gm, "$1. ");

  text = text.replace(/(\*\*\*|___)([^\n]+?)\1/g, "$2");
  text = text.replace(/(\*\*|__)([^\n]+?)\1/g, "$2");
  // Sternchen zeichnen auch innerhalb eines Wortes aus (so stellt Markdown
  // „Bläser*innen und Jungbläser*innen" kursiv), Unterstriche nicht — deshalb
  // fordert die zweite Regel eine Wortgrenze. Ohne sie verlöre „Kosten
  // 50_60_70" seine Unterstriche, obwohl die Anzeige sie behält.
  text = text.replace(/\*([^*\n]+)\*/g, "$1");
  text = text.replace(/(^|[^\w\\])_([^_\n]+)_(?![\w])/gm, "$1$2");
  text = text.replace(/~~([^~\n]+)~~/g, "$1");
  text = text.replace(/`([^`\n]+)`/g, "$1");

  // Maskierte Zeichen zurückholen (siehe oben).
  text = text.replace(/[-]/g, (zeichen) =>
    String.fromCharCode(zeichen.charCodeAt(0) - MASKIERT_AB),
  );

  for (const [entity, char] of Object.entries(ENTITIES)) {
    text = text.split(entity).join(char);
  }

  text = text.replace(/[ \t]+$/gm, "");
  text = text.replace(/[ \t]{2,}/g, " ");
  text = text.replace(/\n{3,}/g, "\n\n");

  return text.trim();
}

/**
 * Einzeilige Fassung für Felder, die keine Umbrüche vertragen (Metadaten,
 * Kalender-Kurzfassungen, Suchtreffer).
 */
export function markdownToSingleLine(markdown: string): string {
  return markdownToPlainText(markdown).replace(/\s+/g, " ").trim();
}
