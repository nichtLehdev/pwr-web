import { marked } from "marked";

/**
 * `breaks: true` hält jeden Zeilenumbruch alter Klartexte als Umbruch. Optionen bewusst am Aufruf
 * statt per `marked.use()`: `marked` ist ein Singleton, das auch der Beitragseditor einstellt.
 */
const OPTIONS = { gfm: true, breaks: true, async: false } as const;

/**
 * Ungefiltert, auch rohes HTML — für die Anzeige `renderDescriptionHtml` aus
 * `@/lib/sanitize` benutzen.
 */
export function descriptionToHtml(markdown: string): string {
  if (!markdown.trim()) return "";
  return String(marked.parse(markdown, OPTIONS));
}
