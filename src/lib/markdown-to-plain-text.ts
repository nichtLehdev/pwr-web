/** Entitäten aus importierten oder eingefügten Texten; die Anzeige macht Zeichen daraus. */
const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

/** Maskierte ASCII-Satzzeichen landen im privaten Unicode-Bereich (U+E020–U+E07F). */
const MASKIERT_AB = 0xe000;

/**
 * Bis sich nichts mehr ändert: Ein Durchgang macht aus `<<b>script>` wieder
 * `<script>` (CodeQL: „Incomplete multi-character sanitization").
 */
function bisStabil(text: string, muster: RegExp, ersatz = ""): string {
  let vorher: string;
  do {
    vorher = text;
    text = text.replace(muster, ersatz);
  } while (text !== vorher);
  return text;
}

/** Skript- und Stilblöcke samt Inhalt. */
const SKRIPT_ODER_STIL = /<(script|style)\b[\s\S]*?<\/\1\s*>/gi;

/** Nur echte Tags, nicht jedes spitze Klammerpaar: „Kinder <10 Jahre" ist Text. */
const TAG = /<\/?[a-zA-Z][^<>]*>/g;

/** Alle bekannten Entitäten in einem Muster — für eine einzige Auflösung. */
const ENTITY = /&(?:amp|lt|gt|quot|#39|apos|nbsp);/g;

/**
 * Entfernt die Syntax direkt, statt HTML zu erzeugen. Umbrüche bleiben (die Anzeige
 * nutzt `breaks: true`). Reihenfolge bewusst: Bilder vor Links, Codeblöcke vor
 * Inline-Code, Hervorhebungen vor den Maskierungen.
 */
export function markdownToPlainText(markdown: string): string {
  if (!markdown) return "";

  let text = markdown.replace(/\r\n?/g, "\n");

  // Codeblöcke ganz weg — ihr Inhalt ist kein Fließtext.
  text = text.replace(/```[\s\S]*?```/g, "");

  // Turndown maskiert Satzzeichen („1\. Tag“). Sie parken im privaten
  // Unicode-Bereich, damit die Regeln unten sie nicht als Syntax deuten.
  text = text.replace(/\\([\\`*_{}[\]()#+\-.!>~|])/g, (_treffer, zeichen) =>
    String.fromCharCode(MASKIERT_AB + (zeichen as string).charCodeAt(0)),
  );

  // Samt Inhalt, sonst bliebe von `<script>alert(1)</script>` „alert(1)" stehen.
  text = bisStabil(text, SKRIPT_ODER_STIL);

  // Sonst nur echte Tags entfernen (siehe `TAG`).
  text = bisStabil(text, TAG);

  // Das Ziel darf eine Ebene Klammern enthalten (`javascript:alert(1)`,
  // Wikipedia-Adressen).
  const ZIEL = /\((?:[^()]|\([^()]*\))*\)/.source;
  text = text.replace(new RegExp(`!\\[([^\\]]*)\\]${ZIEL}`, "g"), "$1");
  text = text.replace(new RegExp(`\\[([^\\]]+)\\]${ZIEL}`, "g"), "$1");

  // Zeilenanfänge: Überschrift, Zitat, Trennlinie, Aufzählung. Listennummern
  // bleiben stehen, sonst verlöre „1. Anreise, 2. Probe" seine Ordnung.
  text = text.replace(/^ {0,3}#{1,6}\s+/gm, "");
  text = text.replace(/^ {0,3}>\s?/gm, "");
  text = text.replace(/^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/gm, "");
  text = text.replace(/^ {0,3}[-*+][ \t]+/gm, "");
  text = text.replace(/^ {0,3}(\d{1,9})[.)][ \t]+/gm, "$1. ");

  text = text.replace(/(\*\*\*|___)([^\n]+?)\1/g, "$2");
  text = text.replace(/(\*\*|__)([^\n]+?)\1/g, "$2");
  // Sternchen zeichnen auch innerhalb eines Wortes aus, Unterstriche nicht —
  // deshalb fordert die zweite Regel eine Wortgrenze.
  text = text.replace(/\*([^*\n]+)\*/g, "$1");
  text = text.replace(/(^|[^\w\\])_([^_\n]+)_(?![\w])/gm, "$1$2");
  text = text.replace(/~~([^~\n]+)~~/g, "$1");
  text = text.replace(/`([^`\n]+)`/g, "$1");

  // Maskierte Zeichen zurückholen (siehe oben).
  text = text.replace(/[-]/g, (zeichen) =>
    String.fromCharCode(zeichen.charCodeAt(0) - MASKIERT_AB),
  );

  // In einem einzigen Durchgang: Nacheinander aufgelöst würde aus „&amp;lt;"
  // erst „&lt;" und dann „<" — doppelt entschlüsselt.
  text = text.replace(ENTITY, (entity) => ENTITIES[entity] ?? entity);

  // Aufgelöste Entitäten können Tags ergeben („&lt;script&gt;"); Klartext soll
  // von sich aus sicher sein, egal wo er später landet.
  text = bisStabil(bisStabil(text, SKRIPT_ODER_STIL), TAG);

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
