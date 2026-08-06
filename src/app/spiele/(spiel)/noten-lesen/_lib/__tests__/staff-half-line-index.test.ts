import { describe, expect, test } from "@jest/globals";
import { staffHalfLineIndex } from "../pitch";
import type { WrittenPitch } from "../types";

const p = (
  letter: WrittenPitch["letter"],
  octave: number,
  alter: WrittenPitch["alter"] = 0,
): WrittenPitch => ({ letter, octave, alter });

describe("staffHalfLineIndex (signiert, alle vier Schlüssel)", () => {
  test("Violinschlüssel: Anker E4 = 0, aufwärts positiv", () => {
    expect(staffHalfLineIndex(p("E", 4), "treble")).toBe(0);
    expect(staffHalfLineIndex(p("F", 4), "treble")).toBe(1);
    expect(staffHalfLineIndex(p("G", 4), "treble")).toBe(2);
    expect(staffHalfLineIndex(p("F", 5), "treble")).toBe(8); // oberste Linie
    expect(staffHalfLineIndex(p("G", 5), "treble")).toBe(9);
    expect(staffHalfLineIndex(p("A", 5), "treble")).toBe(10); // 1. Hilfslinie oben
    expect(staffHalfLineIndex(p("C", 6), "treble")).toBe(12); // 2. Hilfslinie oben
  });

  test("Violinschlüssel: unterhalb des Ankers negativ (vorher Bug: Loop-Guard 80)", () => {
    expect(staffHalfLineIndex(p("D", 4), "treble")).toBe(-1);
    expect(staffHalfLineIndex(p("C", 4), "treble")).toBe(-2); // 1. Hilfslinie unten
    expect(staffHalfLineIndex(p("H", 3), "treble")).toBe(-3);
    expect(staffHalfLineIndex(p("A", 3), "treble")).toBe(-4);
  });

  test("Bassschlüssel: Anker G2", () => {
    expect(staffHalfLineIndex(p("G", 2), "bass")).toBe(0);
    expect(staffHalfLineIndex(p("F", 2), "bass")).toBe(-1);
    expect(staffHalfLineIndex(p("E", 2), "bass")).toBe(-2);
    expect(staffHalfLineIndex(p("A", 2), "bass")).toBe(1);
    expect(staffHalfLineIndex(p("A", 3), "bass")).toBe(8); // oberste Linie
    expect(staffHalfLineIndex(p("C", 4), "bass")).toBe(10); // 1. Hilfslinie oben
    expect(staffHalfLineIndex(p("H", 1), "bass")).toBe(-5);
  });

  test("Altschlüssel: Anker F3, C4 auf der Mittellinie", () => {
    expect(staffHalfLineIndex(p("F", 3), "alto")).toBe(0);
    expect(staffHalfLineIndex(p("C", 4), "alto")).toBe(4); // 3. Linie
    expect(staffHalfLineIndex(p("E", 3), "alto")).toBe(-1);
    expect(staffHalfLineIndex(p("G", 4), "alto")).toBe(8); // oberste Linie
  });

  test("Tenorschlüssel: Anker D3 (VexFlow), C4 auf der 4. Linie", () => {
    expect(staffHalfLineIndex(p("D", 3), "tenor")).toBe(0);
    expect(staffHalfLineIndex(p("A", 3), "tenor")).toBe(4); // 3. Linie
    expect(staffHalfLineIndex(p("C", 4), "tenor")).toBe(6); // 4. Linie
    expect(staffHalfLineIndex(p("E", 4), "tenor")).toBe(8); // oberste Linie
    expect(staffHalfLineIndex(p("H", 2), "tenor")).toBe(-2);
  });

  test("Vorzeichen ändern die Systemposition nicht", () => {
    expect(staffHalfLineIndex(p("F", 4, 1), "treble")).toBe(
      staffHalfLineIndex(p("F", 4, 0), "treble"),
    );
    expect(staffHalfLineIndex(p("H", 1, -1), "bass")).toBe(
      staffHalfLineIndex(p("H", 1, 0), "bass"),
    );
  });
});
