/**
 * Farben für die VexFlow-Notation — zentral statt in jedem Renderer hart codiert.
 *
 * Beide Schemata folgen den Programmheft-Tokens aus `globals.css`: hell die
 * Tinte, dunkel der Nachtdruck. Die helle Notation stand vorher hart auf
 * `#171717`, mit dem Vermerk, es gebe dafür keinen Token — den gibt es seit
 * der Programmheft-Palette mit `--color-ink`. Der Dunkelzweig las die
 * Alt-Namen `--color-dark-text*`; die zeigen inzwischen zwar auf die
 * Nachtpalette, hängen aber an einer Umleitung, die jederzeit wieder
 * umgehängt werden kann. Er liest jetzt die Nachtfarben direkt.
 *
 * Die Rückfallwerte greifen nur beim Rendern auf dem Server, wo es kein
 * `getComputedStyle` gibt; sie sind deshalb auf denselben Stand gebracht.
 */

export type NotationColors = {
  /** Noten, Pausen und Vorzeichen. */
  note: string;
  /** Notenlinien, Schlüssel, Taktart. */
  stave: string;
  /** Nachgezeichnete Taktstriche (Rhythmus-Spiel). */
  barline: string;
};

function cssToken(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
}

export function notationColors(dark: boolean): NotationColors {
  if (dark) {
    const text = cssToken("--color-night-text", "#ecebe8");
    return {
      note: text,
      stave: text,
      barline: cssToken("--color-night-muted", "#a6a8ad"),
    };
  }
  // Hell stand der Taktstrich auf `#1a1a1a` gegen `#171717` für Noten und
  // Linien — drei Stufen Unterschied, auf dem Schirm nicht zu sehen. Die
  // Unterscheidung fällt weg, alles steht in Tinte.
  const ink = cssToken("--color-ink", "#1c1d1f");
  return { note: ink, stave: ink, barline: ink };
}
