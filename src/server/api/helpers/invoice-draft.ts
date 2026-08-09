/**
 * Prefilling a new invoice draft from a course registration.
 *
 * The draft is only a starting point: once created, the invoice owns its own
 * copy of recipient and positions, so an organizer can correct an address or
 * add a line without rewriting the registration behind a participant's back.
 */
import {
  DEFAULT_PAYMENT_DEADLINE_DAYS,
  invoiceTotal,
  type InvoiceLineItem,
  type InvoiceRecipient,
} from "@/lib/invoice-document";
import { computeSiblingDiscounts } from "@/lib/sibling-discount";
import { SiblingDiscountStatus } from "~/generated/prisma/enums";

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
  participants: {
    firstName: string;
    lastName: string;
    priceOption: string | null;
    siblingGroupId: string | null;
    birthDate: Date;
  }[];
}

export interface CourseForDraft {
  startDate: Date;
  priceOptions: { label: string; price: number }[];
}

/**
 * Who the invoice is addressed to: the separate billing address when the
 * registrant asked for one, otherwise the registrant themselves.
 */
export function recipientFromRegistration(
  registration: RegistrationForDraft,
): InvoiceRecipient {
  const useBilling =
    registration.useSeparateBilling &&
    Boolean(registration.billingFirstName ?? registration.billingLastName);

  if (useBilling) {
    return {
      company: registration.billingCompany,
      firstName: registration.billingFirstName,
      lastName: registration.billingLastName,
      street: registration.billingStreet,
      zipCode: registration.billingZipCode,
      city: registration.billingCity,
      email: registration.billingEmail ?? registration.registrantEmail,
    };
  }

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

/**
 * One line per participant, plus one negative line per granted sibling
 * discount. Uses the same shared discount computation as registration
 * create/update — with age evaluated at course start — so the prefilled total
 * matches the total the registrant was quoted.
 */
export function lineItemsFromRegistration(
  registration: RegistrationForDraft,
  course: CourseForDraft,
): InvoiceLineItem[] {
  const priceFor = (label: string | null) =>
    course.priceOptions.find((option) => option.label === label)?.price ?? 0;

  const items: InvoiceLineItem[] = registration.participants.map(
    (participant) => ({
      description: `${participant.firstName} ${participant.lastName}`.trim(),
      detail: participant.priceOption,
      quantity: 1,
      unitPrice: priceFor(participant.priceOption),
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
        price: priceFor(participant.priceOption),
      })),
      course.startDate,
    );

    discountPerParticipant.forEach((discount, index) => {
      if (discount <= 0) return;
      const participant = registration.participants[index];
      items.push({
        description: "Geschwisterkindrabatt (20 %)",
        detail: participant
          ? `${participant.firstName} ${participant.lastName}`.trim()
          : null,
        quantity: 1,
        unitPrice: -discount,
      });
    });
  }

  return items;
}

export function defaultDueDate(from: Date = new Date()): Date {
  const due = new Date(from);
  due.setDate(due.getDate() + DEFAULT_PAYMENT_DEADLINE_DAYS);
  return due;
}

export interface InvoiceDraftSeed {
  recipient: InvoiceRecipient;
  lineItems: InvoiceLineItem[];
  totalAmount: number;
  dueDate: Date;
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
    dueDate: defaultDueDate(),
  };
}
