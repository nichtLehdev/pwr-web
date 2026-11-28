import { describe, expect, it } from "@jest/globals";
import { harmonyAt, harmonyFor } from "../audio";
import { hasSteadyPitch, LEVELS } from "../levels";

const SEMITONES: Record<string, number> = {
  c: 0,
  d: 2,
  e: 4,
  f: 5,
  g: 7,
  a: 9,
  b: 11,
};

function hzOfKey(key: string): number {
  const [name, octave] = key.split("/");
  const midi = 12 * (Number(octave) + 1) + SEMITONES[name!]!;
  return 440 * 2 ** ((midi - 69) / 12);
}

describe("harmony", () => {
  it("plays exactly the note the staff shows", () => {
    for (let index = 0; index < 8; index++) {
      const { melodyHz, melodyKey } = harmonyAt(index);
      expect(melodyHz).toBeCloseTo(hzOfKey(melodyKey), 1);
    }
  });

  it("keeps one pitch and chord where the steady flag is set", () => {
    const pitches = [0, 1, 2, 3].map((index) =>
      harmonyFor({ index, steadyPitch: true }),
    );
    expect(new Set(pitches).size).toBe(1);
    const moving = [0, 1, 2, 3].map((index) => harmonyFor({ index }));
    expect(new Set(moving.map((h) => h.melodyKey)).size).toBeGreaterThan(1);
  });

  it("holds the pitch for the first section only", () => {
    const first = LEVELS.filter((level) => level.group === LEVELS[0]!.group);
    expect(first.every(hasSteadyPitch)).toBe(true);
    expect(LEVELS.filter(hasSteadyPitch)).toHaveLength(first.length);
  });
});
