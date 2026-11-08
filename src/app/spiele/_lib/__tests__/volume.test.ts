import { describe, expect, it } from "@jest/globals";
import { DEFAULT_VOLUME, gainForVolume, loadVolume } from "../volume";

describe("game volume", () => {
  it("falls back to the default without storage", () => {
    expect(loadVolume()).toBe(DEFAULT_VOLUME);
  });

  it("maps the slider to gain on a curve the ear hears as even", () => {
    expect(gainForVolume(0)).toBe(0);
    expect(gainForVolume(1)).toBe(1);
    expect(gainForVolume(0.5)).toBeCloseTo(0.25);
  });
});
