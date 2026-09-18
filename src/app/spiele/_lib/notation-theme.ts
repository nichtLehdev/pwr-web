/**
 * Farben für die VexFlow-Notation aus den Tokens in `globals.css`. Die Rückfallwerte greifen nur
 * beim Server-Rendern (kein `getComputedStyle`) und müssen zu den Tokens passen.
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
  const ink = cssToken("--color-ink", "#1c1d1f");
  return { note: ink, stave: ink, barline: ink };
}
