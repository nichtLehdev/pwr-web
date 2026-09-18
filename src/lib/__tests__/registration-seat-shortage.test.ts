import { describe, expect, it } from "@jest/globals";
import {
  isPriceOptionFullFor,
  registrationSeatShortage,
} from "../registration-seat-shortage";

const priceOptions = [
  { id: "erwachsene", maxParticipants: 10 },
  { id: "kinder", maxParticipants: null },
];

describe("registrationSeatShortage", () => {
  it("reports nothing while no participant is entered", () => {
    expect(
      registrationSeatShortage({
        participantPriceOptionIds: [],
        availableSlots: 0,
        priceOptions,
        capacityByPriceOption: null,
      }),
    ).toBeNull();
  });

  it("reports nothing when everyone fits", () => {
    expect(
      registrationSeatShortage({
        participantPriceOptionIds: ["kinder", "kinder"],
        availableSlots: 2,
        priceOptions,
        capacityByPriceOption: { erwachsene: 5, kinder: 2 },
      }),
    ).toBeNull();
  });

  it("reports a course with fewer free seats than participants, not only a full one", () => {
    expect(
      registrationSeatShortage({
        participantPriceOptionIds: ["kinder", "kinder", "kinder", "kinder"],
        availableSlots: 2,
        priceOptions,
        capacityByPriceOption: null,
      }),
    ).toEqual({ kind: "course", free: 2, requested: 4 });
  });

  it("treats an unlimited course as having room", () => {
    expect(
      registrationSeatShortage({
        participantPriceOptionIds: ["kinder", "kinder"],
        availableSlots: Infinity,
        priceOptions,
        capacityByPriceOption: null,
      }),
    ).toBeNull();
  });

  it("reports a full price option even though the course still has seats", () => {
    expect(
      registrationSeatShortage({
        participantPriceOptionIds: ["erwachsene", "erwachsene", "kinder"],
        availableSlots: 8,
        priceOptions,
        capacityByPriceOption: { erwachsene: 1, kinder: 8 },
      }),
    ).toEqual({
      kind: "priceOption",
      priceOptionId: "erwachsene",
      free: 1,
      requested: 2,
    });
  });

  it("ignores the shared pool of options without their own limit", () => {
    // Der Pool gilt für alle unbegrenzten Kategorien zusammen und ist über
    // `availableSlots` schon abgedeckt.
    expect(
      registrationSeatShortage({
        participantPriceOptionIds: ["kinder", "kinder"],
        availableSlots: undefined,
        priceOptions,
        capacityByPriceOption: { erwachsene: 5, kinder: 1 },
      }),
    ).toBeNull();
  });

  it("names the course before a price option", () => {
    expect(
      registrationSeatShortage({
        participantPriceOptionIds: ["erwachsene", "erwachsene"],
        availableSlots: 1,
        priceOptions,
        capacityByPriceOption: { erwachsene: 0 },
      }),
    ).toMatchObject({ kind: "course" });
  });
});

describe("isPriceOptionFullFor", () => {
  const options = [
    { id: "erwachsene", maxParticipants: null },
    { id: "jugend", maxParticipants: 2 },
  ];

  it("marks a limited category without free seats", () => {
    expect(
      isPriceOptionFullFor({
        priceOptionId: "jugend",
        otherParticipantPriceOptionIds: [],
        priceOptions: options,
        capacityByPriceOption: { jugend: 0, erwachsene: 5 },
      }),
    ).toBe(true);
  });

  it("counts the other participants of this registration against the free seats", () => {
    const input = {
      priceOptionId: "jugend",
      priceOptions: options,
      capacityByPriceOption: { jugend: 1 },
    };
    expect(
      isPriceOptionFullFor({ ...input, otherParticipantPriceOptionIds: [] }),
    ).toBe(false);
    expect(
      isPriceOptionFullFor({
        ...input,
        otherParticipantPriceOptionIds: ["erwachsene", "jugend"],
      }),
    ).toBe(true);
  });

  it("never marks a category without its own limit, like the server", () => {
    expect(
      isPriceOptionFullFor({
        priceOptionId: "erwachsene",
        otherParticipantPriceOptionIds: ["erwachsene"],
        priceOptions: options,
        capacityByPriceOption: { erwachsene: 0 },
      }),
    ).toBe(false);
  });

  it("stays open when the free seats are unknown", () => {
    expect(
      isPriceOptionFullFor({
        priceOptionId: "jugend",
        otherParticipantPriceOptionIds: ["jugend", "jugend"],
        priceOptions: options,
        capacityByPriceOption: null,
      }),
    ).toBe(false);
  });
});
