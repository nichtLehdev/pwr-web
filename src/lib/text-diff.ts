export type DiffPart = {
  type: "same" | "added" | "removed";
  text: string;
};

/**
 * Above this many LCS cells the middle part is shown as one replacement
 * instead: a 50 000-character post rewritten from scratch would otherwise
 * stall the browser for nothing a reviewer could read anyway.
 */
const MAX_CELLS = 4_000_000;

function push(parts: DiffPart[], type: DiffPart["type"], text: string) {
  if (!text) return;
  const last = parts[parts.length - 1];
  if (last?.type === type) last.text += text;
  else parts.push({ type, text });
}

/** Longest-common-subsequence diff of two token lists. */
export function diffTokens(before: string[], after: string[]): DiffPart[] {
  // Common prefix and suffix need no table and are the usual case for edits.
  let start = 0;
  while (
    start < before.length &&
    start < after.length &&
    before[start] === after[start]
  ) {
    start++;
  }
  let endBefore = before.length;
  let endAfter = after.length;
  while (
    endBefore > start &&
    endAfter > start &&
    before[endBefore - 1] === after[endAfter - 1]
  ) {
    endBefore--;
    endAfter--;
  }

  const parts: DiffPart[] = [];
  push(parts, "same", before.slice(0, start).join(""));

  const a = before.slice(start, endBefore);
  const b = after.slice(start, endAfter);
  if (a.length * b.length > MAX_CELLS) {
    push(parts, "removed", a.join(""));
    push(parts, "added", b.join(""));
  } else {
    // lengths[i][j] = LCS of a[i..] and b[j..], flattened.
    const width = b.length + 1;
    const lengths = new Uint32Array((a.length + 1) * width);
    for (let i = a.length - 1; i >= 0; i--) {
      for (let j = b.length - 1; j >= 0; j--) {
        lengths[i * width + j] =
          a[i] === b[j]
            ? lengths[(i + 1) * width + j + 1]! + 1
            : Math.max(
                lengths[(i + 1) * width + j]!,
                lengths[i * width + j + 1]!,
              );
      }
    }
    let i = 0;
    let j = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) {
        push(parts, "same", a[i]!);
        i++;
        j++;
      } else if (lengths[(i + 1) * width + j]! >= lengths[i * width + j + 1]!) {
        push(parts, "removed", a[i]!);
        i++;
      } else {
        push(parts, "added", b[j]!);
        j++;
      }
    }
    push(parts, "removed", a.slice(i).join(""));
    push(parts, "added", b.slice(j).join(""));
  }

  push(parts, "same", before.slice(endBefore).join(""));
  return parts;
}

/** Lines keep their trailing newline so the parts join back to the text. */
function splitLines(text: string): string[] {
  return text.match(/[^\n]*\n|[^\n]+$/g) ?? [];
}

/** Words and the whitespace between them, as separate tokens. */
function splitWords(text: string): string[] {
  return text.match(/\s+|[^\s]+/g) ?? [];
}

/**
 * Both texts are compared as if they ended in a newline, so appending a line
 * does not also mark the old last line as changed.
 */
export function diffLines(before: string, after: string): DiffPart[] {
  const terminate = (text: string) =>
    text === "" || text.endsWith("\n") ? text : `${text}\n`;
  return diffTokens(
    splitLines(terminate(before)),
    splitLines(terminate(after)),
  );
}

export function diffWords(before: string, after: string): DiffPart[] {
  return diffTokens(splitWords(before), splitWords(after));
}
