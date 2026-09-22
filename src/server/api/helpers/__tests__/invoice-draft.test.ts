import { describe, expect, it } from "@jest/globals";
import {
  buildInvoiceDraft,
  lineItemsFromRegistration,
  recipientFromRegistration,
  type CourseForDraft,
  type RegistrationForDraft,
} from "../invoice-draft";
import { SiblingDiscountStatus } from "~/generated/prisma/enums";
import { berlinDate } from "@/lib/berlin-time";

const COURSE_START = new Date("2026-09-01T10:00:00");

const course: CourseForDraft = {
  startDate: COURSE_START,
  priceOptions: [
    { id: "opt-voll", label: "Vollzahler", description: null, price: 145 },
    { id: "opt-erm", label: "Ermäßigt", description: null, price: 95 },
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
      priceOptionId: null,
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
        billingStreet: "Kirchweg 3",
        billingZipCode: "53111",
        billingCity: "Bonn",
        billingEmail: null,
      }),
    );
    expect(recipient.email).toBe("anna@example.org");
  });

  it("keeps company and address when no contact person was named", () => {
    const recipient = recipientFromRegistration(
      registration({
        useSeparateBilling: true,
        billingCompany: "Kirchengemeinde Bonn",
        billingStreet: "Kirchweg 3",
        billingZipCode: "53111",
        billingCity: "Bonn",
      }),
    );
    // Die Anschrift der Gemeinde, darüber der Anmelder als Ansprechperson.
    expect(recipient).toEqual({
      company: "Kirchengemeinde Bonn",
      firstName: "Anna",
      lastName: "Muster",
      street: "Kirchweg 3",
      zipCode: "53111",
      city: "Bonn",
      email: "anna@example.org",
    });
  });

  it("takes the billing name as a pair, never half of each side", () => {
    const recipient = recipientFromRegistration(
      registration({
        useSeparateBilling: true,
        billingLastName: "Beispiel",
        billingStreet: "Kirchweg 3",
        billingZipCode: "53111",
        billingCity: "Bonn",
      }),
    );
    expect(recipient.firstName).toBeNull();
    expect(recipient.lastName).toBe("Beispiel");
  });

  it("ignores the billing flag when there is no billing address", () => {
    const recipient = recipientFromRegistration(
      registration({
        useSeparateBilling: true,
        billingCompany: "Kirchengemeinde Bonn",
        billingFirstName: "Clara",
        billingLastName: "Beispiel",
      }),
    );
    expect(recipient).toEqual({
      company: null,
      firstName: "Anna",
      lastName: "Muster",
      street: "Musterweg 1",
      zipCode: "50667",
      city: "Köln",
      email: "anna@example.org",
    });
  });

  it("ignores a billing address of blanks", () => {
    const recipient = recipientFromRegistration(
      registration({
        useSeparateBilling: true,
        billingStreet: "Kirchweg 3",
        billingZipCode: "  ",
        billingCity: "Bonn",
      }),
    );
    expect(recipient.street).toBe("Musterweg 1");
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
    priceOptionId: null,
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

  it("uses the participant's own price option when two share a name", () => {
    const duplicateNameCourse: CourseForDraft = {
      startDate: COURSE_START,
      priceOptions: [
        {
          id: "opt-a",
          label: "Einzelzimmer",
          description: "Haus A",
          price: 120,
        },
        {
          id: "opt-b",
          label: "Einzelzimmer",
          description: "Haus B",
          price: 150,
        },
      ],
    };

    const items = lineItemsFromRegistration(
      registration({
        participants: [
          participant("Ben", "Einzelzimmer", { priceOptionId: "opt-b" }),
        ],
      }),
      duplicateNameCourse,
    );

    expect(items).toEqual([
      {
        description: "Einzelzimmer (Haus B)",
        detail: "Ben Muster",
        quantity: 1,
        unitPrice: 150,
      },
    ]);
  });

  it("keeps participants of same-named categories on separate lines", () => {
    const duplicateNameCourse: CourseForDraft = {
      startDate: COURSE_START,
      priceOptions: [
        {
          id: "opt-a",
          label: "Einzelzimmer",
          description: "Haus A",
          price: 120,
        },
        {
          id: "opt-b",
          label: "Einzelzimmer",
          description: "Haus B",
          price: 150,
        },
      ],
    };

    const items = lineItemsFromRegistration(
      registration({
        participants: [
          participant("Ben", "Einzelzimmer", { priceOptionId: "opt-a" }),
          participant("Clara", "Einzelzimmer", { priceOptionId: "opt-b" }),
        ],
      }),
      duplicateNameCourse,
    );

    expect(items).toEqual([
      {
        description: "Einzelzimmer (Haus A)",
        detail: "Ben Muster",
        quantity: 1,
        unitPrice: 120,
      },
      {
        description: "Einzelzimmer (Haus B)",
        detail: "Clara Muster",
        quantity: 1,
        unitPrice: 150,
      },
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
      priceOptionId: null,
      priceOption: "Vollzahler",
      siblingGroupId: "group-1",
      birthDate: bornYearsAgo(14),
    },
    {
      firstName: "Clara",
      lastName: "Muster",
      priceOptionId: null,
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

    expect(
      items.filter((item) => item.unitPrice < 0).map((i) => i.detail),
    ).toEqual(["Ben Muster, Clara Muster", "Emil Andere, Frida Andere"]);
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

  it("deducts a down payment that was received", () => {
    const items = lineItemsFromRegistration(
      registration({
        downPaymentAmount: 50,
        downPaymentStatus: "PAID",
        downPaymentPaidAmount: null,
        downPaymentPaidAt: berlinDate(2026, 6, 3),
      }),
      course,
    );
    expect(items[items.length - 1]).toEqual({
      description: "Anzahlung (bereits gezahlt)",
      detail: "eingegangen am 3.6.2026",
      quantity: 1,
      unitPrice: -50,
    });
  });

  it("deducts only the amount actually received", () => {
    const items = lineItemsFromRegistration(
      registration({
        downPaymentAmount: 50,
        downPaymentStatus: "PAID",
        downPaymentPaidAmount: 30,
      }),
      course,
    );
    expect(items[items.length - 1]?.unitPrice).toBe(-30);
  });

  it("leaves an open or refunded down payment in the invoice total", () => {
    for (const downPaymentStatus of ["OPEN", "REFUNDED"] as const) {
      const items = lineItemsFromRegistration(
        registration({ downPaymentAmount: 50, downPaymentStatus }),
        course,
      );
      expect(items).toHaveLength(1);
    }
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
            priceOptionId: null,
            priceOption: "Vollzahler",
            siblingGroupId: "group-1",
            birthDate: bornYearsAgo(14),
          },
          {
            firstName: "Clara",
            lastName: "Muster",
            priceOptionId: null,
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
