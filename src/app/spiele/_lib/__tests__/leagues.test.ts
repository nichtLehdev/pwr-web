import { describe, expect, it } from "@jest/globals";
import {
  movementFor,
  pickGroup,
  tierName,
  weekEndOf,
  weekStartOf,
} from "../leagues";

describe("weeks", () => {
  it("start on Monday midnight German time", () => {
    // Sonntag 23:30 deutscher Zeit gehört noch zur alten Woche.
    expect(weekStartOf(new Date("2026-11-08T22:30:00Z")).toISOString()).toBe(
      "2026-11-01T23:00:00.000Z",
    );
    expect(weekStartOf(new Date("2026-11-08T23:30:00Z")).toISOString()).toBe(
      "2026-11-08T23:00:00.000Z",
    );
  });

  it("survive the switch to summer time", () => {
    const start = weekStartOf(new Date("2027-03-24T12:00:00Z"));
    expect(start.toISOString()).toBe("2027-03-21T23:00:00.000Z");
    expect(weekEndOf(start).toISOString()).toBe("2027-03-28T22:00:00.000Z");
  });
});

describe("movement", () => {
  it("lets nobody move in small groups", () => {
    expect(movementFor(0, 9, 1)).toBe(0);
  });

  it("moves the top three up and the bottom three down", () => {
    expect(movementFor(2, 12, 1)).toBe(1);
    expect(movementFor(3, 12, 1)).toBe(0);
    expect(movementFor(9, 12, 1)).toBe(-1);
  });

  it("stops at the quietest and loudest tier", () => {
    expect(movementFor(11, 12, 0)).toBe(0);
    expect(movementFor(0, 12, 4)).toBe(0);
    expect(tierName(9)).toBe("Fortissimo");
  });
});

describe("pickGroup", () => {
  it("puts everyone together while there is one open group", () => {
    expect(pickGroup([{ groupId: "a", tier: 0, members: 5 }], 3)).toBe("a");
  });

  it("separates tiers once there are several groups", () => {
    const groups = [
      { groupId: "a", tier: 0, members: 30 },
      { groupId: "b", tier: 1, members: 4 },
    ];
    expect(pickGroup(groups, 1)).toBe("b");
    expect(pickGroup(groups, 2)).toBeNull();
  });
});
