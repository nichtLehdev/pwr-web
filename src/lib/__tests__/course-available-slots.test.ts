import { describe, expect, it } from "@jest/globals";
import { RegistrationStatus } from "~/generated/prisma/enums";
import { getCourseCapacitySummary } from "../course-available-slots";

/** Teilnehmer mit sauberer id-Zuordnung (der Normalfall nach der Migration). */
const confirmed = (priceOptionIds: (string | null)[]) => ({
  registrationStatus: RegistrationStatus.CONFIRMED,
  participants: priceOptionIds.map((id) => ({
    priceOptionId: id,
    priceOption: null,
  })),
});

/** Altbestand ohne id — nur das Label-Snapshot ist da. */
const legacy = (labels: (string | null)[]) => ({
  registrationStatus: RegistrationStatus.CONFIRMED,
  participants: labels.map((label) => ({
    priceOptionId: null,
    priceOption: label,
  })),
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

  it("computes free seats per limited tier, keyed by id", () => {
    const summary = getCourseCapacitySummary({
      maxParticipants: 10,
      priceOptions: [
        { id: "kind", label: "Kind", maxParticipants: 4 },
        { id: "erw", label: "Erwachsen", maxParticipants: 6 },
      ],
      registrations: [confirmed(["kind", "kind", "erw"])],
    });
    expect(summary.confirmedParticipants).toBe(3);
    expect(summary.capacityByPriceOption).toEqual({ kind: 2, erw: 5 });
    expect(summary.availableSlots).toBe(7);
    expect(summary.isFull).toBe(false);
  });

  it("keeps two tiers with the same label apart", () => {
    // Der gemeldete Prod-Fall: gleiche Bezeichnung, unterschiedliche
    // Beschreibung, Preis und Limit. Vor der Umstellung überschrieb der
    // zweite Eintrag den ersten und beide zeigten dieselbe Restplatzzahl.
    const summary = getCourseCapacitySummary({
      maxParticipants: 116,
      priceOptions: [
        {
          id: "wasserburg",
          label: "Erwachsene Einzelzimmer",
          maxParticipants: 6,
        },
        {
          id: "marienau",
          label: "Erwachsene Einzelzimmer",
          maxParticipants: 30,
        },
      ],
      registrations: [confirmed(["marienau"])],
    });
    expect(summary.capacityByPriceOption).toEqual({
      wasserburg: 6,
      marienau: 29,
    });
  });

  it("counts a legacy participant when its label is unambiguous", () => {
    const summary = getCourseCapacitySummary({
      maxParticipants: 10,
      priceOptions: [
        { id: "kind", label: "Kind", maxParticipants: 4 },
        { id: "erw", label: "Erwachsen", maxParticipants: 6 },
      ],
      registrations: [legacy(["Kind", "Kind"])],
    });
    expect(summary.capacityByPriceOption).toEqual({ kind: 2, erw: 6 });
  });

  it("attributes an unresolvable legacy participant to neither duplicate", () => {
    // Beiden zuzuschlagen würde die Restplätze doppelt kürzen; in der
    // Gesamtkapazität steckt der Teilnehmer weiterhin.
    const summary = getCourseCapacitySummary({
      maxParticipants: 36,
      priceOptions: [
        {
          id: "wasserburg",
          label: "Erwachsene Einzelzimmer",
          maxParticipants: 6,
        },
        {
          id: "marienau",
          label: "Erwachsene Einzelzimmer",
          maxParticipants: 30,
        },
      ],
      registrations: [legacy(["Erwachsene Einzelzimmer"])],
    });
    expect(summary.capacityByPriceOption).toEqual({
      wasserburg: 6,
      marienau: 30,
    });
    expect(summary.confirmedParticipants).toBe(1);
    expect(summary.availableSlots).toBe(35);
  });

  it("caps at course max even when tiers have room", () => {
    const summary = getCourseCapacitySummary({
      maxParticipants: 4,
      priceOptions: [
        { id: "kind", label: "Kind", maxParticipants: 4 },
        { id: "erw", label: "Erwachsen", maxParticipants: 6 },
      ],
      registrations: [confirmed(["kind", "erw", "erw"])],
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
        { id: "lim", label: "Limitiert", maxParticipants: 4 },
        { id: "offen", label: "Offen", maxParticipants: null },
      ],
      registrations: [confirmed(["offen", "offen"])],
    });
    // Unlimited pool = 10 - 4 (reserved for the limited tier) = 6, minus 2 used
    expect(summary.capacityByPriceOption).toEqual({ lim: 4, offen: 4 });
  });
});
