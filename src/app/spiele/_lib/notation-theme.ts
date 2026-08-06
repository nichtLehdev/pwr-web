/**
 * Farben für die VexFlow-Notation — zentral statt in jedem Renderer hart codiert.
 * Dunkle Werte folgen den Design-Tokens aus `globals.css` (`--color-dark-text*`);
 * helle Notation bleibt nahezu schwarz (Druckbild), wofür es keinen Token gibt.
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
    const text = cssToken("--color-dark-text", "#e4e6eb");
    return {
      note: text,
      stave: text,
      barline: cssToken("--color-dark-text-secondary", "#b0b3ba"),
    };
  }
  return { note: "#171717", stave: "#171717", barline: "#1a1a1a" };
}
