import { describe, expect, it } from "@jest/globals";
import {
  computeSiblingDiscounts,
  hasDiscountEligibleSiblingGroup,
  roundMoney,
  SIBLING_DISCOUNT_RATE,
} from "../sibling-discount";

const REFERENCE = new Date("2026-09-01T10:00:00");

const bornYearsAgo = (years: number) =>
  new Date(
    REFERENCE.getFullYear() - years,
    REFERENCE.getMonth(),
    REFERENCE.getDate() - 30,
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
    const result = computeSiblingDiscounts([
      { birthDate: bornYearsAgo(10), price: 100 },
      { birthDate: bornYearsAgo(12), price: 100 },
    ]);
    expect(result.totalDiscount).toBe(0);
    expect(result.discountPerParticipant).toEqual([0, 0]);
  });

  it("gives no discount for a group of one", () => {
    const result = computeSiblingDiscounts([
      { birthDate: bornYearsAgo(10), siblingGroupId: "a", price: 100 },
    ]);
    expect(result.totalDiscount).toBe(0);
  });

  it("discounts every eligible sibling except the oldest", () => {
    const result = computeSiblingDiscounts([
      { birthDate: bornYearsAgo(14), siblingGroupId: "a", price: 100 }, // oldest
      { birthDate: bornYearsAgo(12), siblingGroupId: "a", price: 80 },
      { birthDate: bornYearsAgo(10), siblingGroupId: "a", price: 60 },
    ]);
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

    const forward = computeSiblingDiscounts([older, younger]);
    const backward = computeSiblingDiscounts([younger, older]);

    // Same sibling (the younger one) is discounted in both orders.
    expect(forward.discountPerParticipant).toEqual([0, 12]);
    expect(backward.discountPerParticipant).toEqual([12, 0]);
    expect(forward.totalDiscount).toBe(backward.totalDiscount);
  });

  it("discounts adult siblings too", () => {
    const result = computeSiblingDiscounts([
      { birthDate: bornYearsAgo(45), siblingGroupId: "a", price: 100 },
      { birthDate: bornYearsAgo(20), siblingGroupId: "a", price: 80 },
    ]);
    // No age limit: the younger of two adult siblings is discounted.
    expect(result.discountPerParticipant).toEqual([0, 16]);
    expect(result.totalDiscount).toBe(16);
  });

  it("mixes adults and minors in one group", () => {
    const result = computeSiblingDiscounts([
      { birthDate: bornYearsAgo(20), siblingGroupId: "a", price: 100 },
      { birthDate: bornYearsAgo(10), siblingGroupId: "a", price: 80 },
    ]);
    // The adult is the oldest and pays full price; the child gets 20% off.
    expect(result.discountPerParticipant).toEqual([0, 16]);
  });

  it("handles multiple independent groups", () => {
    const result = computeSiblingDiscounts([
      { birthDate: bornYearsAgo(14), siblingGroupId: "a", price: 100 },
      { birthDate: bornYearsAgo(12), siblingGroupId: "a", price: 100 },
      { birthDate: bornYearsAgo(13), siblingGroupId: "b", price: 50 },
      { birthDate: bornYearsAgo(11), siblingGroupId: "b", price: 50 },
      { birthDate: bornYearsAgo(9), price: 50 }, // no group
    ]);
    expect(result.discountPerParticipant).toEqual([0, 20, 0, 10, 0]);
    expect(result.totalDiscount).toBe(30);
  });

  it("rounds each per-participant discount to cents", () => {
    const result = computeSiblingDiscounts([
      { birthDate: bornYearsAgo(14), siblingGroupId: "a", price: 45.55 },
      { birthDate: bornYearsAgo(12), siblingGroupId: "a", price: 45.55 },
    ]);
    // 45.55 * 0.2 = 9.11 exactly after rounding
    expect(result.discountPerParticipant[1]).toBe(9.11);
  });

  it("skips participants without birth date", () => {
    const result = computeSiblingDiscounts([
      { birthDate: null, siblingGroupId: "a", price: 100 },
      { birthDate: bornYearsAgo(10), siblingGroupId: "a", price: 100 },
    ]);
    expect(result.totalDiscount).toBe(0);
  });
});

describe("hasDiscountEligibleSiblingGroup", () => {
  it("is false without a group of two", () => {
    expect(
      hasDiscountEligibleSiblingGroup([
        { birthDate: bornYearsAgo(10), siblingGroupId: "a" },
        { birthDate: bornYearsAgo(12) },
      ]),
    ).toBe(false);
  });

  it("is true for a group of two, whatever their age", () => {
    expect(
      hasDiscountEligibleSiblingGroup([
        { birthDate: bornYearsAgo(40), siblingGroupId: "a" },
        { birthDate: bornYearsAgo(38), siblingGroupId: "a" },
      ]),
    ).toBe(true);
  });

  it("stays true when the group's price options are free", () => {
    // Asking about group size, not money: a 0 € category must not hide the
    // option from the form.
    expect(
      hasDiscountEligibleSiblingGroup([
        { birthDate: bornYearsAgo(10), siblingGroupId: "a", price: 0 },
        { birthDate: bornYearsAgo(12), siblingGroupId: "a", price: 0 },
      ]),
    ).toBe(true);
  });

  it("ignores members without a birth date", () => {
    expect(
      hasDiscountEligibleSiblingGroup([
        { birthDate: null, siblingGroupId: "a" },
        { birthDate: bornYearsAgo(12), siblingGroupId: "a" },
      ]),
    ).toBe(false);
  });
});
