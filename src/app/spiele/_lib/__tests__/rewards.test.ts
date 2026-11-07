import { describe, expect, it } from "@jest/globals";
import { praiseFor, starsFor } from "../rewards";

describe("starsFor", () => {
  it.each([
    [59, 0],
    [60, 1],
    [75, 2],
    [90, 3],
    [100, 3],
  ])("%i %% gives %i stars", (percent, stars) => {
    expect(starsFor(percent)).toBe(stars);
  });
});

describe("praise", () => {
  it("celebrates every fifth note in a row", () => {
    expect(praiseFor(10)).toBe("10 in Folge");
    expect(praiseFor(9)).not.toContain("in Folge");
  });

  it("always has something to say", () => {
    for (let streak = 0; streak < 30; streak++) {
      expect(praiseFor(streak).length).toBeGreaterThan(0);
    }
  });
});
