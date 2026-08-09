import { describe, expect, it } from "@jest/globals";
import {
  buildInvoiceDraft,
  defaultDueDate,
  lineItemsFromRegistration,
  recipientFromRegistration,
  type CourseForDraft,
  type RegistrationForDraft,
} from "../invoice-draft";
import { SiblingDiscountStatus } from "~/generated/prisma/enums";

const COURSE_START = new Date("2026-09-01T10:00:00");

const course: CourseForDraft = {
  startDate: COURSE_START,
  priceOptions: [
    { label: "Vollzahler", price: 145 },
    { label: "Ermäßigt", price: 95 },
  ],
};

const bornYearsAgo = (years: number) =>
  new Date(
    COURSE_START.getFullYear() - years,
    COURSE_START.getMonth(),
    COURSE_START.getDate() - 30,
  );

const registration = (
  overrides: Partial<RegistrationForDraft> = {},
): RegistrationForDraft => ({
  registrantFirstName: "Anna",
  registrantLastName: "Muster",
  registrantEmail: "anna@example.org",
  registrantStreet: "Musterweg 1",
  registrantZipCode: "50667",
  registrantCity: "Köln",
  useSeparateBilling: false,
  billingCompany: null,
  billingFirstName: null,
  billingLastName: null,
  billingStreet: null,
  billingZipCode: null,
  billingCity: null,
  billingEmail: null,
  siblingDiscountApplied: false,
  siblingDiscountStatus: SiblingDiscountStatus.NONE,
  participants: [
    {
      firstName: "Ben",
      lastName: "Muster",
      priceOption: "Vollzahler",
      siblingGroupId: null,
      birthDate: bornYearsAgo(12),
    },
  ],
  ...overrides,
});

describe("recipientFromRegistration", () => {
  it("addresses the registrant when there is no separate billing address", () => {
    expect(recipientFromRegistration(registration())).toEqual({
      company: null,
      firstName: "Anna",
      lastName: "Muster",
      street: "Musterweg 1",
      zipCode: "50667",
      city: "Köln",
      email: "anna@example.org",
    });
  });

  it("uses the billing address when one was given", () => {
    const recipient = recipientFromRegistration(
      registration({
        useSeparateBilling: true,
        billingCompany: "Kirchengemeinde Bonn",
        billingFirstName: "Clara",
        billingLastName: "Beispiel",
        billingStreet: "Kirchweg 3",
        billingZipCode: "53111",
        billingCity: "Bonn",
        billingEmail: "buchhaltung@example.org",
      }),
    );
    expect(recipient.company).toBe("Kirchengemeinde Bonn");
    expect(recipient.lastName).toBe("Beispiel");
    expect(recipient.email).toBe("buchhaltung@example.org");
  });

  it("falls back to the registrant's e-mail when billing has none", () => {
    const recipient = recipientFromRegistration(
      registration({
        useSeparateBilling: true,
        billingFirstName: "Clara",
        billingLastName: "Beispiel",
        billingEmail: null,
      }),
    );
    expect(recipient.email).toBe("anna@example.org");
  });

  it("ignores the billing flag when no billing name was entered", () => {
    const recipient = recipientFromRegistration(
      registration({ useSeparateBilling: true }),
    );
    expect(recipient.lastName).toBe("Muster");
  });
});

describe("lineItemsFromRegistration", () => {
  it("creates one line per participant, labelled with the price option", () => {
    const items = lineItemsFromRegistration(registration(), course);
    expect(items).toEqual([
      {
        description: "Ben Muster",
        detail: "Vollzahler",
        quantity: 1,
        unitPrice: 145,
      },
    ]);
  });

  it("prices an unknown or missing price option at zero rather than guessing", () => {
    const items = lineItemsFromRegistration(
      registration({
        participants: [
          {
            firstName: "Ben",
            lastName: "Muster",
            priceOption: null,
            siblingGroupId: null,
            birthDate: bornYearsAgo(12),
          },
        ],
      }),
      course,
    );
    expect(items[0]?.unitPrice).toBe(0);
  });

  const siblings = (): RegistrationForDraft["participants"] => [
    {
      firstName: "Ben",
      lastName: "Muster",
      priceOption: "Vollzahler",
      siblingGroupId: "group-1",
      birthDate: bornYearsAgo(14),
    },
    {
      firstName: "Clara",
      lastName: "Muster",
      priceOption: "Vollzahler",
      siblingGroupId: "group-1",
      birthDate: bornYearsAgo(11),
    },
  ];

  it("adds a discount line for each granted sibling discount", () => {
    const items = lineItemsFromRegistration(
      registration({
        siblingDiscountApplied: true,
        siblingDiscountStatus: SiblingDiscountStatus.APPROVED,
        participants: siblings(),
      }),
      course,
    );

    expect(items).toHaveLength(3);
    expect(items[2]).toEqual({
      description: "Geschwisterkindrabatt (20 %)",
      detail: "Clara Muster",
      quantity: 1,
      unitPrice: -29,
    });
  });

  it("omits the discount once it has been rejected", () => {
    const items = lineItemsFromRegistration(
      registration({
        siblingDiscountApplied: true,
        siblingDiscountStatus: SiblingDiscountStatus.REJECTED,
        participants: siblings(),
      }),
      course,
    );
    expect(items).toHaveLength(2);
  });

  it("omits the discount when it was never applied", () => {
    const items = lineItemsFromRegistration(
      registration({ participants: siblings() }),
      course,
    );
    expect(items).toHaveLength(2);
  });
});

describe("buildInvoiceDraft", () => {
  it("totals the prefilled lines", () => {
    const draft = buildInvoiceDraft(
      registration({
        siblingDiscountApplied: true,
        siblingDiscountStatus: SiblingDiscountStatus.APPROVED,
        participants: [
          {
            firstName: "Ben",
            lastName: "Muster",
            priceOption: "Vollzahler",
            siblingGroupId: "group-1",
            birthDate: bornYearsAgo(14),
          },
          {
            firstName: "Clara",
            lastName: "Muster",
            priceOption: "Ermäßigt",
            siblingGroupId: "group-1",
            birthDate: bornYearsAgo(11),
          },
        ],
      }),
      course,
    );

    // 145 + 95 − 19 (20 % of the younger sibling's 95)
    expect(draft.totalAmount).toBe(221);
    expect(draft.recipient.lastName).toBe("Muster");
  });
});

describe("defaultDueDate", () => {
  it("is three weeks after the invoice date", () => {
    expect(defaultDueDate(new Date("2026-09-01T10:00:00"))).toEqual(
      new Date("2026-09-22T10:00:00"),
    );
  });

  it("does not mutate the date it was given", () => {
    const from = new Date("2026-09-01T10:00:00");
    defaultDueDate(from);
    expect(from).toEqual(new Date("2026-09-01T10:00:00"));
  });
});
