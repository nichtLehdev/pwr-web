/**
 * Prefilling a new invoice draft from a course registration.
 *
 * The draft is only a starting point: once created, the invoice owns its own
 * copy of recipient and positions, so an organizer can correct an address or
 * add a line without rewriting the registration behind a participant's back.
 */
import {
  invoiceTotal,
  SIBLING_DISCOUNT_LINE_DESCRIPTION,
  type InvoiceLineItem,
  type InvoiceRecipient,
} from "@/lib/invoice-document";
import {
  participantPriceOptionLabel,
  resolveParticipantPriceOption,
} from "@/lib/course-price-options";
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

const participantName = (participant: {
  firstName: string;
  lastName: string;
}) => `${participant.firstName} ${participant.lastName}`.trim();

/**
 * One line per price category — the category is the position, the participants
 * booked into it are the sub-line — plus one negative line per distinct sibling
 * discount.
 *
 * Grouping this way is how an invoice normally reads ("2 × Vollzahler"), and it
 * keeps a course with a dozen participants down to a handful of lines. Uses the
 * same shared discount computation as registration create/update, so the
 * prefilled total matches the total the registrant was quoted.
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

  // Insertion-ordered, so the categories appear in the order they were booked
  // rather than in some hash order. Keyed by priceOptionId (falling back to
  // the raw label for pre-id registrations) rather than by label text alone —
  // two categories can share a name, and grouping by name would silently
  // merge them onto one line at whichever price was found first.
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

    // Keyed by sibling group *and* amount. Two children of the same family on
    // the same ticket earn the identical reduction and belong on one line;
    // a third on a cheaper ticket, or another family entirely, does not.
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
