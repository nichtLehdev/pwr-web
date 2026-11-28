import { describe, expect, it } from "@jest/globals";
import type { GameResultEvent } from "../types";
import { xpForPercent, xpToday } from "../xp";

const NOW = new Date(2026, 10, 7, 12);
const event = (dayOffset: number, score: number): GameResultEvent => ({
  clientId: `id-${dayOffset}-${score}`,
  gameId: "rhythmus",
  playedAt: new Date(2026, 10, 7 + dayOffset, 9).toISOString(),
  score,
  maxScore: 100,
});

describe("xp", () => {
  it("rewards every round and more for better ones", () => {
    expect(xpForPercent(0)).toBe(5);
    expect(xpForPercent(100)).toBe(20);
    expect(xpForPercent(150)).toBe(20);
  });

  it("counts only today's rounds", () => {
    expect(xpToday([event(0, 100), event(0, 0), event(-1, 100)], NOW)).toBe(25);
    expect(xpToday([], NOW)).toBe(0);
  });
});
