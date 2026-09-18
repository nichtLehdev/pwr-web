import { TRPCError } from "@trpc/server";
import { CoursePaymentMethod } from "~/generated/prisma/client";
import {
  resolveParticipantCustomFieldsForPersist,
  type CourseCustomFieldRule,
} from "@/lib/course-custom-fields";
import {
  courseAcceptsCash,
  courseAcceptsInvoice,
  registrationNeedsPaymentMethod,
  type CoursePaymentFlags,
} from "@/lib/course-payment-methods";
import { roundMoney } from "@/lib/sibling-discount";
import {
  ageOnDate,
  priceOptionAgeMismatchMessage,
  priceOptionAgeReferenceDate,
} from "@/lib/course-price-option-age";

type PriceOption = {
  id: string;
  label: string;
  price: number;
  minAge?: number | null;
  maxAge?: number | null;
};

/**
 * Validates participants against the course and sums the undiscounted total; shared by public,
 * staff and edit paths. `allowAgeMismatch` is for the course team only; the edit path passes a
 * predicate to leave already-booked participants alone who no longer fit their category.
 */
export function prepareParticipantsForCourse<
  T extends {
    firstName: string;
    lastName: string;
    birthDate: Date;
    priceOptionId: string;
    customFields?: Record<string, unknown> | undefined;
  },
>(
  participantsInput: readonly T[],
  course: {
    startDate: Date | string;
    customFields?: readonly CourseCustomFieldRule[] | null;
    priceOptions: readonly PriceOption[];
  },
  {
    allowAgeMismatch = false,
  }: { allowAgeMismatch?: boolean | ((participant: T) => boolean) } = {},
): {
  participants: Array<
    T & { customFields: Record<string, unknown>; priceOption: string }
  >;
  originalTotalPrice: number;
} {
  const participants: Array<
    T & { customFields: Record<string, unknown>; priceOption: string }
  > = [];
  let total = 0;
  const ageReferenceDate = priceOptionAgeReferenceDate(course);

  for (const participant of participantsInput) {
    const resolved = resolveParticipantCustomFieldsForPersist(
      participant.customFields,
      course.customFields ?? [],
    );
    if (!resolved.ok) {
      throw new TRPCError({ code: "BAD_REQUEST", message: resolved.message });
    }

    const priceOption = course.priceOptions.find(
      (p) => p.id === participant.priceOptionId,
    );
    if (!priceOption) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Invalid price option ID: ${participant.priceOptionId}`,
      });
    }

    const mayMismatch =
      typeof allowAgeMismatch === "function"
        ? allowAgeMismatch(participant)
        : allowAgeMismatch;

    if (!mayMismatch) {
      const mismatch = priceOptionAgeMismatchMessage(
        priceOption,
        ageOnDate(participant.birthDate, ageReferenceDate),
      );
      if (mismatch) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `${participant.firstName} ${participant.lastName}: ${mismatch}`,
        });
      }
    }

    total += priceOption.price;
    participants.push({
      ...participant,
      customFields: resolved.customFields,
      priceOption: priceOption.label,
    });
  }

  return { participants, originalTotalPrice: roundMoney(total) };
}

/** `null` for free courses, the only allowed method, or the submitted choice when both are offered. */
export function resolveCoursePaymentMethod(
  course: CoursePaymentFlags,
  submitted: CoursePaymentMethod | undefined,
): CoursePaymentMethod | null {
  if (!registrationNeedsPaymentMethod(course)) return null;

  const acceptsCash = courseAcceptsCash(course);
  const acceptsInvoice = courseAcceptsInvoice(course);

  if (!acceptsCash && !acceptsInvoice) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Dieser Kurs hat keine gültigen Zahlungsarten. Bitte den Veranstalter kontaktieren.",
    });
  }
  if (!acceptsCash) return CoursePaymentMethod.INVOICE;
  if (!acceptsInvoice) return CoursePaymentMethod.CASH;

  if (!submitted) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Bitte wählen Sie eine Zahlungsweise.",
    });
  }
  return submitted;
}
