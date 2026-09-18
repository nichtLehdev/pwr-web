import { marked } from "marked";

/**
 * Markdown-Optionen der Beschreibungen.
 *
 * `breaks: true` ist der Grund, weshalb der Umstieg auf Markdown ohne
 * Datenwanderung auskommt: Die vorhandenen Klartext-Beschreibungen sind
 * gültiges Markdown, und mit dieser Einstellung bleibt jeder einzelne
 * Zeilenumbruch ein Umbruch statt zu einem Leerzeichen zu werden. Leerzeilen
 * trennen wie bisher Absätze.
 *
 * Die Optionen stehen bewusst am Aufruf und nicht in einem globalen
 * `marked.use()`: `marked` ist ein Singleton, und der Beitragseditor stellt
 * dieselbe Bibliothek im selben Bündel ein. Was hier gilt, soll nicht davon
 * abhängen, welches Modul zuerst geladen wurde.
 */
const OPTIONS = { gfm: true, breaks: true, async: false } as const;

/**
 * Beschreibung (Markdown) als HTML.
 *
 * Nicht direkt in die Seite geben: Das Ergebnis enthält alles, was im Text
 * stand, auch rohes HTML. Für die Anzeige `renderDescriptionHtml` aus
 * `@/lib/sanitize` benutzen — das nimmt diesen Schritt und filtert danach.
 */
export function descriptionToHtml(markdown: string): string {
  if (!markdown.trim()) return "";
  return String(marked.parse(markdown, OPTIONS));
}
