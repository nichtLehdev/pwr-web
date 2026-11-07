import { describe, expect, it } from "@jest/globals";
import { dailyStreak } from "../daily-streak";

const NOW = new Date(2026, 10, 7, 12);
const day = (offset: number, hour = 18) =>
  new Date(2026, 10, 7 + offset, hour).toISOString();

describe("dailyStreak", () => {
  it("is zero without any rounds", () => {
    expect(dailyStreak([], NOW)).toBe(0);
  });

  it("counts consecutive days, several rounds a day once", () => {
    expect(dailyStreak([day(0, 8), day(0, 9), day(-1), day(-2)], NOW)).toBe(3);
  });

  it("keeps the streak alive when today is still open", () => {
    expect(dailyStreak([day(-1), day(-2)], NOW)).toBe(2);
  });

  it("breaks after a missed day", () => {
    expect(dailyStreak([day(0, 8), day(-2), day(-3)], NOW)).toBe(1);
    expect(dailyStreak([day(-2), day(-3)], NOW)).toBe(0);
  });
});
