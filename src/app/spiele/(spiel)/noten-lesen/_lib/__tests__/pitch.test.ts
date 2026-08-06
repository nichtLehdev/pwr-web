import { describe, expect, it } from "@jest/globals";
import {
  ADVANCED_ANSWER_BANK,
  NATURAL_ANSWER_BANK,
  answerLabelForPitch,
  labelsMatchAnswer,
  normalizeAnswerLabel,
  staffDistance,
  staffHalfLineIndex,
  writtenPitchToMidi,
} from "../pitch";
import { midiToWrittenPitch } from "../ranges";
import type { WrittenPitch } from "../types";

const p = (
  letter: WrittenPitch["letter"],
  octave: number,
  alter: WrittenPitch["alter"] = 0,
): WrittenPitch => ({ letter, octave, alter });

describe("writtenPitchToMidi", () => {
  it("maps known pitches to midi numbers", () => {
    expect(writtenPitchToMidi(p("C", 4))).toBe(60);
    expect(writtenPitchToMidi(p("A", 4))).toBe(69);
    expect(writtenPitchToMidi(p("H", 3))).toBe(59);
    expect(writtenPitchToMidi(p("G", 2))).toBe(43);
    expect(writtenPitchToMidi(p("C", 5))).toBe(72);
  });

  it("applies accidentals", () => {
    expect(writtenPitchToMidi(p("F", 4, 1))).toBe(66); // Fis
    expect(writtenPitchToMidi(p("H", 3, -1))).toBe(58); // B
    expect(writtenPitchToMidi(p("E", 4, -1))).toBe(63); // Es
  });

  it("round-trips through midiToWrittenPitch", () => {
    for (let midi = 36; midi <= 90; midi++) {
      expect(writtenPitchToMidi(midiToWrittenPitch(midi))).toBe(midi);
    }
  });
});

describe("staffHalfLineIndex / staffDistance", () => {
  it("anchors each clef at its bottom staff line", () => {
    expect(staffHalfLineIndex(p("E", 4), "treble")).toBe(0);
    expect(staffHalfLineIndex(p("G", 2), "bass")).toBe(0);
    expect(staffHalfLineIndex(p("F", 3), "alto")).toBe(0);
    // Tenorschlüssel: unterste Linie ist D3 (siehe staff-half-line-index.test.ts).
    expect(staffHalfLineIndex(p("D", 3), "tenor")).toBe(0);
  });

  it("counts diatonic steps upward", () => {
    expect(staffHalfLineIndex(p("F", 4), "treble")).toBe(1);
    expect(staffHalfLineIndex(p("G", 5), "treble")).toBe(9);
    expect(staffHalfLineIndex(p("C", 3), "bass")).toBe(3);
  });

  it("ignores the accidental (same line/space)", () => {
    expect(staffHalfLineIndex(p("F", 4, 1), "treble")).toBe(
      staffHalfLineIndex(p("F", 4, 0), "treble"),
    );
  });

  it("staffDistance is symmetric and zero for the same position", () => {
    const a = p("G", 4);
    const b = p("D", 5);
    expect(staffDistance(a, b, "treble")).toBe(staffDistance(b, a, "treble"));
    expect(staffDistance(a, a, "treble")).toBe(0);
    expect(staffDistance(p("E", 4), p("F", 4), "treble")).toBe(1);
  });
});

describe("answerLabelForPitch", () => {
  it("labels naturals with their German letter", () => {
    for (const letter of ["C", "D", "E", "F", "G", "A", "H"] as const) {
      expect(answerLabelForPitch(p(letter, 4))).toBe(letter);
    }
  });

  it("labels sharps with -is names", () => {
    expect(answerLabelForPitch(p("C", 4, 1))).toBe("Cis");
    expect(answerLabelForPitch(p("F", 4, 1))).toBe("Fis");
    expect(answerLabelForPitch(p("G", 4, 1))).toBe("Gis");
    expect(answerLabelForPitch(p("H", 4, 1))).toBe("His");
  });

  it("labels flats with German conventions", () => {
    expect(answerLabelForPitch(p("H", 4, -1))).toBe("B");
    expect(answerLabelForPitch(p("A", 4, -1))).toBe("As");
    expect(answerLabelForPitch(p("E", 4, -1))).toBe("Es");
    expect(answerLabelForPitch(p("D", 4, -1))).toBe("Des");
    expect(answerLabelForPitch(p("G", 4, -1))).toBe("Ges");
    expect(answerLabelForPitch(p("C", 4, -1))).toBe("Ces");
    expect(answerLabelForPitch(p("F", 4, -1))).toBe("Fes");
  });

  it("covers both answer banks without duplicates", () => {
    expect(new Set(NATURAL_ANSWER_BANK).size).toBe(NATURAL_ANSWER_BANK.length);
    expect(new Set(ADVANCED_ANSWER_BANK).size).toBe(
      ADVANCED_ANSWER_BANK.length,
    );
    for (const n of NATURAL_ANSWER_BANK) {
      expect(ADVANCED_ANSWER_BANK).toContain(n);
    }
  });
});

describe("normalizeAnswerLabel", () => {
  it("canonicalizes German suffix names", () => {
    expect(normalizeAnswerLabel("Fis")).toBe("f#");
    expect(normalizeAnswerLabel("Des")).toBe("db");
    expect(normalizeAnswerLabel("As")).toBe("ab");
    expect(normalizeAnswerLabel("B")).toBe("bb");
    expect(normalizeAnswerLabel("H")).toBe("h");
  });

  it("normalizes unicode accidentals, case and whitespace", () => {
    expect(normalizeAnswerLabel(" F♯ ")).toBe("f#");
    expect(normalizeAnswerLabel("E♭")).toBe("eb");
    expect(normalizeAnswerLabel("gIs")).toBe("g#");
  });
});

describe("labelsMatchAnswer", () => {
  it("matches equivalent spellings of the same label", () => {
    expect(labelsMatchAnswer("Fis", p("F", 4, 1))).toBe(true);
    expect(labelsMatchAnswer("F#", p("F", 4, 1))).toBe(true);
    expect(labelsMatchAnswer("f♯", p("F", 4, 1))).toBe(true);
    expect(labelsMatchAnswer("B", p("H", 4, -1))).toBe(true);
    expect(labelsMatchAnswer("b", p("H", 3, -1))).toBe(true);
    expect(labelsMatchAnswer("c", p("C", 4))).toBe(true);
  });

  it("rejects different letters", () => {
    expect(labelsMatchAnswer("D", p("C", 4))).toBe(false);
    expect(labelsMatchAnswer("Fis", p("G", 4))).toBe(false);
  });

  it("does not treat enharmonic respellings as the same answer", () => {
    // Cis and Des share a midi value but are distinct written answers.
    expect(labelsMatchAnswer("Des", p("C", 4, 1))).toBe(false);
    expect(labelsMatchAnswer("Cis", p("D", 4, -1))).toBe(false);
  });
});
