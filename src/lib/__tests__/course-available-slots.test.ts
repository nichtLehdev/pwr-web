import { describe, expect, it } from "@jest/globals";
import { RegistrationStatus } from "~/generated/prisma/enums";
import { getCourseCapacitySummary } from "../course-available-slots";

const confirmed = (priceOptions: (string | null)[]) => ({
  registrationStatus: RegistrationStatus.CONFIRMED,
  participants: priceOptions.map((label) => ({ priceOption: label })),
});

describe("getCourseCapacitySummary", () => {
  it("reports unlimited (not full) for a course without any limits", () => {
    const summary = getCourseCapacitySummary({
      maxParticipants: null,
      priceOptions: [],
      registrations: [confirmed([null, null])],
    });
    expect(summary.totalCapacity).toBe(Infinity);
    expect(summary.availableSlots).toBe(Infinity);
    expect(summary.isFull).toBe(false);
  });

  it("computes free seats per limited tier", () => {
    const summary = getCourseCapacitySummary({
      maxParticipants: 10,
      priceOptions: [
        { label: "Kind", maxParticipants: 4 },
        { label: "Erwachsen", maxParticipants: 6 },
      ],
      registrations: [confirmed(["Kind", "Kind", "Erwachsen"])],
    });
    expect(summary.confirmedParticipants).toBe(3);
    expect(summary.capacityByPriceOption).toEqual({
      Kind: 2,
      Erwachsen: 5,
    });
    expect(summary.availableSlots).toBe(7);
    expect(summary.isFull).toBe(false);
  });

  it("caps at course max even when tiers have room", () => {
    const summary = getCourseCapacitySummary({
      maxParticipants: 4,
      priceOptions: [
        { label: "Kind", maxParticipants: 4 },
        { label: "Erwachsen", maxParticipants: 6 },
      ],
      registrations: [confirmed(["Kind", "Erwachsen", "Erwachsen"])],
    });
    expect(summary.availableSlots).toBe(1);
  });

  it("reports full when confirmed participants reach capacity", () => {
    const summary = getCourseCapacitySummary({
      maxParticipants: 2,
      priceOptions: [],
      registrations: [confirmed([null, null])],
    });
    expect(summary.availableSlots).toBe(0);
    expect(summary.isFull).toBe(true);
  });

  it("shares the unlimited pool between unlimited tiers under a course max", () => {
    const summary = getCourseCapacitySummary({
      maxParticipants: 10,
      priceOptions: [
        { label: "Limitiert", maxParticipants: 4 },
        { label: "Offen", maxParticipants: null },
      ],
      registrations: [confirmed(["Offen", "Offen"])],
    });
    // Unlimited pool = 10 - 4 (reserved for the limited tier) = 6, minus 2 used
    expect(summary.capacityByPriceOption).toEqual({
      Limitiert: 4,
      Offen: 4,
    });
  });
});
