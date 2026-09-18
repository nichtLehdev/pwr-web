import { describe, expect, it } from "@jest/globals";
import {
  decidePromotion,
  expiredOfferClosures,
  planPromotion,
  promotionHaltText,
  promotionOfferDeadline,
  promotionOfferReminderDue,
  usableSeats,
  withSeatsTaken,
  type WaitingRegistration,
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

const now = new Date("2026-09-18T10:00:00Z");
const waiting = (
  id: string,
  participantPriceOptionIds: string[],
  extra: Partial<WaitingRegistration> = {},
): WaitingRegistration => ({
  id,
  participantPriceOptionIds,
  offerExpiresAt: null,
  passedSeats: null,
  ...extra,
});

describe("expiredOfferClosures", () => {
  it("closes only offers past their deadline", () => {
    const list = [
      waiting("abgelaufen", ["kinder", "kinder", "kinder"], {
        offerExpiresAt: new Date("2026-09-18T09:59:00Z"),
      }),
      waiting("laeuft", ["kinder"], {
        offerExpiresAt: new Date("2026-09-19T10:00:00Z"),
      }),
      waiting("ohne", ["kinder"]),
    ];
    expect(expiredOfferClosures(list, seats(2), now)).toEqual([
      { id: "abgelaufen", passedSeats: 2 },
    ]);
  });

  it("counts as passed on what the registration could use now", () => {
    // Zwei freie Plätze, aber nur einer in ihrer vollen Kategorie.
    expect(
      expiredOfferClosures(
        [
          waiting("familie", ["einzel", "einzel", "kinder"], {
            offerExpiresAt: now,
          }),
        ],
        seats(2, { einzel: 0 }),
        now,
      ),
    ).toEqual([{ id: "familie", passedSeats: 1 }]);
  });

  it("closes the offer even when no seat is free anymore", () => {
    expect(
      expiredOfferClosures(
        [waiting("a", ["kinder", "kinder"], { offerExpiresAt: now })],
        seats(0),
        now,
      ),
    ).toEqual([{ id: "a", passedSeats: 0 }]);
  });
});

describe("planPromotion", () => {
  it("says so when nobody waits", () => {
    expect(planPromotion([], seats(3), now)).toEqual({
      confirm: [],
      offer: null,
      halt: { kind: "nobody_waiting" },
    });
  });

  it("confirms everyone who fits, in order, and reports the end of the list", () => {
    expect(
      planPromotion(
        [waiting("a", ["kinder"]), waiting("b", ["kinder", "kinder"])],
        seats(5),
        now,
      ),
    ).toEqual({
      confirm: ["a", "b"],
      offer: null,
      halt: { kind: "end_of_list", passed: 0 },
    });
  });

  it("makes an offer to a partly fitting registration and stops there", () => {
    expect(
      planPromotion(
        [
          waiting("a", ["kinder"]),
          waiting("b", ["kinder", "kinder", "kinder"]),
          waiting("c", ["kinder"]),
        ],
        seats(3),
        now,
      ),
    ).toEqual({
      confirm: ["a"],
      offer: { id: "b", seats: 2 },
      halt: { kind: "offered", registrationId: "b" },
    });
  });

  it("holds the queue behind a running offer", () => {
    expect(
      planPromotion(
        [
          waiting("a", ["kinder", "kinder", "kinder"], {
            offerExpiresAt: new Date("2026-09-20T10:00:00Z"),
          }),
          waiting("b", ["kinder"]),
        ],
        seats(2),
        now,
      ),
    ).toEqual({
      confirm: [],
      offer: null,
      halt: { kind: "offer_running", registrationId: "a" },
    });
  });

  it("reports a blocked queue when the first one fits nowhere", () => {
    // Zwei Plätze frei, aber „einzel“ ist voll — die Kinder dahinter warten.
    expect(
      planPromotion(
        [waiting("a", ["einzel", "einzel"]), waiting("b", ["kinder"])],
        seats(2, { einzel: 0 }),
        now,
      ),
    ).toEqual({
      confirm: [],
      offer: null,
      halt: { kind: "does_not_fit", registrationId: "a" },
    });
  });

  it("reports no free seat rather than a blocked queue when seats ran out", () => {
    expect(
      planPromotion(
        [waiting("a", ["kinder", "kinder"]), waiting("b", ["kinder"])],
        seats(2),
        now,
      ),
    ).toEqual({
      confirm: ["a"],
      offer: null,
      halt: { kind: "no_free_seats" },
    });
    expect(
      planPromotion([waiting("a", ["kinder"])], seats(0), now).halt,
    ).toEqual({ kind: "no_free_seats" });
  });

  it("skips registrations that already passed on this many seats", () => {
    expect(
      planPromotion(
        [
          waiting("a", ["kinder", "kinder", "kinder"], { passedSeats: 2 }),
          waiting("b", ["kinder", "kinder"]),
        ],
        seats(2),
        now,
      ),
    ).toEqual({
      confirm: ["b"],
      offer: null,
      halt: { kind: "end_of_list", passed: 1 },
    });
  });

  it("counts when everyone waiting has passed on these seats", () => {
    expect(
      planPromotion(
        [waiting("a", ["kinder", "kinder", "kinder"], { passedSeats: 2 })],
        seats(2),
        now,
      ).halt,
    ).toEqual({ kind: "end_of_list", passed: 1 });
  });
});

describe("promotionHaltText", () => {
  const date = (d: Date) => d.toISOString().slice(0, 10);

  it("explains a blocked queue with the name of the registration in front", () => {
    const text = promotionHaltText(
      { kind: "does_not_fit", registrantName: "Erika Muster" },
      false,
      date,
    );
    expect(text).toContain("Vorn steht die Anmeldung von Erika Muster");
    expect(text).toContain("hält dort an");
  });

  it("names the running offer and its deadline", () => {
    expect(
      promotionHaltText(
        {
          kind: "offer_running",
          registrantName: "Max Muster",
          expiresAt: new Date("2026-09-25T10:00:00Z"),
        },
        false,
        date,
      ),
    ).toBe(
      "Das Angebot an Max Muster läuft noch bis 2026-09-25. Bis dahin hält die Warteliste an.",
    );
  });

  it("distinguishes no seat at all from seats used up in this run", () => {
    expect(promotionHaltText({ kind: "no_free_seats" }, false, date)).toBe(
      "Es ist kein Platz frei.",
    );
    expect(promotionHaltText({ kind: "no_free_seats" }, true, date)).toBe(
      "Danach ist kein Platz mehr frei.",
    );
  });

  it("stays quiet where there is nothing to explain", () => {
    expect(
      promotionHaltText(
        { kind: "offered", registrantName: "Max Muster" },
        true,
        date,
      ),
    ).toBeNull();
    expect(
      promotionHaltText({ kind: "end_of_list", passed: 0 }, true, date),
    ).toBeNull();
    expect(
      promotionHaltText({ kind: "nobody_waiting" }, true, date),
    ).toBeNull();
  });

  it("explains why nobody moved when everyone passed on these seats", () => {
    expect(
      promotionHaltText({ kind: "end_of_list", passed: 2 }, false, date),
    ).toContain("Alle 2 wartenden Anmeldungen");
  });
});
