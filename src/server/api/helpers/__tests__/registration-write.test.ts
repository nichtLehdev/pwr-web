import { describe, expect, it } from "@jest/globals";
import { TRPCError } from "@trpc/server";
import {
  prepareParticipantsForCourse,
  resolveCoursePaymentMethod,
} from "../registration-write";

const priceOptions = [
  { id: "po-adult", label: "Erwachsene", price: 120 },
  { id: "po-kid", label: "Kinder", price: 60.5 },
];

const participant = (priceOptionId: string, extra = {}) => ({
  firstName: "Anna",
  lastName: "Beispiel",
  priceOptionId,
  ...extra,
});

describe("prepareParticipantsForCourse", () => {
  it("resolves the price option label and sums the undiscounted total", () => {
    const { participants, originalTotalPrice } = prepareParticipantsForCourse(
      [participant("po-adult"), participant("po-kid")],
      { priceOptions, customFields: [] },
    );

    expect(participants.map((p) => p.priceOption)).toEqual([
      "Erwachsene",
      "Kinder",
    ]);
    expect(originalTotalPrice).toBe(180.5);
  });

  it("keeps extra input fields (e.g. the participant id on edits)", () => {
    const { participants } = prepareParticipantsForCourse(
      [participant("po-adult", { id: "existing-id" })],
      { priceOptions, customFields: [] },
    );

    expect(participants[0]).toMatchObject({
      id: "existing-id",
      priceOption: "Erwachsene",
    });
  });

  it("rejects an unknown price option", () => {
    expect(() =>
      prepareParticipantsForCourse([participant("po-gone")], {
        priceOptions,
        customFields: [],
      }),
    ).toThrow(TRPCError);
  });

  it("rejects a missing required custom field", () => {
    expect(() =>
      prepareParticipantsForCourse([participant("po-adult")], {
        priceOptions,
        customFields: [
          {
            fieldName: "Stimme",
            fieldType: "TEXT",
            isRequired: true,
            options: null,
          },
        ],
      }),
    ).toThrow(/Stimme/);
  });

  it("normalises custom field values against the course definition", () => {
    const { participants } = prepareParticipantsForCourse(
      [participant("po-adult", { customFields: { Stimme: "Trompete" } })],
      {
        priceOptions,
        customFields: [
          {
            fieldName: "Stimme",
            fieldType: "SELECT",
            isRequired: false,
            options: ["Trompete", "Posaune"],
          },
        ],
      },
    );

    expect(participants[0]?.customFields).toEqual({ Stimme: "Trompete" });
  });

  it("returns a zero total for an empty participant list", () => {
    expect(
      prepareParticipantsForCourse([], { priceOptions, customFields: [] }),
    ).toEqual({ participants: [], originalTotalPrice: 0 });
  });
});

describe("resolveCoursePaymentMethod", () => {
  it("returns null for free courses", () => {
    expect(resolveCoursePaymentMethod({ isFree: true }, "CASH")).toBeNull();
  });

  it("forces the only allowed method", () => {
    expect(
      resolveCoursePaymentMethod(
        { isFree: false, paymentCashAllowed: false },
        undefined,
      ),
    ).toBe("INVOICE");
    expect(
      resolveCoursePaymentMethod(
        { isFree: false, paymentInvoiceAllowed: false },
        undefined,
      ),
    ).toBe("CASH");
  });

  it("takes the submitted method when the course offers both", () => {
    expect(resolveCoursePaymentMethod({ isFree: false }, "INVOICE")).toBe(
      "INVOICE",
    );
  });

  it("requires a choice when the course offers both", () => {
    expect(() =>
      resolveCoursePaymentMethod({ isFree: false }, undefined),
    ).toThrow(/Zahlungsweise/);
  });

  it("rejects a paid course with no payment method at all", () => {
    expect(() =>
      resolveCoursePaymentMethod(
        {
          isFree: false,
          paymentCashAllowed: false,
          paymentInvoiceAllowed: false,
        },
        "CASH",
      ),
    ).toThrow(/Zahlungsarten/);
  });
});
