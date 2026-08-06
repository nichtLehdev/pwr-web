import type { ClefKind, WrittenPitch } from "./types";
import { staffHalfLineIndex } from "./pitch";

function lineOrSpaceGerman(slot: number): {
  kind: "Linie" | "Zwischenraum";
  n: number;
} {
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

/**
 * Deutsche Positionsbeschreibung: Linien/Zwischenräume im System,
 * darüber/darunter mit konkreter Hilfslinien-Angabe.
 * Slot 0 = unterste Linie, 8 = oberste Linie; negativ = unterhalb.
 */
export function describeWrittenNote(p: WrittenPitch, clef: ClefKind): string {
  const slot = staffHalfLineIndex(p, clef);
  const clefDe = clefNameDe(clef);

  if (slot >= 0 && slot <= 8) {
    const pos = lineOrSpaceGerman(slot);
    if (pos.kind === "Linie") {
      return `${clefDe}: ${pos.n}. Linie von unten (im Notensystem ohne Hilfslinien).`;
    }
    return `${clefDe}: ${pos.n}. Zwischenraum von unten.`;
  }

  if (slot < 0) {
    if (slot === -1) {
      return `${clefDe}: direkt unter dem System (unter der 1. Linie, ohne Hilfslinie).`;
    }
    if (slot % 2 === 0) {
      const n = -slot / 2;
      return `${clefDe}: auf der ${n}. Hilfslinie unterhalb des Systems.`;
    }
    const n = (-slot - 1) / 2;
    return `${clefDe}: unter der ${n}. Hilfslinie unterhalb des Systems.`;
  }

  if (slot === 9) {
    return `${clefDe}: direkt über dem System (über der 5. Linie, ohne Hilfslinie).`;
  }
  if (slot % 2 === 0) {
    const n = (slot - 8) / 2;
    return `${clefDe}: auf der ${n}. Hilfslinie oberhalb des Systems.`;
  }
  const n = (slot - 9) / 2;
  return `${clefDe}: über der ${n}. Hilfslinie oberhalb des Systems.`;
}
