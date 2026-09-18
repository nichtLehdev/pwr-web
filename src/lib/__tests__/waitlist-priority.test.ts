import { describe, expect, it } from "@jest/globals";
import { registrationSeatShortage } from "../registration-seat-shortage";
import {
  seatSummaryForNewRegistrations,
  seatsLeftForNewRegistrations,
} from "../waitlist-priority";

const priceOptions = [
  { id: "einzel", maxParticipants: 2 },
  { id: "doppel", maxParticipants: 4 },
  { id: "kinder", maxParticipants: null },
];
const seats = (
  availableSlots: number,
  capacityByPriceOption: Record<string, number>,
) => ({ availableSlots, priceOptions, capacityByPriceOption });

/** Ob eine neue Anmeldung mit diesen Teilnehmern in die übrigen Plätze passt. */
const fits = (
  left: ReturnType<typeof seats>,
  participantPriceOptionIds: string[],
) => registrationSeatShortage({ participantPriceOptionIds, ...left }) === null;

describe("seatsLeftForNewRegistrations", () => {
  it("changes nothing while nobody waits", () => {
    const free = seats(3, { einzel: 1, doppel: 2 });
    expect(seatsLeftForNewRegistrations(free, [])).toEqual(free);
    expect(fits(seatsLeftForNewRegistrations(free, []), ["doppel"])).toBe(true);
  });

  it("reserves nothing for someone waiting on a full single room", () => {
    // Einzelzimmer ausgebucht: Wer darauf wartet, blockiert die Doppelzimmer
    // nicht.
    const free = seats(3, { einzel: 0, doppel: 2 });
    const left = seatsLeftForNewRegistrations(free, [["einzel"]]);
    expect(left).toEqual(free);
    expect(fits(left, ["doppel", "doppel"])).toBe(true);
  });

  it("reserves a freed double room for someone waiting on one", () => {
    const free = seats(1, { einzel: 2, doppel: 1 });
    const left = seatsLeftForNewRegistrations(free, [["doppel"]]);
    expect(left).toEqual(seats(0, { einzel: 2, doppel: 0 }));
    expect(fits(left, ["doppel"])).toBe(false);
  });

  it("keeps a freed seat of a full course for the waiting list, whatever category newcomers need", () => {
    // Kurs insgesamt voll, ein Platz wird frei; die Wartende will ein
    // Einzelzimmer, und dort ist Platz.
    const left = seatsLeftForNewRegistrations(
      seats(1, { einzel: 2, doppel: 3 }),
      [["einzel"]],
    );
    expect(left.availableSlots).toBe(0);
    expect(fits(left, ["doppel"])).toBe(false);
    expect(fits(left, ["einzel"])).toBe(false);
    expect(fits(left, ["kinder"])).toBe(false);
  });

  it("goes through every waiting registration instead of stopping at the first that fits nowhere", () => {
    const left = seatsLeftForNewRegistrations(
      seats(4, { einzel: 0, doppel: 2 }),
      [["einzel", "einzel"], ["doppel"]],
    );
    expect(left).toEqual(seats(3, { einzel: 0, doppel: 1 }));
  });

  it("reserves the part of a registration that could move up", () => {
    const left = seatsLeftForNewRegistrations(
      seats(5, { einzel: 2, doppel: 2 }),
      [["doppel", "doppel", "doppel"]],
    );
    expect(left).toEqual(seats(3, { einzel: 2, doppel: 0 }));
    expect(fits(left, ["einzel"])).toBe(true);
    expect(fits(left, ["doppel"])).toBe(false);
  });

  it("reserves in order of registration — the earlier one gets the last seat", () => {
    const left = seatsLeftForNewRegistrations(
      seats(1, { einzel: 2, doppel: 2 }),
      [["kinder"], ["einzel"]],
    );
    expect(left).toEqual(seats(0, { einzel: 2, doppel: 2 }));
  });

  it("does not tip over for unlimited courses and categories", () => {
    const unlimited = {
      availableSlots: Infinity,
      priceOptions: [{ id: "kinder", maxParticipants: null }],
      capacityByPriceOption: {},
    };
    const left = seatsLeftForNewRegistrations(unlimited, [
      ["kinder", "kinder"],
      ["kinder"],
    ]);
    expect(left.availableSlots).toBe(Infinity);
    expect(
      registrationSeatShortage({
        participantPriceOptionIds: ["kinder", "kinder", "kinder"],
        ...left,
      }),
    ).toBeNull();

    // Unbegrenzte Kategorie in einem begrenzten Kurs: reserviert Kursplätze.
    expect(
      seatsLeftForNewRegistrations(seats(3, { einzel: 1, doppel: 1 }), [
        ["kinder"],
      ]).availableSlots,
    ).toBe(2);
  });

  it("keeps extra fields of the availability", () => {
    const free = { ...seats(2, { einzel: 1, doppel: 1 }), extra: "bleibt" };
    expect(seatsLeftForNewRegistrations(free, [["einzel"]]).extra).toBe(
      "bleibt",
    );
  });
});

describe("seatSummaryForNewRegistrations", () => {
  const summary = {
    totalCapacity: 10,
    confirmedParticipants: 8,
    availableSlots: 2,
    isFull: false,
    hasWaitingList: false,
    // „kinder“ ist unbegrenzt und zeigt den Rest des Kurses.
    capacityByPriceOption: { einzel: 1, doppel: 2, kinder: 2 },
  };

  it("passes the summary through unchanged without waiting registrations", () => {
    expect(seatSummaryForNewRegistrations(summary, priceOptions, [])).toBe(
      summary,
    );
  });

  it("shows only the seats no waiting registration could use", () => {
    expect(
      seatSummaryForNewRegistrations(summary, priceOptions, [["doppel"]]),
    ).toEqual({
      ...summary,
      availableSlots: 1,
      capacityByPriceOption: { einzel: 1, doppel: 1, kinder: 1 },
    });
  });

  it("reports the course full once the waiting list claims every seat", () => {
    const view = seatSummaryForNewRegistrations(summary, priceOptions, [
      ["doppel", "doppel", "doppel"],
    ]);
    expect(view.availableSlots).toBe(0);
    expect(view.isFull).toBe(true);
    expect(view.capacityByPriceOption).toEqual({
      einzel: 0,
      doppel: 0,
      kinder: 0,
    });
  });

  it("leaves the view alone when the waiting registrations fit nowhere", () => {
    const fullSingle = {
      ...summary,
      capacityByPriceOption: { einzel: 0, doppel: 2, kinder: 2 },
    };
    expect(
      seatSummaryForNewRegistrations(fullSingle, priceOptions, [["einzel"]]),
    ).toEqual(fullSingle);
  });

  it("keeps a missing per-category breakdown missing", () => {
    expect(
      seatSummaryForNewRegistrations(
        { ...summary, capacityByPriceOption: null },
        [],
        [["kinder"]],
      ),
    ).toEqual({ ...summary, capacityByPriceOption: null, availableSlots: 1 });
  });
});
