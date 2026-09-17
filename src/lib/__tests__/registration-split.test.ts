import { describe, expect, it } from "@jest/globals";
import {
  defaultSeatSelection,
  normalizeSeatSelection,
  partPricing,
  planRegistrationParts,
  seatSelectionProblem,
  siblingDiscountWithinGroup,
  splitsSiblingGroup,
} from "../registration-split";

const priceOptions = [
  { id: "einzel", maxParticipants: 6 },
  { id: "kinder", maxParticipants: null },
];

describe("defaultSeatSelection", () => {
  it("fills the free seats in list order", () => {
    expect(
      defaultSeatSelection(["kinder", "kinder", "kinder", "kinder"], {
        availableSlots: 2,
        priceOptions,
        capacityByPriceOption: null,
      }),
    ).toEqual([0, 1]);
  });

  it("skips a participant whose price option is full and keeps filling", () => {
    expect(
      defaultSeatSelection(["einzel", "einzel", "kinder"], {
        availableSlots: 2,
        priceOptions,
        capacityByPriceOption: { einzel: 1 },
      }),
    ).toEqual([0, 2]);
  });

  it("selects nobody when no seat is free", () => {
    expect(
      defaultSeatSelection(["kinder", "kinder"], {
        availableSlots: 0,
        priceOptions,
        capacityByPriceOption: null,
      }),
    ).toEqual([]);
  });
});

describe("seatSelectionProblem", () => {
  const ids = ["einzel", "einzel", "kinder"];
  const availability = {
    availableSlots: 2,
    priceOptions,
    capacityByPriceOption: { einzel: 1 },
  };

  it("accepts a selection that fits course and price options", () => {
    expect(seatSelectionProblem(ids, [0, 2], availability)).toBeNull();
  });

  it("rejects an empty selection", () => {
    expect(seatSelectionProblem(ids, [], availability)).toEqual({
      kind: "empty",
    });
  });

  it("rejects selecting everyone, which is no split", () => {
    expect(seatSelectionProblem(ids, [0, 1, 2], availability)).toEqual({
      kind: "all",
    });
  });

  it("names a price option the selection overfills", () => {
    expect(seatSelectionProblem(ids, [0, 1], availability)).toMatchObject({
      kind: "priceOption",
      priceOptionId: "einzel",
      free: 1,
    });
  });
});

describe("normalizeSeatSelection", () => {
  it("sorts a valid selection", () => {
    expect(normalizeSeatSelection([2, 0], 4)).toEqual([0, 2]);
  });

  it.each([
    ["empty", [], 3],
    ["everyone", [0, 1, 2], 3],
    ["duplicates", [0, 0], 3],
    ["out of range", [3], 3],
    ["negative", [-1], 3],
    ["fractions", [0.5], 3],
  ])("rejects %s", (_, indexes, count) => {
    expect(normalizeSeatSelection(indexes, count)).toBeNull();
  });
});

describe("splitsSiblingGroup", () => {
  const participants = [
    { siblingGroupId: "a" },
    { siblingGroupId: "a" },
    { siblingGroupId: null },
  ];

  it("detects siblings on both sides", () => {
    expect(splitsSiblingGroup(participants, [0, 2])).toBe(true);
  });

  it("is fine when siblings stay together", () => {
    expect(splitsSiblingGroup(participants, [0, 1])).toBe(false);
  });
});

describe("sibling discount across parts", () => {
  const older = {
    birthDate: new Date("2010-01-01"),
    siblingGroupId: "a",
    price: 100,
  };
  const younger = {
    birthDate: new Date("2014-01-01"),
    siblingGroupId: "a",
    price: 100,
  };
  const other = { birthDate: new Date("2000-01-01"), price: 50 };

  it("keeps the discount of a sibling waiting on the list", () => {
    // Der Ältere zahlt voll, der Jüngere bekommt 20 % — auch getrennt.
    expect(siblingDiscountWithinGroup([younger], [older])).toBe(20);
    expect(siblingDiscountWithinGroup([older], [younger])).toBe(0);
  });

  it("prices each part from its own participants", () => {
    const participants = [older, other, younger];
    expect(
      partPricing(participants, [0, 1], { withSiblingDiscount: true }),
    ).toEqual({
      originalTotalPrice: 150,
      siblingDiscountAmount: 0,
      totalPrice: 150,
    });
    expect(
      partPricing(participants, [2], { withSiblingDiscount: true }),
    ).toEqual({
      originalTotalPrice: 100,
      siblingDiscountAmount: 20,
      totalPrice: 80,
    });
  });

  it("counts siblings in other parts of the group", () => {
    // Clara wartet in einer älteren Aufteilung; Ben rückt nun aus einer
    // zweiten Aufteilung nach — sein Rabatt hängt an ihr.
    expect(
      partPricing([younger, other], [0], {
        withSiblingDiscount: true,
        otherParticipants: [older],
      }),
    ).toEqual({
      originalTotalPrice: 100,
      siblingDiscountAmount: 20,
      totalPrice: 80,
    });
  });

  it("drops the discount when it was not applied for", () => {
    expect(
      partPricing([older, younger], [1], { withSiblingDiscount: false }),
    ).toMatchObject({ siblingDiscountAmount: 0, totalPrice: 100 });
  });
});

describe("planRegistrationParts", () => {
  const participants = [
    {
      name: "Anna",
      birthDate: new Date("2010-01-01"),
      siblingGroupId: "a",
      price: 100,
    },
    {
      name: "Ben",
      birthDate: new Date("2014-01-01"),
      siblingGroupId: "a",
      price: 100,
    },
    { name: "Clara", birthDate: new Date("2000-01-01"), price: 50 },
  ];
  const priceOf = (participant: { price: number }) => participant.price;

  it("keeps an unsplit registration in one part", () => {
    const plan = planRegistrationParts(participants, priceOf, {
      status: "WAITLIST",
      confirmedIndexes: null,
      withSiblingDiscount: true,
    });
    expect(plan.waitlist).toBeNull();
    expect(plan.primary).toMatchObject({
      status: "WAITLIST",
      originalTotalPrice: 250,
      siblingDiscountAmount: 20,
      totalPrice: 230,
    });
    expect(plan.primary.participants).toHaveLength(3);
  });

  it("confirms the chosen participants and waitlists the rest", () => {
    const plan = planRegistrationParts(participants, priceOf, {
      status: "WAITLIST",
      confirmedIndexes: [1, 2],
      withSiblingDiscount: true,
    });
    expect(plan.primary.status).toBe("CONFIRMED");
    expect(plan.primary.participants.map((p) => p.name)).toEqual([
      "Ben",
      "Clara",
    ]);
    expect(plan.primary).toMatchObject({
      siblingDiscountAmount: 20,
      totalPrice: 130,
    });
    expect(plan.waitlist?.status).toBe("WAITLIST");
    expect(plan.waitlist?.participants.map((p) => p.name)).toEqual(["Anna"]);
    expect(plan.waitlist?.totalPrice).toBe(100);
  });
});
