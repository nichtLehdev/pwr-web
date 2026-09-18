/**
 * Width is estimated from character count (measuring SVG text needs a mounted node);
 * words longer than maxWidth are force-broken so they never overflow.
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
