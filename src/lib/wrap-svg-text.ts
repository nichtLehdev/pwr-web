/**
 * Greedily wraps text into lines that fit within maxWidth, for use with
 * SVG <text>/<tspan> (which doesn't wrap on its own). Text width is
 * estimated from character count rather than measured, since SVG text
 * measurement requires a mounted DOM node - good enough for short labels
 * like city names. Words longer than maxWidth on their own (e.g.
 * "Königswinter" with no space to break on) are force-broken at the
 * character level so they never overflow.
 */
export function wrapSvgText(
  text: string,
  maxWidth: number,
  fontSize: number,
): string[] {
  const avgCharWidth = fontSize * 0.55;
  const maxChars = Math.max(1, Math.floor(maxWidth / avgCharWidth));

  if (text.length <= maxChars) return [text];

  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  const flushLine = () => {
    if (currentLine) {
      lines.push(currentLine);
      currentLine = "";
    }
  };

  for (const word of words) {
    if (word.length > maxChars) {
      flushLine();
      let remaining = word;
      while (remaining.length > maxChars) {
        lines.push(remaining.slice(0, maxChars));
        remaining = remaining.slice(maxChars);
      }
      currentLine = remaining;
      continue;
    }

    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (candidate.length <= maxChars) {
      currentLine = candidate;
    } else {
      flushLine();
      currentLine = word;
    }
  }
  flushLine();

  return lines;
}
