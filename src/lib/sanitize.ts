import DOMPurify from "isomorphic-dompurify";

// Force safe rel on links: user-authored content may set target="_blank",
// and without noopener the target page gets a handle on our window.
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A" && node.getAttribute("href")) {
    node.setAttribute("rel", "noopener noreferrer");
  }
});

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    // Kein USE_PROFILES mehr: Zusammen mit ALLOWED_TAGS *erweitert* es die
    // Profilliste, statt sie zu ersetzen — die Listen unten waren dadurch
    // praktisch wirkungslos. Nachgemessen kamen `<p style="position:fixed;
    // width:100vw;height:100vh">` und `<form><input type="password">`
    // unveraendert durch. Beides zusammen ist genau die Ueberlagerung, vor
    // der der Kommentar weiter unten warnt: ein bildschirmfuellendes
    // Passwortfeld auf eigener Domain, verfasst im Beitragseditor.
    // Skripte waren nie betroffen (script, onerror, javascript:, iframe und
    // svg wurden auch vorher entfernt).
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
      // posts.ts haengt Bildnachweise serverseitig als <figure>/<figcaption>
      // an, *bevor* gefiltert wird. Ohne diese beiden raeumte der Filter sie
      // unmittelbar danach wieder weg.
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
      // Skriptfilter nicht abdeckt. Die Absicht stand hier schon, griff aber
      // nicht, solange USE_PROFILES gesetzt war.
      "colspan",
      "rowspan",
      // Der Leuchtkasten der Beitragsansicht liest genau diese beiden aus
      // (post-detail-view.tsx). Sie wurden bisher entfernt, weshalb die
      // Nachweisanzeige dort wirkungslos blieb. Die pauschale data-Erlaubnis
      // bleibt aus — nur diese zwei sind benannt.
      "data-copyright",
      "data-creator",
    ],
    ALLOW_DATA_ATTR: false,
    // Ohne das hier haette die Erlaubnis oben nur halb gewirkt: DOMPurify
    // behandelt Attributwerte mit Doppelpunkt als moegliche URIs und
    // verwirft sie. Nachgemessen: `data-creator="Foto: A. B."` flog raus,
    // `data-creator="Foto A B"` blieb — und „Foto: Name" ist genau das
    // Format, das posts.ts erzeugt. Beide sind reine Textfelder, nie Ziele.
    ADD_URI_SAFE_ATTR: ["data-copyright", "data-creator"],
  });
}
