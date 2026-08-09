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
  const participant = (
    firstName: string,
    priceOption: string | null,
    overrides: Partial<RegistrationForDraft["participants"][number]> = {},
  ): RegistrationForDraft["participants"][number] => ({
    firstName,
    lastName: "Muster",
    priceOption,
    siblingGroupId: null,
    birthDate: bornYearsAgo(12),
    ...overrides,
  });

  it("makes the price category the position and the participants its sub-line", () => {
    const items = lineItemsFromRegistration(registration(), course);
    expect(items).toEqual([
      {
        description: "Vollzahler",
        detail: "Ben Muster",
        quantity: 1,
        unitPrice: 145,
      },
    ]);
  });

  it("collapses participants of the same category onto one line", () => {
    const items = lineItemsFromRegistration(
      registration({
        participants: [
          participant("Ben", "Vollzahler"),
          participant("Clara", "Vollzahler"),
          participant("Dora", "Ermäßigt"),
        ],
      }),
      course,
    );

    expect(items).toEqual([
      {
        description: "Vollzahler",
        detail: "Ben Muster, Clara Muster",
        quantity: 2,
        unitPrice: 145,
      },
      {
        description: "Ermäßigt",
        detail: "Dora Muster",
        quantity: 1,
        unitPrice: 95,
      },
    ]);
  });

  it("keeps the categories in the order they were booked", () => {
    const items = lineItemsFromRegistration(
      registration({
        participants: [
          participant("Dora", "Ermäßigt"),
          participant("Ben", "Vollzahler"),
        ],
      }),
      course,
    );
    expect(items.map((item) => item.description)).toEqual([
      "Ermäßigt",
      "Vollzahler",
    ]);
  });

  it("prices an unknown or missing price option at zero rather than guessing", () => {
    const items = lineItemsFromRegistration(
      registration({ participants: [participant("Ben", null)] }),
      course,
    );
    expect(items[0]).toEqual({
      description: "Teilnahme",
      detail: "Ben Muster",
      quantity: 1,
      unitPrice: 0,
    });
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

  it("adds a discount line naming the siblings it was granted for", () => {
    const items = lineItemsFromRegistration(
      registration({
        siblingDiscountApplied: true,
        siblingDiscountStatus: SiblingDiscountStatus.APPROVED,
        participants: siblings(),
      }),
      course,
    );

    expect(items).toEqual([
      {
        description: "Vollzahler",
        detail: "Ben Muster, Clara Muster",
        quantity: 2,
        unitPrice: 145,
      },
      {
        description: "Geschwisterkindrabatt (20 %)",
        detail: "Ben Muster, Clara Muster",
        quantity: 1,
        unitPrice: -29,
      },
    ]);
  });

  it("combines children of one family on the same ticket into one line", () => {
    const items = lineItemsFromRegistration(
      registration({
        siblingDiscountApplied: true,
        siblingDiscountStatus: SiblingDiscountStatus.APPROVED,
        participants: [
          participant("Ben", "Vollzahler", {
            siblingGroupId: "group-1",
            birthDate: bornYearsAgo(15),
          }),
          participant("Clara", "Vollzahler", {
            siblingGroupId: "group-1",
            birthDate: bornYearsAgo(12),
          }),
          participant("Dora", "Vollzahler", {
            siblingGroupId: "group-1",
            birthDate: bornYearsAgo(9),
          }),
        ],
      }),
      course,
    );

    const discounts = items.filter((item) => item.unitPrice < 0);
    expect(discounts).toEqual([
      {
        description: "Geschwisterkindrabatt (20 %)",
        detail: "Ben Muster, Clara Muster, Dora Muster",
        quantity: 2,
        unitPrice: -29,
      },
    ]);
  });

  it("names each sibling group only on its own discount lines", () => {
    const items = lineItemsFromRegistration(
      registration({
        siblingDiscountApplied: true,
        siblingDiscountStatus: SiblingDiscountStatus.APPROVED,
        participants: [
          participant("Ben", "Vollzahler", {
            siblingGroupId: "group-1",
            birthDate: bornYearsAgo(15),
          }),
          participant("Clara", "Vollzahler", {
            siblingGroupId: "group-1",
            birthDate: bornYearsAgo(12),
          }),
          participant("Emil", "Vollzahler", {
            lastName: "Andere",
            siblingGroupId: "group-2",
            birthDate: bornYearsAgo(14),
          }),
          participant("Frida", "Vollzahler", {
            lastName: "Andere",
            siblingGroupId: "group-2",
            birthDate: bornYearsAgo(10),
          }),
        ],
      }),
      course,
    );

    expect(items.filter((item) => item.unitPrice < 0).map((i) => i.detail)).toEqual([
      "Ben Muster, Clara Muster",
      "Emil Andere, Frida Andere",
    ]);
  });

  it("keeps discounts of differing size apart", () => {
    const items = lineItemsFromRegistration(
      registration({
        siblingDiscountApplied: true,
        siblingDiscountStatus: SiblingDiscountStatus.APPROVED,
        participants: [
          participant("Ben", "Vollzahler", {
            siblingGroupId: "group-1",
            birthDate: bornYearsAgo(15),
          }),
          participant("Clara", "Vollzahler", {
            siblingGroupId: "group-1",
            birthDate: bornYearsAgo(12),
          }),
          participant("Dora", "Ermäßigt", {
            siblingGroupId: "group-1",
            birthDate: bornYearsAgo(9),
          }),
        ],
      }),
      course,
    );

    const discounts = items.filter((item) => item.unitPrice < 0);
    expect(discounts).toEqual([
      {
        description: "Geschwisterkindrabatt (20 %)",
        detail: "Ben Muster, Clara Muster, Dora Muster",
        quantity: 1,
        unitPrice: -29,
      },
      {
        description: "Geschwisterkindrabatt (20 %)",
        detail: "Ben Muster, Clara Muster, Dora Muster",
        quantity: 1,
        unitPrice: -19,
      },
    ]);
  });

  it("does not merge two families that happen to earn the same amount", () => {
    const items = lineItemsFromRegistration(
      registration({
        siblingDiscountApplied: true,
        siblingDiscountStatus: SiblingDiscountStatus.APPROVED,
        participants: [
          participant("Ben", "Vollzahler", {
            siblingGroupId: "group-1",
            birthDate: bornYearsAgo(15),
          }),
          participant("Clara", "Vollzahler", {
            siblingGroupId: "group-1",
            birthDate: bornYearsAgo(12),
          }),
          participant("Emil", "Vollzahler", {
            lastName: "Andere",
            siblingGroupId: "group-2",
            birthDate: bornYearsAgo(14),
          }),
          participant("Frida", "Vollzahler", {
            lastName: "Andere",
            siblingGroupId: "group-2",
            birthDate: bornYearsAgo(10),
          }),
        ],
      }),
      course,
    );

    const discounts = items.filter((item) => item.unitPrice < 0);
    expect(discounts).toEqual([
      {
        description: "Geschwisterkindrabatt (20 %)",
        detail: "Ben Muster, Clara Muster",
        quantity: 1,
        unitPrice: -29,
      },
      {
        description: "Geschwisterkindrabatt (20 %)",
        detail: "Emil Andere, Frida Andere",
        quantity: 1,
        unitPrice: -29,
      },
    ]);
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
    expect(items).toHaveLength(1);
  });

  it("omits the discount when it was never applied", () => {
    const items = lineItemsFromRegistration(
      registration({ participants: siblings() }),
      course,
    );
    expect(items).toHaveLength(1);
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
