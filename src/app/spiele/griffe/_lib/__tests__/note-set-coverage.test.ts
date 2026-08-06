import type { WrittenPitch } from "../../../noten-lesen/_lib/types";
import {
  MIN_COVERED_PITCHES,
  noteSetCoverageForInstrument,
  noteSetUsabilityForInstrument,
} from "../note-set-coverage";

const p = (
  letter: WrittenPitch["letter"],
  octave: number,
  alter: WrittenPitch["alter"] = 0,
): WrittenPitch => ({ letter, octave, alter });

describe("noteSetCoverageForInstrument", () => {
  it("deckt ein Bassschlüssel-Set für Posaune vollständig ab", () => {
    const set = {
      clef: "bass" as const,
      // B2 (dt. B = B♭2), C3, F3 — alles Standard-Zugpositionen.
      pitches: [p("H", 2, -1), p("C", 3), p("F", 3)],
    };
    const cov = noteSetCoverageForInstrument(set, "trombone");
    expect(cov.covered).toHaveLength(3);
    expect(cov.dropped).toHaveLength(0);
    expect(cov.total).toBe(3);
  });

  it("lässt Töne außerhalb der Grifftabelle aus", () => {
    const set = {
      clef: "bass" as const,
      // C2 (MIDI 36) liegt unter dem tiefsten Tabelleneintrag der Posaune.
      pitches: [p("C", 2), p("C", 3), p("F", 3)],
    };
    const cov = noteSetCoverageForInstrument(set, "trombone");
    expect(cov.covered).toHaveLength(2);
    expect(cov.dropped).toEqual([p("C", 2)]);
  });

  it("deckt für die C-Stimme über die +2-Transposition ab (Konzert Es4 → geschr. F4)", () => {
    const set = {
      clef: "treble" as const,
      pitches: [p("E", 4, -1), p("C", 4)],
    };
    const cov = noteSetCoverageForInstrument(set, "trumpet_c");
    expect(cov.covered).toHaveLength(2);
  });

  it("deckt nichts ab, wenn der Schlüssel nicht zum Instrument passt", () => {
    const set = {
      clef: "treble" as const,
      pitches: [p("C", 4), p("D", 4), p("E", 4)],
    };
    const cov = noteSetCoverageForInstrument(set, "trombone");
    expect(cov.covered).toHaveLength(0);
    expect(cov.dropped).toHaveLength(3);
  });
});

describe("noteSetUsabilityForInstrument", () => {
  it("sperrt Sets mit weniger als 2 spielbaren Tönen — mit Begründung", () => {
    const set = {
      clef: "bass" as const,
      pitches: [p("C", 2), p("D", 2), p("C", 3)],
    };
    const usability = noteSetUsabilityForInstrument(set, "trombone");
    expect(usability.usable).toBe(false);
    if (!usability.usable) {
      expect(usability.reason).toContain("von 3 Noten");
    }
  });

  it("erlaubt Sets ab MIN_COVERED_PITCHES spielbaren Tönen", () => {
    expect(MIN_COVERED_PITCHES).toBe(2);
    const set = {
      clef: "bass" as const,
      pitches: [p("C", 3), p("F", 3)],
    };
    expect(noteSetUsabilityForInstrument(set, "trombone")).toEqual({
      usable: true,
    });
  });
});
