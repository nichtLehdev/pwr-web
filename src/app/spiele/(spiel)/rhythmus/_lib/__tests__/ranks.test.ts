import { describe, expect, it } from "@jest/globals";
import { MAX_STARS, rankFor } from "../ranks";

describe("rankFor", () => {
  it("starts at the first rank and names the next goal", () => {
    expect(rankFor(0)).toEqual({
      title: "Neu im Chor",
      nextTitle: "Jungbläser:in",
      starsToNext: 5,
    });
  });

  it("switches exactly at the threshold", () => {
    expect(rankFor(4).title).toBe("Neu im Chor");
    expect(rankFor(5).title).toBe("Jungbläser:in");
  });

  it("is reachable: all stars give the top rank", () => {
    expect(rankFor(MAX_STARS)).toEqual({
      title: "Chorleitung",
      nextTitle: null,
      starsToNext: 0,
    });
  });
});
