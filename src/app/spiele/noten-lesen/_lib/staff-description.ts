import type { ClefKind, WrittenPitch } from "./types";
import { staffHalfLineIndex } from "./pitch";

function lineOrSpaceGerman(slot: number): { kind: "Linie" | "Zwischenraum"; n: number } {
  const isLine = slot % 2 === 0;
  if (isLine) {
    const lineNumFromBottom = slot / 2 + 1;
    return { kind: "Linie", n: lineNumFromBottom };
  }
  const spaceNum = (slot - 1) / 2 + 1;
  return { kind: "Zwischenraum", n: spaceNum };
}

function clefNameDe(clef: ClefKind): string {
  switch (clef) {
    case "treble":
      return "Violinschlüssel";
    case "bass":
      return "Bassschlüssel";
    case "alto":
      return "Altschlüssel";
    case "tenor":
      return "Tenorschlüssel";
  }
}

export function describeWrittenNote(p: WrittenPitch, clef: ClefKind): string {
  const slot = staffHalfLineIndex(p, clef);
  const pos = lineOrSpaceGerman(slot);
  const clefDe = clefNameDe(clef);

  if (clef === "treble") {
    if (slot >= 0 && slot <= 8) {
      if (pos.kind === "Linie") {
        return `${clefDe}: ${pos.n}. Linie von unten (im Notensystem ohne Hilfslinien).`;
      }
      return `${clefDe}: ${pos.n}. Zwischenraum von unten.`;
    }
    if (slot < 0) {
      return `${clefDe}: unter dem System — Hilfslinien zeigen die Tonhöhe.`;
    }
    return `${clefDe}: über dem System — Hilfslinien zeigen die Tonhöhe.`;
  }

  if (slot >= 0 && slot <= 8) {
    if (pos.kind === "Linie") {
      return `${clefDe}: ${pos.n}. Linie von unten (im Notensystem ohne Hilfslinien).`;
    }
    return `${clefDe}: ${pos.n}. Zwischenraum von unten.`;
  }
  if (slot < 0) {
    return `${clefDe}: unter dem System — mit Hilfslinien.`;
  }
  return `${clefDe}: über dem System — mit Hilfslinien.`;
}
