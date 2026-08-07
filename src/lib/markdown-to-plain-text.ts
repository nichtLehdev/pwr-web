/**
 * Converts markdown to plain text.
 *
 * Strips markdown syntax directly instead of rendering to HTML first — that
 * way no HTML is ever produced and the result needs no sanitization before it
 * goes into an XML feed or a `<meta>` attribute.
 */
export function markdownToPlainText(markdown: string): string {
  if (!markdown) return "";

  let text = markdown.replace(/^#{1,6}\s+/gm, "");
  text = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");
  text = text.replace(/!\[([^\]]*)\]\([^\)]+\)/g, "$1");
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  text = text.replace(/\*([^*]+)\*/g, "$1");
  text = text.replace(/~~([^~]+)~~/g, "$1");
  text = text.replace(/`([^`]+)`/g, "$1");
  text = text.replace(/```[\s\S]*?```/g, "");
  text = text.replace(/^[\s]*[-*+]\s+/gm, "");
  text = text.replace(/^\d+\.\s+/gm, "");
  text = text.replace(/^>\s+/gm, "");
  text = text.replace(/^---+/gm, "");
  text = text.replace(/[<>]/g, "");

  text = text.replace(/\n\s*\n\s*\n/g, "\n\n");
  text = text.replace(/[ \t]+/g, " ");

  return text.trim();
}
