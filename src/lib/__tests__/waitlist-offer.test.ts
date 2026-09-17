import { describe, expect, it } from "@jest/globals";
import {
  decidePromotion,
  promotionOfferDeadline,
  promotionOfferReminderDue,
  usableSeats,
  withSeatsTaken,
} from "../waitlist-offer";

const priceOptions = [
  { id: "einzel", maxParticipants: 6 },
  { id: "kinder", maxParticipants: null },
];
const seats = (
  availableSlots: number,
  capacityByPriceOption: Record<string, number> | null = null,
) => ({ availableSlots, priceOptions, capacityByPriceOption });

describe("promotionOfferDeadline", () => {
  const now = new Date("2026-09-15T10:00:00Z");

  it("gives seven days", () => {
    expect(
      promotionOfferDeadline(now, new Date("2026-12-01T00:00:00Z")),
    ).toEqual(new Date("2026-09-22T10:00:00Z"));
  });

  it("never runs past the course start", () => {
    const start = new Date("2026-09-18T08:00:00Z");
    expect(promotionOfferDeadline(now, start)).toEqual(start);
  });
});

describe("promotionOfferReminderDue", () => {
  const now = new Date("2026-09-20T10:00:00Z");

  it("is due within the last two days", () => {
    expect(
      promotionOfferReminderDue(
        { expiresAt: new Date("2026-09-22T09:00:00Z"), reminderSentAt: null },
        now,
      ),
    ).toBe(true);
  });

  it("is not due earlier", () => {
    expect(
      promotionOfferReminderDue(
        { expiresAt: new Date("2026-09-22T11:00:00Z"), reminderSentAt: null },
        now,
      ),
    ).toBe(false);
  });

  it("is sent only once and not for expired offers", () => {
    expect(
      promotionOfferReminderDue(
        { expiresAt: new Date("2026-09-21T10:00:00Z"), reminderSentAt: now },
        now,
      ),
    ).toBe(false);
    expect(
      promotionOfferReminderDue(
        { expiresAt: new Date("2026-09-20T09:00:00Z"), reminderSentAt: null },
        now,
      ),
    ).toBe(false);
  });
});

describe("decidePromotion", () => {
  const family = ["kinder", "kinder", "kinder"];
  const idle = { offerActive: false, passedSeats: null };

  it("confirms a registration that fits completely", () => {
    expect(decidePromotion(family, seats(3), idle)).toEqual({
      kind: "confirm",
    });
  });

  it("confirms even while an offer runs, once everyone fits", () => {
    expect(
      decidePromotion(family, seats(5), { offerActive: true, passedSeats: 1 }),
    ).toEqual({ kind: "confirm" });
  });

  it("offers the seats that fit", () => {
    expect(decidePromotion(family, seats(1), idle)).toEqual({
      kind: "offer",
      seats: 1,
    });
  });

  it("holds the queue while an offer runs", () => {
    expect(
      decidePromotion(family, seats(1), {
        offerActive: true,
        passedSeats: null,
      }),
    ).toEqual({ kind: "hold" });
  });

  it("passes seats on that were already declined", () => {
    expect(
      decidePromotion(family, seats(1), { offerActive: false, passedSeats: 1 }),
    ).toEqual({ kind: "skip" });
  });

  it("offers again once more seats are free than were declined", () => {
    expect(
      decidePromotion(family, seats(2), { offerActive: false, passedSeats: 1 }),
    ).toEqual({ kind: "offer", seats: 2 });
  });

  it("stops at a registration nobody of which fits, as before", () => {
    expect(
      decidePromotion(["einzel", "einzel"], seats(4, { einzel: 0 }), idle),
    ).toEqual({ kind: "stop" });
  });
});

describe("seat bookkeeping", () => {
  it("counts usable seats across course and price option", () => {
    expect(
      usableSeats(["einzel", "einzel", "kinder"], seats(3, { einzel: 1 })),
    ).toBe(2);
  });

  it("takes confirmed participants off course and price option", () => {
    expect(
      withSeatsTaken(seats(4, { einzel: 2 }), ["einzel", "kinder"]),
    ).toEqual(seats(2, { einzel: 1 }));
  });

  it("keeps an unlimited course unlimited", () => {
    expect(withSeatsTaken(seats(Infinity), ["kinder"]).availableSlots).toBe(
      Infinity,
    );
  });
});
