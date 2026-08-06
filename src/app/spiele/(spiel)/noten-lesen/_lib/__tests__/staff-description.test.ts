import { describe, expect, test } from "@jest/globals";
import { describeWrittenNote } from "../staff-description";
import type { WrittenPitch } from "../types";

const p = (
  letter: WrittenPitch["letter"],
  octave: number,
  alter: WrittenPitch["alter"] = 0,
): WrittenPitch => ({ letter, octave, alter });

describe("describeWrittenNote", () => {
  test("Linien und Zwischenräume im System (Violinschlüssel)", () => {
    expect(describeWrittenNote(p("E", 4), "treble")).toContain(
      "1. Linie von unten",
    );
    expect(describeWrittenNote(p("F", 4), "treble")).toContain(
      "1. Zwischenraum von unten",
    );
    expect(describeWrittenNote(p("H", 4), "treble")).toContain(
      "3. Linie von unten",
    );
    expect(describeWrittenNote(p("F", 5), "treble")).toContain(
      "5. Linie von unten",
    );
  });

  test("Noten unter dem System heißen nicht mehr „über dem System“ (alter Bug)", () => {
    const c4 = describeWrittenNote(p("C", 4), "treble");
    expect(c4).not.toContain("über dem System");
    expect(c4).not.toContain("oberhalb");
    expect(c4).toContain("1. Hilfslinie unterhalb");

    expect(describeWrittenNote(p("D", 4), "treble")).toContain(
      "direkt unter dem System",
    );
    expect(describeWrittenNote(p("H", 3), "treble")).toContain(
      "unter der 1. Hilfslinie unterhalb",
    );
    expect(describeWrittenNote(p("A", 3), "treble")).toContain(
      "2. Hilfslinie unterhalb",
    );
  });

  test("Hilfslinien oberhalb (Violinschlüssel)", () => {
    expect(describeWrittenNote(p("G", 5), "treble")).toContain(
      "direkt über dem System",
    );
    expect(describeWrittenNote(p("A", 5), "treble")).toContain(
      "auf der 1. Hilfslinie oberhalb",
    );
    expect(describeWrittenNote(p("C", 6), "treble")).toContain(
      "auf der 2. Hilfslinie oberhalb",
    );
    expect(describeWrittenNote(p("H", 5), "treble")).toContain(
      "über der 1. Hilfslinie oberhalb",
    );
  });

  test("Bassschlüssel unterhalb", () => {
    expect(describeWrittenNote(p("F", 2), "bass")).toContain(
      "direkt unter dem System",
    );
    expect(describeWrittenNote(p("E", 2), "bass")).toContain(
      "auf der 1. Hilfslinie unterhalb",
    );
    expect(describeWrittenNote(p("H", 1), "bass")).toContain(
      "unter der 2. Hilfslinie unterhalb",
    );
  });

  test("C-Schlüssel: C4 liegt auf der richtigen Linie", () => {
    expect(describeWrittenNote(p("C", 4), "alto")).toContain(
      "3. Linie von unten",
    );
    expect(describeWrittenNote(p("C", 4), "tenor")).toContain(
      "4. Linie von unten",
    );
  });
});
