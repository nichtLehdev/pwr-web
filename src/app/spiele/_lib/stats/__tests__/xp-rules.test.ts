import { describe, expect, it } from "@jest/globals";
import { capToDay, DAILY_XP_CAP, roundXp } from "../xp-rules";

describe("roundXp", () => {
  it("pays a new stage in full and a replay only a quarter", () => {
    expect(roundXp({ kind: "lesson", percent: 100 })).toBe(20);
    expect(roundXp({ kind: "lesson", percent: 100, replay: true })).toBe(5);
  });

  it("doubles the first daily practice of the day", () => {
    expect(
      roundXp({ kind: "daily", percent: 100, firstDailyToday: true }),
    ).toBe(40);
    expect(roundXp({ kind: "daily", percent: 100 })).toBe(5);
  });

  it("adds a bonus for the first passed challenge", () => {
    expect(roundXp({ kind: "challenge", percent: 80, firstPass: true })).toBe(
      27,
    );
  });

  it("rewards distance in Endlos, capped", () => {
    expect(roundXp({ kind: "endless", percent: 0, reached: 10 })).toBe(10);
    expect(roundXp({ kind: "endless", percent: 0, reached: 500 })).toBe(20);
  });

  it("gives free practice half", () => {
    expect(roundXp({ kind: "free", percent: 100 })).toBe(10);
  });
});

describe("capToDay", () => {
  it("stops at the daily cap", () => {
    expect(capToDay(30, DAILY_XP_CAP - 10)).toBe(10);
    expect(capToDay(30, DAILY_XP_CAP)).toBe(0);
    expect(capToDay(30, 0)).toBe(30);
  });
});
