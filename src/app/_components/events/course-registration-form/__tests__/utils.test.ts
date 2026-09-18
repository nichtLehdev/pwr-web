import { describe, expect, it } from "@jest/globals";
import type { CourseWithRelations, RegistrationData } from "../types";
import {
  EMAIL_HINT,
  problemSummary,
  registrantProblems,
  summaryProblems,
  validateStep,
} from "../utils";

const complete: RegistrationData = {
  registrantEmail: "anna@example.com",
  registrantFirstName: "Anna",
  registrantLastName: "Muster",
  registrantPhone: "0211 123456",
  registrantStreet: "Musterstraße 1",
  registrantZipCode: "40210",
  registrantCity: "Düsseldorf",
  useSeparateBilling: false,
  billingStreet: "",
  billingZipCode: "",
  billingCity: "",
  billingCompany: "",
  billingFirstName: "",
  billingLastName: "",
  billingEmail: "",
  participants: [],
  siblingDiscountApplied: false,
  paymentMethod: undefined,
};

const empty: RegistrationData = {
  ...complete,
  registrantEmail: "",
  registrantFirstName: "",
  registrantLastName: "",
  registrantPhone: "",
  registrantStreet: "",
  registrantZipCode: "",
  registrantCity: "",
};

/** Nur die Felder, die Schritt 3 liest. */
const course = (overrides: Record<string, unknown> = {}) =>
  ({
    isFree: false,
    paymentCashAllowed: true,
    paymentInvoiceAllowed: true,
    downPaymentMode: "NONE",
    downPaymentAmount: null,
    priceOptions: [{ id: "po", price: 100, downPaymentAmount: null }],
    customFields: [],
    ...overrides,
  }) as unknown as CourseWithRelations;

const fields = (problems: { field: string }[]) => problems.map((p) => p.field);

describe("registrantProblems", () => {
  it("names every missing field of an empty step in field order", () => {
    expect(fields(registrantProblems(empty))).toEqual([
      "registrantFirstName",
      "registrantLastName",
      "registrantEmail",
      "registrantPhone",
      "registrantStreet",
      "registrantZipCode",
      "registrantCity",
    ]);
  });

  it("reports nothing for a complete step", () => {
    expect(registrantProblems(complete)).toEqual([]);
  });

  it("asks for a valid address instead of a missing one when the e-mail is malformed", () => {
    expect(
      registrantProblems({ ...complete, registrantEmail: "anna@" }),
    ).toEqual([
      {
        field: "registrantEmail",
        label: "gültige E-Mail-Adresse",
        message: EMAIL_HINT,
      },
    ]);
  });

  it("leaves phone and address optional for the course team", () => {
    expect(fields(registrantProblems(empty, true))).toEqual([
      "registrantFirstName",
      "registrantLastName",
      "registrantEmail",
    ]);
  });

  it("asks for the billing address instead of the own one when it is separate", () => {
    expect(
      fields(
        registrantProblems({
          ...complete,
          registrantStreet: "",
          registrantZipCode: "",
          registrantCity: "",
          useSeparateBilling: true,
          billingEmail: "rechnung@",
        }),
      ),
    ).toEqual([
      "billingStreet",
      "billingZipCode",
      "billingCity",
      "billingEmail",
    ]);
  });

  it("agrees with validateStep for every combination it distinguishes", () => {
    const variants: RegistrationData[] = [
      empty,
      complete,
      { ...complete, registrantPhone: "" },
      { ...complete, registrantEmail: "kein-at" },
      { ...complete, useSeparateBilling: true },
      {
        ...complete,
        useSeparateBilling: true,
        billingStreet: "Kirchplatz 1",
        billingZipCode: "40210",
        billingCity: "Düsseldorf",
      },
    ];
    for (const data of variants) {
      for (const staff of [false, true]) {
        expect(validateStep(1, data, course(), {}, false, staff)).toBe(
          registrantProblems(data, staff).length === 0,
        );
      }
    }
  });
});

describe("summaryProblems", () => {
  it("asks for payment method and consent while both are open", () => {
    expect(fields(summaryProblems(complete, course(), {}))).toEqual([
      "paymentMethod",
      "termsAccepted",
    ]);
  });

  it("needs no payment method for a free course or a single accepted one", () => {
    expect(
      fields(
        summaryProblems(complete, course({ isFree: true }), {
          termsAccepted: true,
        }),
      ),
    ).toEqual([]);
    expect(
      fields(
        summaryProblems(complete, course({ paymentInvoiceAllowed: false }), {
          termsAccepted: true,
        }),
      ),
    ).toEqual([]);
  });

  it("asks the registrant, not the course team, to acknowledge a down payment", () => {
    const withDownPayment = course({
      downPaymentMode: "COURSE",
      downPaymentAmount: 30,
    });
    const data = {
      ...complete,
      paymentMethod: "CASH" as const,
      participants: [
        {
          firstName: "Ben",
          lastName: "Muster",
          birthDate: new Date("2000-01-01"),
          city: "Essen",
          priceOptionId: "po",
        },
      ],
    };
    expect(
      fields(summaryProblems(data, withDownPayment, { termsAccepted: true })),
    ).toEqual(["downPaymentAcknowledged"]);
    expect(
      fields(
        summaryProblems(data, withDownPayment, {
          termsAccepted: true,
          staffMode: true,
        }),
      ),
    ).toEqual([]);
  });

  it("agrees with validateStep", () => {
    const data = { ...complete, paymentMethod: "INVOICE" as const };
    for (const terms of [false, true]) {
      expect(validateStep(3, data, course(), {}, terms)).toBe(
        summaryProblems(data, course(), { termsAccepted: terms }).length === 0,
      );
    }
  });
});

describe("problemSummary", () => {
  it("lists the short labels in order", () => {
    expect(
      problemSummary([
        { field: "a", label: "Vorname", message: "" },
        { field: "b", label: "Telefon", message: "" },
      ]),
    ).toBe("Noch offen: Vorname, Telefon.");
  });
});
