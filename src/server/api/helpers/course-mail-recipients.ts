/**
 * Wer eine Kursmail bekommt. Ausgelagert aus dem Router, damit die Zuordnung von
 * Anmeldung zu Umschlag ohne tRPC- und Prisma-Kontext prüfbar bleibt.
 */

export type RegistrationForMail = {
  id: string;
  registrantEmail: string;
  registrantFirstName: string;
  registrantLastName: string;
  registrantStreet: string | null;
  registrantZipCode: string | null;
  registrantCity: string | null;
  totalPrice: number;
  participants: {
    firstName: string;
    lastName: string;
    instrument: string | null;
  }[];
};

export type Recipient = {
  email: string;
  /**
   * Adresse, auf die die Rechnung ausgestellt ist, wenn das nicht die anmeldende
   * Person ist: dorthin geht die Nachricht, `email` bekommt sie nur in Kopie.
   */
  billingEmail: string | null;
  firstName: string;
  lastName: string;
  street: string | null;
  zipCode: string | null;
  city: string | null;
  registrationIds: string[];
  participantNames: string[];
  instruments: string[];
  totalPrice: number;
};

/** An welche Adresse die Nachricht geht — die Rechnungsadresse hat Vorrang. */
export const mailToAddress = (recipient: Recipient) =>
  recipient.billingEmail ?? recipient.email;

/**
 * Die abweichende Rechnungsadresse einer Anmeldung. Eine Anmeldung bleibt dabei eine
 * Einheit: die erste abweichende Adresse gilt für alle ihre Rechnungen.
 */
export function invoiceBillingEmail(
  registrantEmail: string,
  invoices: { recipientEmail: string | null }[],
): string | null {
  const own = registrantEmail.trim().toLowerCase();
  for (const invoice of invoices) {
    const email = invoice.recipientEmail?.trim();
    if (email && email.toLowerCase() !== own) return email;
  }
  return null;
}

/**
 * One entry per address: someone who registered twice gets one mail, with the registrations
 * merged so {{teilnehmer.namen}} names every child. `billingEmailFor` teilt diese
 * Zusammenfassung wieder nach Rechnungsadresse — zwei Rechnungen an zwei Zahlstellen dürfen
 * nicht im selben Umschlag liegen.
 */
export function groupRecipients(
  registrations: RegistrationForMail[],
  billingEmailFor?: (registration: RegistrationForMail) => string | null,
): Recipient[] {
  const byAddress = new Map<string, Recipient>();

  for (const registration of registrations) {
    const email = registration.registrantEmail.trim();
    if (!email) continue;
    const billingEmail = billingEmailFor?.(registration) ?? null;
    const key = JSON.stringify([
      email.toLowerCase(),
      billingEmail?.toLowerCase() ?? "",
    ]);

    const recipient = byAddress.get(key) ?? {
      email,
      billingEmail,
      firstName: registration.registrantFirstName,
      lastName: registration.registrantLastName,
      street: registration.registrantStreet,
      zipCode: registration.registrantZipCode,
      city: registration.registrantCity,
      registrationIds: [],
      participantNames: [],
      instruments: [],
      totalPrice: 0,
    };

    recipient.registrationIds.push(registration.id);
    recipient.totalPrice += registration.totalPrice;
    for (const participant of registration.participants) {
      recipient.participantNames.push(
        `${participant.firstName} ${participant.lastName}`.trim(),
      );
      const instrument = participant.instrument?.trim();
      if (instrument && !recipient.instruments.includes(instrument)) {
        recipient.instruments.push(instrument);
      }
    }

    byAddress.set(key, recipient);
  }

  return [...byAddress.values()];
}
