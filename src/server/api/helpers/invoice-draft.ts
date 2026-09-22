/**
 * Prefills an invoice draft from a registration. The invoice then owns its own copy of
 * recipient and positions, so edits never rewrite the registration.
 */
import {
  DOWN_PAYMENT_LINE_DESCRIPTION,
  formatDate,
  invoiceTotal,
  SIBLING_DISCOUNT_LINE_DESCRIPTION,
  type InvoiceLineItem,
  type InvoiceRecipient,
} from "@/lib/invoice-document";
import { downPaymentCredit } from "@/lib/course-down-payment";
import { hasBillingAddress, isFilled } from "@/lib/billing-address";
import {
  participantPriceOptionLabel,
  resolveParticipantPriceOption,
} from "@/lib/course-price-options";
import { computeSiblingDiscounts } from "@/lib/sibling-discount";
import {
  SiblingDiscountStatus,
  type DownPaymentStatus,
  type RegistrationStatus,
} from "~/generated/prisma/enums";

export interface RegistrationForDraft {
  registrantFirstName: string;
  registrantLastName: string;
  registrantEmail: string;
  registrantStreet: string | null;
  registrantZipCode: string | null;
  registrantCity: string | null;
  useSeparateBilling: boolean;
  billingCompany: string | null;
  billingFirstName: string | null;
  billingLastName: string | null;
  billingStreet: string | null;
  billingZipCode: string | null;
  billingCity: string | null;
  billingEmail: string | null;
  siblingDiscountApplied: boolean;
  siblingDiscountStatus: SiblingDiscountStatus;
  /** Abgezogen wird nur eine als eingegangen verbuchte Anzahlung. */
  downPaymentAmount?: number | null;
  downPaymentStatus?: DownPaymentStatus | null;
  downPaymentPaidAmount?: number | null;
  downPaymentPaidAt?: Date | null;
  registrationStatus?: RegistrationStatus;
  participants: {
    firstName: string;
    lastName: string;
    priceOptionId: string | null;
    priceOption: string | null;
    siblingGroupId: string | null;
    birthDate: Date;
  }[];
}

export interface CourseForDraft {
  startDate: Date;
  priceOptions: {
    id: string;
    label: string;
    description: string | null;
    price: number;
  }[];
}

export function recipientFromRegistration(
  registration: RegistrationForDraft,
): InvoiceRecipient {
  // Ohne Anschrift gibt es nichts, wohin die Rechnung abweichend ginge.
  const useBilling =
    registration.useSeparateBilling && hasBillingAddress(registration);

  if (!useBilling) {
    return {
      company: null,
      firstName: registration.registrantFirstName,
      lastName: registration.registrantLastName,
      street: registration.registrantStreet,
      zipCode: registration.registrantZipCode,
      city: registration.registrantCity,
      email: registration.registrantEmail,
    };
  }

  // Der Name gilt als Paar: Vorname der einen und Nachname der anderen Seite
  // ergäben eine Person, die es nicht gibt.
  const hasBillingName =
    isFilled(registration.billingFirstName) ||
    isFilled(registration.billingLastName);

  return {
    company: registration.billingCompany,
    // Ohne Ansprechperson steht der Anmelder unter der Firma — sonst bliebe die
    // Rechnung namenlos.
    firstName: hasBillingName
      ? registration.billingFirstName
      : registration.registrantFirstName,
    lastName: hasBillingName
      ? registration.billingLastName
      : registration.registrantLastName,
    street: registration.billingStreet,
    zipCode: registration.billingZipCode,
    city: registration.billingCity,
    email: isFilled(registration.billingEmail)
      ? registration.billingEmail
      : registration.registrantEmail,
  };
}

/** Label for participants whose price category no longer exists on the course. */
const UNCATEGORIZED_LABEL = "Teilnahme";

const participantName = (participant: {
  firstName: string;
  lastName: string;
}) => `${participant.firstName} ${participant.lastName}`.trim();

/**
 * One line per price category plus negative lines for sibling discounts and a received down
 * payment; shares the discount computation with registration create/update.
 */
export function lineItemsFromRegistration(
  registration: RegistrationForDraft,
  course: CourseForDraft,
): InvoiceLineItem[] {
  const priceFor = (participant: {
    priceOptionId: string | null;
    priceOption: string | null;
  }) =>
    resolveParticipantPriceOption(participant, course.priceOptions)?.price ?? 0;

  // Keyed by priceOptionId (label only as fallback): two categories can share a name.
  const byCategory = new Map<
    string,
    { label: string; unitPrice: number; names: string[] }
  >();
  for (const participant of registration.participants) {
    const option = resolveParticipantPriceOption(
      participant,
      course.priceOptions,
    );
    const key = option
      ? `id:${option.id}`
      : `label:${participant.priceOption?.trim() || UNCATEGORIZED_LABEL}`;
    const group = byCategory.get(key) ?? {
      label:
        participantPriceOptionLabel(participant, course.priceOptions) ||
        UNCATEGORIZED_LABEL,
      unitPrice: option?.price ?? 0,
      names: [],
    };
    group.names.push(participantName(participant));
    byCategory.set(key, group);
  }

  const items: InvoiceLineItem[] = [...byCategory.values()].map(
    ({ label, unitPrice, names }) => ({
      description: label,
      detail: names.join(", "),
      quantity: names.length,
      unitPrice,
    }),
  );

  const discountApplies =
    registration.siblingDiscountApplied &&
    registration.siblingDiscountStatus !== SiblingDiscountStatus.REJECTED &&
    registration.participants.some((participant) => participant.siblingGroupId);

  if (discountApplies) {
    const { discountPerParticipant } = computeSiblingDiscounts(
      registration.participants.map((participant) => ({
        birthDate: participant.birthDate,
        siblingGroupId: participant.siblingGroupId,
        price: priceFor(participant),
      })),
    );

    const groupNames = new Map<string, string[]>();
    for (const participant of registration.participants) {
      if (!participant.siblingGroupId) continue;
      const names = groupNames.get(participant.siblingGroupId) ?? [];
      names.push(participantName(participant));
      groupNames.set(participant.siblingGroupId, names);
    }

    // Keyed by sibling group *and* amount: same family and same reduction share one line.
    const discountLines = new Map<
      string,
      { discount: number; count: number; siblings: string[] }
    >();

    discountPerParticipant.forEach((discount, index) => {
      if (discount <= 0) return;
      const participant = registration.participants[index];
      if (!participant) return;

      const groupId = participant.siblingGroupId ?? `solo:${index}`;
      const key = `${groupId} ${discount}`;
      const line = discountLines.get(key) ?? {
        discount,
        count: 0,
        siblings: participant.siblingGroupId
          ? (groupNames.get(participant.siblingGroupId) ?? [])
          : [participantName(participant)],
      };
      line.count += 1;
      discountLines.set(key, line);
    });

    for (const line of discountLines.values()) {
      items.push({
        description: SIBLING_DISCOUNT_LINE_DESCRIPTION,
        detail: line.siblings.join(", "),
        quantity: line.count,
        unitPrice: -line.discount,
      });
    }
  }

  const alreadyPaid = downPaymentCredit({
    downPaymentAmount: registration.downPaymentAmount ?? null,
    downPaymentStatus: registration.downPaymentStatus ?? null,
    downPaymentPaidAmount: registration.downPaymentPaidAmount ?? null,
    registrationStatus: registration.registrationStatus ?? "CONFIRMED",
  });
  if (alreadyPaid > 0) {
    items.push({
      description: DOWN_PAYMENT_LINE_DESCRIPTION,
      detail: registration.downPaymentPaidAt
        ? `eingegangen am ${formatDate(registration.downPaymentPaidAt)}`
        : null,
      quantity: 1,
      unitPrice: -alreadyPaid,
    });
  }

  return items;
}

export interface InvoiceDraftSeed {
  recipient: InvoiceRecipient;
  lineItems: InvoiceLineItem[];
  totalAmount: number;
}

export function buildInvoiceDraft(
  registration: RegistrationForDraft,
  course: CourseForDraft,
): InvoiceDraftSeed {
  const lineItems = lineItemsFromRegistration(registration, course);
  return {
    recipient: recipientFromRegistration(registration),
    lineItems,
    totalAmount: invoiceTotal(lineItems),
  };
}
