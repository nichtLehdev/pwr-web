import type { RegistrationData, CourseWithRelations } from "./types";
import { isParticipantUnder18 } from "@/lib/participant-utils";
import { isRequiredCustomFieldEmpty } from "@/lib/course-custom-fields";
import {
  registrationNeedsPaymentMethod,
  courseRequiresPaymentMethodChoice,
} from "@/lib/course-payment-methods";
import type { CoursePaymentMethod } from "~/generated/prisma/client";

export function calculateTotalPrice(
  registrationData: RegistrationData,
  course: CourseWithRelations,
): number {
  const basePrice = registrationData.participants.reduce((sum, participant) => {
    const priceOption = course.priceOptions.find(
      (p) => p.id === participant.priceOptionId,
    );
    return sum + (priceOption?.price || 0);
  }, 0);

  if (registrationData.siblingDiscountApplied && course.allowSiblingDiscount) {
    const siblingGroups = new Map<
      string,
      typeof registrationData.participants
    >();
    for (const participant of registrationData.participants) {
      if (participant.siblingGroupId) {
        if (!siblingGroups.has(participant.siblingGroupId)) {
          siblingGroups.set(participant.siblingGroupId, []);
        }
        siblingGroups.get(participant.siblingGroupId)?.push(participant);
      }
    }

    let discount = 0;
    for (const [, groupParticipants] of siblingGroups) {
      if (groupParticipants.length > 1) {
        // Only apply discount to participants under 18
        const eligibleParticipants = groupParticipants.filter(
          (p) => p.birthDate && isParticipantUnder18(p.birthDate),
        );
        if (eligibleParticipants.length > 1) {
          // Apply discount to all eligible participants except the first one
          for (let i = 1; i < eligibleParticipants.length; i++) {
            const participant = eligibleParticipants[i];
            if (participant) {
              const priceOption = course.priceOptions.find(
                (p) => p.id === participant.priceOptionId,
              );
              if (priceOption) {
                discount += priceOption.price * 0.2;
              }
            }
          }
        }
      }
    }

    return basePrice - discount;
  }

  return basePrice;
}

export function calculateOriginalPrice(
  registrationData: RegistrationData,
  course: CourseWithRelations,
): number {
  return registrationData.participants.reduce((sum, participant) => {
    const priceOption = course.priceOptions.find(
      (p) => p.id === participant.priceOptionId,
    );
    return sum + (priceOption?.price || 0);
  }, 0);
}

export function calculateDiscountAmount(
  registrationData: RegistrationData,
  course: CourseWithRelations,
): number {
  if (registrationData.siblingDiscountApplied && course.allowSiblingDiscount) {
    const siblingGroups = new Map<
      string,
      typeof registrationData.participants
    >();
    for (const participant of registrationData.participants) {
      if (participant.siblingGroupId) {
        if (!siblingGroups.has(participant.siblingGroupId)) {
          siblingGroups.set(participant.siblingGroupId, []);
        }
        siblingGroups.get(participant.siblingGroupId)?.push(participant);
      }
    }

    let discount = 0;
    for (const [, groupParticipants] of siblingGroups) {
      if (groupParticipants.length > 1) {
        // Only apply discount to participants under 18
        const eligibleParticipants = groupParticipants.filter(
          (p) => p.birthDate && isParticipantUnder18(p.birthDate),
        );
        if (eligibleParticipants.length > 1) {
          // Apply discount to all eligible participants except the first one
          for (let i = 1; i < eligibleParticipants.length; i++) {
            const participant = eligibleParticipants[i];
            if (participant) {
              const priceOption = course.priceOptions.find(
                (p) => p.id === participant.priceOptionId,
              );
              if (priceOption) {
                discount += priceOption.price * 0.2;
              }
            }
          }
        }
      }
    }
    return discount;
  }
  return 0;
}

export function getParticipantDisplayName(
  firstName: string,
  lastName: string,
  participants: RegistrationData["participants"],
  participantIndex?: number,
): string {
  const firstLetter = lastName.charAt(0).toUpperCase();
  const hasDuplicate = participants.some(
    (p, idx) =>
      idx !== participantIndex &&
      p.firstName === firstName &&
      p.lastName.charAt(0).toUpperCase() === firstLetter,
  );

  if (hasDuplicate) {
    return `${firstName} ${lastName}`;
  }
  return `${firstName} ${firstLetter}.`;
}

export function validateStep(
  step: 1 | 2 | 3,
  registrationData: RegistrationData,
  course: CourseWithRelations,
  validationErrors: Record<number, string>,
  termsAccepted?: boolean,
): boolean {
  switch (step) {
    case 1:
      const {
        registrantFirstName,
        registrantLastName,
        registrantEmail,
        registrantPhone,
        registrantStreet,
        registrantZipCode,
        registrantCity,
      } = registrationData;

      const basicValid = !!(
        registrantFirstName &&
        registrantLastName &&
        registrantEmail &&
        registrantPhone
      );

      if (registrationData.useSeparateBilling) {
        const { billingStreet, billingZipCode, billingCity } = registrationData;
        return basicValid && !!(billingStreet && billingZipCode && billingCity);
      }

      return (
        basicValid &&
        !!(registrantStreet && registrantZipCode && registrantCity)
      );
    case 2:
      // Must have at least one participant
      if (registrationData.participants.length === 0) {
        return false;
      }
      // All participants must have required fields filled
      return registrationData.participants.every((p) => {
        // Check basic required fields
        if (
          !p.firstName?.trim() ||
          !p.lastName?.trim() ||
          !p.birthDate ||
          !p.city?.trim() ||
          !p.priceOptionId
        ) {
          return false;
        }
        // Check birthDate is valid
        const birthDate = new Date(p.birthDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const oneYearAgo = new Date(today);
        oneYearAgo.setFullYear(today.getFullYear() - 1);
        const maxAge = new Date(today);
        maxAge.setFullYear(today.getFullYear() - 120);

        if (
          birthDate >= today ||
          birthDate > oneYearAgo ||
          birthDate < maxAge
        ) {
          return false;
        }
        // Check required custom fields
        if (course.customFields) {
          for (const field of course.customFields) {
            if (field.isRequired) {
              const customFields = p.customFields as
                | Record<string, unknown>
                | undefined;
              const fieldValue = customFields?.[field.fieldName];
              if (isRequiredCustomFieldEmpty(field.fieldType, fieldValue)) {
                return false;
              }
            }
          }
        }
        return true;
      });
    case 3: {
      if (
        registrationNeedsPaymentMethod(course) &&
        courseRequiresPaymentMethodChoice(course)
      ) {
        const pm = registrationData.paymentMethod as
          | CoursePaymentMethod
          | undefined;
        if (pm !== "CASH" && pm !== "INVOICE") return false;
      }
      return termsAccepted === true;
    }
    default:
      return false;
  }
}
