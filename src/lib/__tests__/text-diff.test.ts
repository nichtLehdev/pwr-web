import { describe, expect, it } from "@jest/globals";
import { diffLines, diffTokens, diffWords } from "../text-diff";

const join = (parts: { type: string; text: string }[], skip: string) =>
  parts
    .filter((p) => p.type !== skip)
    .map((p) => p.text)
    .join("");

describe("diffWords", () => {
  it("marks only the changed word", () => {
    expect(diffWords("Konzert am Sonntag", "Konzert am Samstag")).toEqual([
      { type: "same", text: "Konzert am " },
      { type: "removed", text: "Sonntag" },
      { type: "added", text: "Samstag" },
    ]);
  });

  it("reports identical text as one unchanged part", () => {
    expect(diffWords("gleich", "gleich")).toEqual([
      { type: "same", text: "gleich" },
    ]);
  });
});

describe("diffLines", () => {
  // Both sides must be reconstructible, or the view would drop text.
  it("rebuilds the old and new text from its parts", () => {
    const before = "Zeile 1\nZeile 2\nZeile 3\nZeile 4\n";
    const after = "Zeile 1\nZeile 2 neu\nZeile 3\nZeile 5\n";
    const parts = diffLines(before, after);
    expect(join(parts, "added")).toBe(before);
    expect(join(parts, "removed")).toBe(after);
  });

  it("finds an inserted line in the middle", () => {
    expect(diffLines("a\nc\n", "a\nb\nc\n")).toEqual([
      { type: "same", text: "a\n" },
      { type: "added", text: "b\n" },
      { type: "same", text: "c\n" },
    ]);
  });

  it("handles a last line without newline", () => {
    expect(diffLines("a\nb", "a\nc")).toEqual([
      { type: "same", text: "a\n" },
      { type: "removed", text: "b\n" },
      { type: "added", text: "c\n" },
    ]);
  });

  // The old last line only gained a newline; it is not a change.
  it("marks only the appended line when text is added at the end", () => {
    expect(diffLines("a\nb", "a\nb\nc")).toEqual([
      { type: "same", text: "a\nb\n" },
      { type: "added", text: "c\n" },
    ]);
  });
});

describe("diffTokens", () => {
  it("falls back to one replacement for huge inputs", () => {
    const before = Array.from({ length: 3000 }, (_, i) => `a${i}`);
    const after = Array.from({ length: 3000 }, (_, i) => `b${i}`);
    const parts = diffTokens(before, after);
    expect(parts.map((p) => p.type)).toEqual(["removed", "added"]);
  });
});
