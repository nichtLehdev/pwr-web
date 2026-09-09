import type { RegistrationData, CourseWithRelations } from "./types";
import { isPlausibleEmail } from "@/lib/email-address";
import { computeSiblingDiscounts, roundMoney } from "@/lib/sibling-discount";
import { isRequiredCustomFieldEmpty } from "@/lib/course-custom-fields";
import {
  registrationNeedsPaymentMethod,
  courseRequiresPaymentMethodChoice,
} from "@/lib/course-payment-methods";
import type { CoursePaymentMethod } from "~/generated/prisma/client";

/**
 * Maps the form's participants onto the shared discount rule. The preview the
 * registrant sees and the price the server persists come from the same
 * function, so the summary step can't quote a total the server won't honour.
 */
function siblingDiscountInput(
  registrationData: RegistrationData,
  course: CourseWithRelations,
) {
  return registrationData.participants.map((participant) => ({
    birthDate: participant.birthDate,
    siblingGroupId: participant.siblingGroupId,
    price:
      course.priceOptions.find((p) => p.id === participant.priceOptionId)
        ?.price ?? 0,
  }));
}

export function calculateOriginalPrice(
  registrationData: RegistrationData,
  course: CourseWithRelations,
): number {
  return roundMoney(
    registrationData.participants.reduce((sum, participant) => {
      const priceOption = course.priceOptions.find(
        (p) => p.id === participant.priceOptionId,
      );
      return sum + (priceOption?.price ?? 0);
    }, 0),
  );
}

export function calculateDiscountAmount(
  registrationData: RegistrationData,
  course: CourseWithRelations,
): number {
  if (
    !registrationData.siblingDiscountApplied ||
    !course.allowSiblingDiscount
  ) {
    return 0;
  }
  return computeSiblingDiscounts(siblingDiscountInput(registrationData, course))
    .totalDiscount;
}

export function calculateTotalPrice(
  registrationData: RegistrationData,
  course: CourseWithRelations,
): number {
  return roundMoney(
    calculateOriginalPrice(registrationData, course) -
      calculateDiscountAmount(registrationData, course),
  );
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
  /**
   * The course team often only has a name and an e-mail when it records a
   * registration from a phone call or a paper form, so phone and address stay
   * optional there instead of forcing invented values.
   */
  staffMode = false,
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

      // Das Format gehört hierher, nicht erst zum Absenden: eine Adresse mit
      // Tippfehler kam sonst durch Schritt 1 und 2 und scheiterte erst am
      // Server — drei Schritte entfernt von dem Feld, um das es geht.
      const basicValid = !!(
        registrantFirstName &&
        registrantLastName &&
        isPlausibleEmail(registrantEmail) &&
        (staffMode || registrantPhone)
      );

      if (registrationData.useSeparateBilling) {
        const { billingStreet, billingZipCode, billingCity, billingEmail } =
          registrationData;
        // Die Rechnungsadresse ist optional — wenn sie aber ausgefüllt ist,
        // prüft der Server sie genauso.
        if (billingEmail && !isPlausibleEmail(billingEmail)) return false;
        return basicValid && !!(billingStreet && billingZipCode && billingCity);
      }

      if (staffMode) {
        return basicValid;
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
                Record<string, unknown> | undefined;
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
          CoursePaymentMethod | undefined;
        if (pm !== "CASH" && pm !== "INVOICE") return false;
      }
      return termsAccepted === true;
    }
    default:
      return false;
  }
}

/**
 * Age in completed years, for the one-line summary on a participant card.
 * Returns null while the birthdate is empty or not yet a usable date, so the
 * card can simply leave the age out instead of printing "NaN Jahre".
 */
export function participantAge(
  birthDate: Date | string | null | undefined,
): number | null {
  if (!birthDate) return null;
  const born = new Date(birthDate);
  if (Number.isNaN(born.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - born.getFullYear();
  const monthsApart = today.getMonth() - born.getMonth();
  if (
    monthsApart < 0 ||
    (monthsApart === 0 && today.getDate() < born.getDate())
  ) {
    age--;
  }
  return age >= 0 && age < 150 ? age : null;
}
