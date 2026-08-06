import { describe, expect, it } from "@jest/globals";
import type { WrittenPitch } from "../../../noten-lesen/_lib/types";
import { midiToWrittenPitch } from "../../../noten-lesen/_lib/ranges";
import { writtenPitchToMidi } from "../../../noten-lesen/_lib/pitch";
import {
  getRawFingeringEntry,
  isAnswerCorrect,
  merkhilfeFor,
  slideTokenMatches,
} from "../fingering-lookup";

const p = (
  letter: WrittenPitch["letter"],
  octave: number,
  alter: -1 | 0 | 1 = 0,
): WrittenPitch => ({ letter, octave, alter });

function tubaVariants(midi: number): string[][] {
  const entry = getRawFingeringEntry("tuba", midiToWrittenPitch(midi));
  expect(entry).not.toBeNull();
  return entry!.variants;
}

describe("Tuba (BB♭, 4 Ventile) — Grifftabelle", () => {
  // Offene Naturtöne der BB♭-Tuba (Konzert-MIDI) und Ventil-Halbtonwerte.
  const OPEN_PARTIALS = [34, 46, 53, 58, 62, 65];
  const VALVE_SEMITONES: Record<string, number> = {
    "1": 2,
    "2": 1,
    "3": 3,
    "4": 5,
  };

  it("alle offenen Naturtöne im Bereich sind primär offen (0)", () => {
    for (const midi of OPEN_PARTIALS) {
      expect(tubaVariants(midi)[0]).toEqual(["0"]);
    }
  });

  it("Stichproben: C2, E2, C3, C4", () => {
    expect(tubaVariants(36)[0]).toEqual(["1", "3", "4"]); // C2
    expect(tubaVariants(40)[0]).toEqual(["2", "4"]); // E2
    expect(tubaVariants(48)).toEqual([["1", "3"], ["4"]]); // C3 + Alternative
    expect(tubaVariants(60)[0]).toEqual(["1"]); // C4
  });

  it("JEDER Eintrag erfüllt die Naturton-plus-Ventil-Arithmetik", () => {
    let checked = 0;
    for (let midi = 20; midi <= 90; midi++) {
      const entry = getRawFingeringEntry("tuba", midiToWrittenPitch(midi));
      if (!entry) continue;
      checked++;
      for (const variant of entry.variants) {
        const valves = variant.filter((v) => v !== "0");
        const sum = valves.reduce((acc, v) => {
          const semis = VALVE_SEMITONES[v];
          expect(semis).toBeDefined();
          return acc + (semis ?? 0);
        }, 0);
        // Griff = Naturton minus Ventilsumme → midi + Summe muss Naturton sein.
        expect(OPEN_PARTIALS).toContain(midi + sum);
      }
    }
    // Bereich B1–F4 lückenlos abgedeckt.
    expect(checked).toBe(65 - 34 + 1);
  });
});

describe("Posaune — Zugpositionen und Register-Token", () => {
  it("neutraler Platz wird akzeptiert, wenn die Register-Variante erwartet wird", () => {
    expect(slideTokenMatches("2+", "2")).toBe(true);
    expect(slideTokenMatches("2+", "2+")).toBe(true);
    expect(slideTokenMatches("3+", "3")).toBe(true);
    expect(slideTokenMatches("2-", "2")).toBe(true);
  });

  it("einseitig: erwarteter neutraler Platz akzeptiert keine Register-Token", () => {
    expect(slideTokenMatches("2", "2+")).toBe(false);
    expect(slideTokenMatches("2", "2-")).toBe(false);
    expect(slideTokenMatches("2+", "3")).toBe(false);
    // Quartventil-Token nur exakt.
    expect(slideTokenMatches("*1", "1")).toBe(false);
    expect(slideTokenMatches("*1", "*1")).toBe(true);
  });

  it("G4 (erwartet 2+) akzeptiert im Spiel auch den neutralen 2. Platz", () => {
    const g4 = p("G", 4);
    expect(isAnswerCorrect("trombone", g4, "beginner", [["2"]])).toBe(true);
    expect(isAnswerCorrect("trombone", g4, "beginner", [["2+"]])).toBe(true);
    // Alternative 4. Platz erst bei Fortgeschritten.
    expect(isAnswerCorrect("trombone", g4, "advanced", [["4"]])).toBe(true);
  });

  it("erwarteter neutraler Platz lehnt Register-Eingaben ab", () => {
    const b2 = p("H", 2, -1); // B2 → 1. Zug
    expect(isAnswerCorrect("trombone", b2, "beginner", [["1"]])).toBe(true);
    expect(isAnswerCorrect("trombone", b2, "beginner", [["1+"]])).toBe(false);
  });

  it("Stichproben: B2 → 1, E2 → 7, C4 → 3", () => {
    expect(
      getRawFingeringEntry("trombone", p("H", 2, -1))!.variants[0],
    ).toEqual(["1"]);
    expect(getRawFingeringEntry("trombone", p("E", 2))!.variants[0]).toEqual([
      "7",
    ]);
    expect(getRawFingeringEntry("trombone", p("C", 4))!.variants[0]).toEqual([
      "3",
    ]);
  });

  it("Ges4 hat den 5. Platz als Alternative (3+ bleibt Standard)", () => {
    const entry = getRawFingeringEntry("trombone", p("G", 4, -1));
    expect(entry!.variants).toEqual([["3+"], ["5"]]);
  });
});

describe("Trompete — C-Stimme-Transposition", () => {
  it("Konzert-C4 wird mit dem B-Stimm-Griff von D4 (1+3) aufgelöst", () => {
    const c4 = p("C", 4);
    expect(writtenPitchToMidi(c4)).toBe(60);
    const entry = getRawFingeringEntry("trumpet_c", c4);
    expect(entry!.variants[0]).toEqual(["1", "3"]);
  });

  it("Trompete in B liest denselben Ton ohne Verschiebung (C4 = offen)", () => {
    const entry = getRawFingeringEntry("trumpet_bb", p("C", 4));
    expect(entry!.variants[0]).toEqual(["0"]);
  });
});

describe("merkhilfeFor — keine internen pitchKeys im Text", () => {
  const RAW_KEY_PATTERN = /[A-H]\d-?\d/; // z. B. „E40“ oder „H2-1“

  it.each([
    ["trombone", p("E", 4)],
    ["trombone", p("E", 3, -1)],
    ["tuba", p("C", 3)],
    ["trumpet_c", p("C", 4)],
    ["trumpet_bb", p("F", 4, 1)],
  ] as const)("%s: freundliches Label statt pitchKey", (inst, pitch) => {
    const text = merkhilfeFor(inst, pitch);
    expect(text.length).toBeGreaterThan(0);
    expect(RAW_KEY_PATTERN.test(text)).toBe(false);
  });

  it("nutzt den deutschen Tonnamen (z. B. Es)", () => {
    const text = merkhilfeFor("trombone", p("E", 3, -1));
    expect(text).toContain("Es");
    expect(text).not.toContain("E3-1");
  });
});
