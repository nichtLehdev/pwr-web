import { describe, expect, it } from "@jest/globals";
import { TRPCError } from "@trpc/server";
import {
  prepareParticipantsForCourse,
  resolveCoursePaymentMethod,
} from "../registration-write";

const COURSE_START = new Date("2026-07-20T00:00:00.000Z");

const priceOptions = [
  { id: "po-adult", label: "Erwachsene", price: 120, minAge: 18, maxAge: null },
  { id: "po-kid", label: "Kinder", price: 60.5, minAge: null, maxAge: 17 },
];

/** A course carrying the fixture's price options and no custom fields. */
const course = (overrides: Record<string, unknown> = {}) => ({
  startDate: COURSE_START,
  priceOptions,
  customFields: [],
  ...overrides,
});

/** Born far enough back to be `age` years old on the course's first day. */
const bornAged = (age: number) => {
  const date = new Date(COURSE_START);
  date.setFullYear(date.getFullYear() - age);
  return date;
};

/** Generic in `extra` so overrides like `{ id }` stay visible to the compiler. */
const participant = <TExtra extends object>(
  priceOptionId: string,
  extra = {} as TExtra,
) => ({
  firstName: "Anna",
  lastName: "Beispiel",
  birthDate: bornAged(40),
  priceOptionId,
  ...extra,
});

describe("prepareParticipantsForCourse", () => {
  it("resolves the price option label and sums the undiscounted total", () => {
    const { participants, originalTotalPrice } = prepareParticipantsForCourse(
      [
        participant("po-adult"),
        participant("po-kid", { birthDate: bornAged(10) }),
      ],
      course(),
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
      course(),
    );

    expect(participants[0]).toMatchObject({
      id: "existing-id",
      priceOption: "Erwachsene",
    });
  });

  it("rejects an unknown price option", () => {
    expect(() =>
      prepareParticipantsForCourse([participant("po-gone")], course()),
    ).toThrow(TRPCError);
  });

  it("rejects a missing required custom field", () => {
    expect(() =>
      prepareParticipantsForCourse(
        [participant("po-adult")],
        course({
          customFields: [
            {
              fieldName: "Stimme",
              fieldType: "TEXT",
              isRequired: true,
              options: null,
            },
          ],
        }),
      ),
    ).toThrow(/Stimme/);
  });

  it("normalises custom field values against the course definition", () => {
    const { participants } = prepareParticipantsForCourse(
      [participant("po-adult", { customFields: { Stimme: "Trompete" } })],
      course({
        customFields: [
          {
            fieldName: "Stimme",
            fieldType: "SELECT",
            isRequired: false,
            options: ["Trompete", "Posaune"],
          },
        ],
      }),
    );

    expect(participants[0]?.customFields).toEqual({ Stimme: "Trompete" });
  });

  it("returns a zero total for an empty participant list", () => {
    expect(prepareParticipantsForCourse([], course())).toEqual({
      participants: [],
      originalTotalPrice: 0,
    });
  });

  it("rejects a price option the participant is too young for", () => {
    expect(() =>
      prepareParticipantsForCourse(
        [participant("po-adult", { birthDate: bornAged(17) })],
        course(),
      ),
    ).toThrow(/Anna Beispiel.*Erwachsene.*ab 18 Jahren/);
  });

  it("rejects a price option the participant is too old for", () => {
    expect(() =>
      prepareParticipantsForCourse(
        [participant("po-kid", { birthDate: bornAged(18) })],
        course(),
      ),
    ).toThrow(/bis 17 Jahre/);
  });

  it("measures the age at the course start, not at the time of registration", () => {
    // Turns 18 one day before the course begins — the adult category is the
    // right one, even though the registrant is 17 while filling in the form.
    const dayBeforeStart = new Date(COURSE_START);
    dayBeforeStart.setFullYear(dayBeforeStart.getFullYear() - 18);
    dayBeforeStart.setDate(dayBeforeStart.getDate() - 1);

    expect(() =>
      prepareParticipantsForCourse(
        [participant("po-adult", { birthDate: dayBeforeStart })],
        course(),
      ),
    ).not.toThrow();
  });

  it("lets the course team place a participant outside the limits anyway", () => {
    const { participants } = prepareParticipantsForCourse(
      [participant("po-kid", { birthDate: bornAged(30) })],
      course(),
      { allowAgeMismatch: true },
    );

    expect(participants[0]?.priceOption).toBe("Kinder");
  });

  it("decides the override per participant when given a predicate", () => {
    const { participants } = prepareParticipantsForCourse(
      [
        participant("po-kid", {
          id: "already-booked",
          birthDate: bornAged(30),
        }),
        participant("po-adult", { id: "new-one", birthDate: bornAged(40) }),
      ],
      course(),
      { allowAgeMismatch: (p) => p.id === "already-booked" },
    );

    expect(participants.map((p) => p.priceOption)).toEqual([
      "Kinder",
      "Erwachsene",
    ]);
  });

  it("still rejects the participants the predicate does not exempt", () => {
    expect(() =>
      prepareParticipantsForCourse(
        [
          participant("po-kid", {
            id: "someone-else",
            birthDate: bornAged(30),
          }),
        ],
        course(),
        { allowAgeMismatch: (p) => p.id === "already-booked" },
      ),
    ).toThrow(/bis 17 Jahre/);
  });

  it("leaves a category without limits open to every age", () => {
    expect(() =>
      prepareParticipantsForCourse(
        [participant("po-any", { birthDate: bornAged(3) })],
        course({
          priceOptions: [{ id: "po-any", label: "Tagesgast", price: 10 }],
        }),
      ),
    ).not.toThrow();
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
