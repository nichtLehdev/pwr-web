import { describe, expect, it } from "@jest/globals";
import {
  computeSiblingDiscounts,
  roundMoney,
  SIBLING_DISCOUNT_RATE,
} from "../sibling-discount";

// Course starts 2026-09-01; ages are evaluated at this date.
const COURSE_START = new Date("2026-09-01T10:00:00");

const bornYearsAgo = (years: number) =>
  new Date(
    COURSE_START.getFullYear() - years,
    COURSE_START.getMonth(),
    COURSE_START.getDate() - 30,
  );

describe("roundMoney", () => {
  it("rounds to cents", () => {
    expect(roundMoney(9.100000000000001)).toBe(9.1);
    expect(roundMoney(45.5 * 0.2)).toBe(9.1);
    expect(roundMoney(0.005)).toBe(0.01);
    expect(roundMoney(10)).toBe(10);
  });
});

describe("computeSiblingDiscounts", () => {
  it("gives no discount without sibling groups", () => {
    const result = computeSiblingDiscounts(
      [
        { birthDate: bornYearsAgo(10), price: 100 },
        { birthDate: bornYearsAgo(12), price: 100 },
      ],
      COURSE_START,
    );
    expect(result.totalDiscount).toBe(0);
    expect(result.discountPerParticipant).toEqual([0, 0]);
  });

  it("gives no discount for a group of one", () => {
    const result = computeSiblingDiscounts(
      [{ birthDate: bornYearsAgo(10), siblingGroupId: "a", price: 100 }],
      COURSE_START,
    );
    expect(result.totalDiscount).toBe(0);
  });

  it("discounts every eligible sibling except the oldest", () => {
    const result = computeSiblingDiscounts(
      [
        { birthDate: bornYearsAgo(14), siblingGroupId: "a", price: 100 }, // oldest
        { birthDate: bornYearsAgo(12), siblingGroupId: "a", price: 80 },
        { birthDate: bornYearsAgo(10), siblingGroupId: "a", price: 60 },
      ],
      COURSE_START,
    );
    expect(result.discountPerParticipant).toEqual([
      0,
      roundMoney(80 * SIBLING_DISCOUNT_RATE),
      roundMoney(60 * SIBLING_DISCOUNT_RATE),
    ]);
    expect(result.totalDiscount).toBe(16 + 12);
  });

  it("is deterministic regardless of input order", () => {
    const younger = {
      birthDate: bornYearsAgo(10),
      siblingGroupId: "a",
      price: 60,
    };
    const older = {
      birthDate: bornYearsAgo(14),
      siblingGroupId: "a",
      price: 100,
    };

    const forward = computeSiblingDiscounts([older, younger], COURSE_START);
    const backward = computeSiblingDiscounts([younger, older], COURSE_START);

    // Same sibling (the younger one) is discounted in both orders.
    expect(forward.discountPerParticipant).toEqual([0, 12]);
    expect(backward.discountPerParticipant).toEqual([12, 0]);
    expect(forward.totalDiscount).toBe(backward.totalDiscount);
  });

  it("ignores adults (18+ at reference date)", () => {
    const result = computeSiblingDiscounts(
      [
        { birthDate: bornYearsAgo(20), siblingGroupId: "a", price: 100 },
        { birthDate: bornYearsAgo(10), siblingGroupId: "a", price: 80 },
      ],
      COURSE_START,
    );
    // Only one eligible (under-18) sibling → no discount.
    expect(result.totalDiscount).toBe(0);
  });

  it("evaluates age at the reference date, not today", () => {
    // 17 years old at course start, even if "today" is years later.
    const seventeenAtStart = bornYearsAgo(17);
    const result = computeSiblingDiscounts(
      [
        {
          birthDate: seventeenAtStart,
          siblingGroupId: "a",
          price: 100,
        },
        { birthDate: bornYearsAgo(15), siblingGroupId: "a", price: 100 },
      ],
      COURSE_START,
    );
    expect(result.totalDiscount).toBe(20);
  });

  it("handles multiple independent groups", () => {
    const result = computeSiblingDiscounts(
      [
        { birthDate: bornYearsAgo(14), siblingGroupId: "a", price: 100 },
        { birthDate: bornYearsAgo(12), siblingGroupId: "a", price: 100 },
        { birthDate: bornYearsAgo(13), siblingGroupId: "b", price: 50 },
        { birthDate: bornYearsAgo(11), siblingGroupId: "b", price: 50 },
        { birthDate: bornYearsAgo(9), price: 50 }, // no group
      ],
      COURSE_START,
    );
    expect(result.discountPerParticipant).toEqual([0, 20, 0, 10, 0]);
    expect(result.totalDiscount).toBe(30);
  });

  it("rounds each per-participant discount to cents", () => {
    const result = computeSiblingDiscounts(
      [
        { birthDate: bornYearsAgo(14), siblingGroupId: "a", price: 45.55 },
        { birthDate: bornYearsAgo(12), siblingGroupId: "a", price: 45.55 },
      ],
      COURSE_START,
    );
    // 45.55 * 0.2 = 9.11 exactly after rounding
    expect(result.discountPerParticipant[1]).toBe(9.11);
  });

  it("skips participants without birth date", () => {
    const result = computeSiblingDiscounts(
      [
        { birthDate: null, siblingGroupId: "a", price: 100 },
        { birthDate: bornYearsAgo(10), siblingGroupId: "a", price: 100 },
      ],
      COURSE_START,
    );
    expect(result.totalDiscount).toBe(0);
  });
});
