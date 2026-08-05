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
    USE_PROFILES: { html: true },
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
      // no "style": inline CSS enables overlay/redressing tricks that
      // DOMPurify's script filtering doesn't cover
      "colspan",
      "rowspan",
    ],
    ALLOW_DATA_ATTR: false,
  });
}
