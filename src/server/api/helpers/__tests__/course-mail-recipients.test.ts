import { describe, expect, it } from "@jest/globals";
import {
  groupRecipients,
  invoiceBillingEmail,
  mailToAddress,
  type RegistrationForMail,
} from "../course-mail-recipients";

const registration = (
  overrides: Partial<RegistrationForMail> = {},
): RegistrationForMail => ({
  id: "reg-1",
  registrantEmail: "anna@example.org",
  registrantFirstName: "Anna",
  registrantLastName: "Beispiel",
  registrantStreet: "Hauptstr. 1",
  registrantZipCode: "40213",
  registrantCity: "Düsseldorf",
  totalPrice: 100,
  participants: [
    { firstName: "Mia", lastName: "Beispiel", instrument: "Trompete" },
  ],
  ...overrides,
});

describe("invoiceBillingEmail", () => {
  it("returns the invoice address when it differs from the registrant", () => {
    expect(
      invoiceBillingEmail("anna@example.org", [
        { recipientEmail: "kasse@posaunenchor.de" },
      ]),
    ).toBe("kasse@posaunenchor.de");
  });

  it("returns null when the invoice is made out to the registrant", () => {
    expect(
      invoiceBillingEmail("anna@example.org", [
        { recipientEmail: "Anna@Example.org" },
      ]),
    ).toBeNull();
    expect(
      invoiceBillingEmail("anna@example.org", [{ recipientEmail: null }]),
    ).toBeNull();
    expect(invoiceBillingEmail("anna@example.org", [])).toBeNull();
  });
});

describe("groupRecipients", () => {
  it("merges two registrations of the same person into one mail", () => {
    const recipients = groupRecipients([
      registration({ id: "reg-1" }),
      registration({
        id: "reg-2",
        registrantEmail: "ANNA@example.org",
        participants: [
          { firstName: "Ben", lastName: "Beispiel", instrument: "Posaune" },
        ],
      }),
    ]);

    expect(recipients).toHaveLength(1);
    expect(recipients[0]!.registrationIds).toEqual(["reg-1", "reg-2"]);
    expect(recipients[0]!.instruments).toEqual(["Trompete", "Posaune"]);
    expect(recipients[0]!.totalPrice).toBe(200);
    expect(recipients[0]!.billingEmail).toBeNull();
  });

  it("addresses the billing address and keeps the registrant for the copy", () => {
    const recipients = groupRecipients([registration()], () => "kasse@chor.de");

    expect(recipients).toHaveLength(1);
    expect(recipients[0]!.billingEmail).toBe("kasse@chor.de");
    expect(recipients[0]!.email).toBe("anna@example.org");
    expect(mailToAddress(recipients[0]!)).toBe("kasse@chor.de");
  });

  it("splits one person's registrations per billing address", () => {
    const billing: Record<string, string | null> = {
      "reg-1": "kasse@chor.de",
      "reg-2": null,
      "reg-3": "buchhaltung@schule.de",
    };
    const recipients = groupRecipients(
      [
        registration({ id: "reg-1" }),
        registration({ id: "reg-2" }),
        registration({ id: "reg-3" }),
      ],
      (entry) => billing[entry.id] ?? null,
    );

    expect(
      recipients.map((recipient) => [
        mailToAddress(recipient),
        recipient.registrationIds,
      ]),
    ).toEqual([
      ["kasse@chor.de", ["reg-1"]],
      ["anna@example.org", ["reg-2"]],
      ["buchhaltung@schule.de", ["reg-3"]],
    ]);
  });

  it("skips registrations without a registrant address", () => {
    expect(groupRecipients([registration({ registrantEmail: "  " })])).toEqual(
      [],
    );
  });
});
