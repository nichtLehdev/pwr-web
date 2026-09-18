import DOMPurify from "isomorphic-dompurify";
import { descriptionToHtml } from "@/lib/description-html";

// Force safe rel on links: user-authored content may set target="_blank",
// and without noopener the target page gets a handle on our window.
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A" && node.getAttribute("href")) {
    node.setAttribute("rel", "noopener noreferrer");
  }
});

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    // Kein USE_PROFILES: Zusammen mit ALLOWED_TAGS *erweitert* es die Liste, statt
    // sie zu ersetzen — dann kämen `style` und `<form><input type="password">` durch.
    ALLOWED_TAGS: [
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "p",
      "br",
      "hr",
      "ul",
      "ol",
      "li",
      "strong",
      "em",
      "u",
      "s",
      "del",
      "sub",
      "sup",
      "a",
      "img",
      // posts.ts haengt Bildnachweise als <figure>/<figcaption> *vor* dem Filtern an.
      "figure",
      "figcaption",
      "blockquote",
      "pre",
      "code",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "div",
      "span",
    ],
    ALLOWED_ATTR: [
      "href",
      "target",
      "rel",
      "src",
      "alt",
      "title",
      "width",
      "height",
      "class",
      // Kein "style": Inline-CSS erlaubt Ueberlagerungen, die DOMPurifys
      // Skriptfilter nicht abdeckt.
      "colspan",
      "rowspan",
      // Liest der Leuchtkasten (post-detail-view.tsx); keine pauschale data-Erlaubnis.
      "data-copyright",
      "data-creator",
    ],
    ALLOW_DATA_ATTR: false,
    // DOMPurify verwirft Werte mit Doppelpunkt als moegliche URIs, posts.ts
    // erzeugt aber „Foto: Name". Beide sind reine Textfelder, nie Ziele.
    ADD_URI_SAFE_ATTR: ["data-copyright", "data-creator"],
  });
}

/**
 * Markdown zu HTML und Filter an einer Stelle. Bereinigt wird beim Anzeigen, nicht beim
 * Speichern: DOMPurify auf Markdown zerstört ihn („> Zitat" → „&gt; Zitat").
 */
export function renderDescriptionHtml(
  markdown: string | null | undefined,
): string | null {
  if (!markdown?.trim()) return null;
  const html = sanitizeHtml(descriptionToHtml(markdown));
  return html.trim() ? html : null;
}
