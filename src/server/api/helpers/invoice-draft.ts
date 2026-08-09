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

/** Label for participants whose price category no longer exists on the course. */
const UNCATEGORIZED_LABEL = "Teilnahme";

const participantName = (participant: { firstName: string; lastName: string }) =>
  `${participant.firstName} ${participant.lastName}`.trim();

/**
 * One line per price category — the category is the position, the participants
 * booked into it are the sub-line — plus one negative line per distinct sibling
 * discount.
 *
 * Grouping this way is how an invoice normally reads ("2 × Vollzahler"), and it
 * keeps a course with a dozen participants down to a handful of lines. Uses the
 * same shared discount computation as registration create/update — with age
 * evaluated at course start — so the prefilled total matches the total the
 * registrant was quoted.
 */
export function lineItemsFromRegistration(
  registration: RegistrationForDraft,
  course: CourseForDraft,
): InvoiceLineItem[] {
  const priceFor = (label: string | null) =>
    course.priceOptions.find((option) => option.label === label)?.price ?? 0;

  // Insertion-ordered, so the categories appear in the order they were booked
  // rather than in some hash order.
  const byCategory = new Map<string, { unitPrice: number; names: string[] }>();
  for (const participant of registration.participants) {
    const label = participant.priceOption?.trim() ?? "";
    const key = label || UNCATEGORIZED_LABEL;
    const group = byCategory.get(key) ?? {
      unitPrice: priceFor(participant.priceOption),
      names: [],
    };
    group.names.push(participantName(participant));
    byCategory.set(key, group);
  }

  const items: InvoiceLineItem[] = [...byCategory].map(
    ([label, { unitPrice, names }]) => ({
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
        price: priceFor(participant.priceOption),
      })),
      course.startDate,
    );

    // One line per discounted child, never collapsed: the discount is granted
    // per child, and the sub-line names the siblings it was granted for, so
    // each line explains itself on the printed invoice.
    const groupNames = new Map<string, string[]>();
    for (const participant of registration.participants) {
      if (!participant.siblingGroupId) continue;
      const names = groupNames.get(participant.siblingGroupId) ?? [];
      names.push(participantName(participant));
      groupNames.set(participant.siblingGroupId, names);
    }

    discountPerParticipant.forEach((discount, index) => {
      if (discount <= 0) return;
      const participant = registration.participants[index];
      if (!participant) return;
      const siblings = participant.siblingGroupId
        ? (groupNames.get(participant.siblingGroupId) ?? [])
        : [];
      items.push({
        description: "Geschwisterkindrabatt (20 %)",
        detail: siblings.join(", ") || participantName(participant),
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
