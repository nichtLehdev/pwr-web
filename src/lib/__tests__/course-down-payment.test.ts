import { describe, expect, it } from "@jest/globals";
import {
  downPaymentCredit,
  downPaymentOpenAmount,
  downPaymentReference,
  downPaymentRefundNotice,
  downPaymentState,
  pinnedPaidAmountAfterChange,
  registrantEditViolation,
  registrantMayCancelDownPayment,
  registrationDownPayment,
  validateDownPaymentSettings,
  type DownPaymentCourse,
  type DownPaymentInput,
  type DownPaymentSettings,
} from "../course-down-payment";

const courseWide: DownPaymentCourse = {
  downPaymentMode: "COURSE",
  downPaymentAmount: 50,
  priceOptions: [{ id: "voll" }, { id: "erm" }],
};

const perTicket: DownPaymentCourse = {
  downPaymentMode: "TICKET",
  downPaymentAmount: null,
  priceOptions: [
    { id: "voll", downPaymentAmount: 60 },
    { id: "erm", downPaymentAmount: 30 },
    { id: "tag", downPaymentAmount: null },
  ],
};

describe("registrationDownPayment", () => {
  it("multiplies the course-wide amount by the participants", () => {
    expect(
      registrationDownPayment(courseWide, [
        { priceOptionId: "voll" },
        { priceOptionId: "erm" },
      ]),
    ).toBe(100);
  });

  it("sums per-ticket amounts and skips tickets without one", () => {
    expect(
      registrationDownPayment(perTicket, [
        { priceOptionId: "voll" },
        { priceOptionId: "erm" },
        { priceOptionId: "tag" },
      ]),
    ).toBe(90);
  });

  it("is null when nothing is due", () => {
    expect(registrationDownPayment(perTicket, [{ priceOptionId: "tag" }])).toBe(
      null,
    );
    expect(
      registrationDownPayment({ ...courseWide, downPaymentMode: "NONE" }, [
        { priceOptionId: "voll" },
      ]),
    ).toBe(null);
  });
});

describe("downPaymentReference", () => {
  it("joins prefix, course number and registrant name", () => {
    expect(downPaymentReference("202704", "John", "Doe")).toBe(
      "Anzahlung 202704 John Doe",
    );
  });

  it("stays within the SEPA limit", () => {
    expect(
      downPaymentReference("1", "A".repeat(100), "B".repeat(100)),
    ).toHaveLength(140);
  });
});

describe("downPaymentRefundNotice", () => {
  it("uses the fixed wording or the custom text", () => {
    expect(
      downPaymentRefundNotice({ downPaymentRefundPolicy: "NON_REFUNDABLE" }),
    ).toContain("nicht erstattet");
    expect(
      downPaymentRefundNotice({
        downPaymentRefundPolicy: "CUSTOM",
        downPaymentRefundText: "  Bis 4 Wochen vorher erstattet. ",
      }),
    ).toBe("Bis 4 Wochen vorher erstattet.");
  });
});

describe("validateDownPaymentSettings", () => {
  const base: DownPaymentSettings = {
    downPaymentMode: "COURSE",
    downPaymentAmount: 50,
    downPaymentRefundPolicy: "NON_REFUNDABLE",
    isFree: false,
    isExternal: false,
    courseNumber: "202704",
    allowSiblingDiscount: false,
    priceOptions: [
      { label: "Vollzahler", price: 145 },
      { label: "Ermäßigt", price: 95 },
    ],
  };

  it("accepts a sensible course-wide amount", () => {
    expect(validateDownPaymentSettings(base)).toBeNull();
  });

  it("ignores everything when no down payment is set", () => {
    expect(
      validateDownPaymentSettings({
        ...base,
        downPaymentMode: "NONE",
        courseNumber: null,
        isFree: true,
      }),
    ).toBeNull();
  });

  it("requires a course number", () => {
    expect(validateDownPaymentSettings({ ...base, courseNumber: " " })).toMatch(
      /Kursnummer/,
    );
  });

  it("rejects free and external courses", () => {
    expect(validateDownPaymentSettings({ ...base, isFree: true })).toMatch(
      /Kostenlose/,
    );
    expect(validateDownPaymentSettings({ ...base, isExternal: true })).toMatch(
      /externer/,
    );
  });

  it("rejects an amount above the cheapest ticket", () => {
    expect(
      validateDownPaymentSettings({ ...base, downPaymentAmount: 100 }),
    ).toMatch(/Ermäßigt/);
  });

  it("compares against the discounted price when siblings get 20 % off", () => {
    // 95 € − 19 € = 76 €
    expect(
      validateDownPaymentSettings({
        ...base,
        downPaymentAmount: 80,
        allowSiblingDiscount: true,
      }),
    ).toMatch(/Geschwisterkindrabatt/);
    expect(
      validateDownPaymentSettings({
        ...base,
        downPaymentAmount: 76,
        allowSiblingDiscount: true,
      }),
    ).toBeNull();
  });

  it("requires at least one per-ticket amount and allows empty ones", () => {
    const ticket: DownPaymentSettings = {
      ...base,
      downPaymentMode: "TICKET",
      downPaymentAmount: null,
      priceOptions: [
        { label: "Vollzahler", price: 145, downPaymentAmount: null },
        { label: "Tagesgast", price: 0, downPaymentAmount: null },
      ],
    };
    expect(validateDownPaymentSettings(ticket)).toMatch(/mindestens eine/);
    expect(
      validateDownPaymentSettings({
        ...ticket,
        priceOptions: [
          { label: "Vollzahler", price: 145, downPaymentAmount: 60 },
          { label: "Tagesgast", price: 0, downPaymentAmount: null },
        ],
      }),
    ).toBeNull();
  });

  it("needs a custom refund text for the custom policy", () => {
    expect(
      validateDownPaymentSettings({
        ...base,
        downPaymentRefundPolicy: "CUSTOM",
        downPaymentRefundText: "",
      }),
    ).toMatch(/Erstattung/);
  });
});

describe("registrantEditViolation", () => {
  it("blocks adding or removing participants once a down payment is booked", () => {
    expect(
      registrantEditViolation({
        course: courseWide,
        bookedDownPayment: 50,
        before: [{ priceOptionId: "voll" }],
        after: [{ priceOptionId: "voll" }, { priceOptionId: "erm" }],
      }),
    ).toMatch(/hinzugefügt oder entfernt/);
  });

  it("allows ticket switches when the amount is course-wide", () => {
    expect(
      registrantEditViolation({
        course: courseWide,
        bookedDownPayment: 50,
        before: [{ priceOptionId: "voll" }],
        after: [{ priceOptionId: "erm" }],
      }),
    ).toBeNull();
  });

  it("allows swapping people but not tickets when the amount is per ticket", () => {
    const before = [{ priceOptionId: "voll" }, { priceOptionId: "erm" }];
    expect(
      registrantEditViolation({
        course: perTicket,
        bookedDownPayment: 90,
        before,
        after: [{ priceOptionId: "erm" }, { priceOptionId: "voll" }],
      }),
    ).toBeNull();
    expect(
      registrantEditViolation({
        course: perTicket,
        bookedDownPayment: 90,
        before,
        after: [{ priceOptionId: "voll" }, { priceOptionId: "voll" }],
      }),
    ).toMatch(/Preiskategorie/);
  });

  it("leaves registrations without a down payment alone unless one would arise", () => {
    expect(
      registrantEditViolation({
        course: perTicket,
        bookedDownPayment: null,
        before: [{ priceOptionId: "tag" }],
        after: [{ priceOptionId: "tag" }, { priceOptionId: "tag" }],
      }),
    ).toBeNull();
    expect(
      registrantEditViolation({
        course: perTicket,
        bookedDownPayment: null,
        before: [{ priceOptionId: "tag" }],
        after: [{ priceOptionId: "tag" }, { priceOptionId: "voll" }],
      }),
    ).toMatch(/Kursteam/);
  });
});

describe("registrantMayCancelDownPayment", () => {
  it("only lets waitlisted registrations with a down payment cancel", () => {
    expect(
      registrantMayCancelDownPayment({
        downPaymentAmount: 50,
        registrationStatus: "CONFIRMED",
      }),
    ).toBe(false);
    expect(
      registrantMayCancelDownPayment({
        downPaymentAmount: 50,
        registrationStatus: "WAITLIST",
      }),
    ).toBe(true);
    expect(
      registrantMayCancelDownPayment({
        downPaymentAmount: null,
        registrationStatus: "CONFIRMED",
      }),
    ).toBe(true);
  });
});

describe("payment state", () => {
  const reg = (overrides: Partial<DownPaymentInput>): DownPaymentInput => ({
    downPaymentAmount: 100,
    downPaymentStatus: "OPEN",
    downPaymentPaidAmount: null,
    registrationStatus: "CONFIRMED",
    ...overrides,
  });

  it("derives open, partial and paid", () => {
    expect(downPaymentState(reg({}))).toBe("OPEN");
    expect(downPaymentState(reg({ downPaymentStatus: "PAID" }))).toBe("PAID");
    expect(
      downPaymentState(
        reg({ downPaymentStatus: "PAID", downPaymentPaidAmount: 40 }),
      ),
    ).toBe("PARTIAL");
    expect(
      downPaymentOpenAmount(
        reg({ downPaymentStatus: "PAID", downPaymentPaidAmount: 40 }),
      ),
    ).toBe(60);
  });

  it("flags cancelled registrations with a paid down payment for clarification", () => {
    expect(
      downPaymentState(
        reg({ downPaymentStatus: "PAID", registrationStatus: "CANCELLED" }),
      ),
    ).toBe("REFUND_PENDING");
    expect(
      downPaymentOpenAmount(reg({ registrationStatus: "CANCELLED" })),
    ).toBe(0);
  });

  it("credits only what was received and kept on an invoice", () => {
    expect(downPaymentCredit(reg({}))).toBe(0);
    expect(downPaymentCredit(reg({ downPaymentStatus: "PAID" }))).toBe(100);
    expect(
      downPaymentCredit(
        reg({ downPaymentStatus: "PAID", downPaymentPaidAmount: 40 }),
      ),
    ).toBe(40);
    expect(downPaymentCredit(reg({ downPaymentStatus: "REFUNDED" }))).toBe(0);
  });

  it("pins the received amount when staff change a paid registration", () => {
    expect(
      pinnedPaidAmountAfterChange(
        {
          downPaymentAmount: 100,
          downPaymentStatus: "PAID",
          downPaymentPaidAmount: null,
        },
        150,
      ),
    ).toBe(100);
    expect(
      pinnedPaidAmountAfterChange(
        {
          downPaymentAmount: 100,
          downPaymentStatus: "OPEN",
          downPaymentPaidAmount: null,
        },
        150,
      ),
    ).toBeNull();
  });
});
