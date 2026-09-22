import type { RegistrationData, CourseWithRelations } from "./types";
import { isPlausibleEmail } from "@/lib/email-address";
import { isFilled } from "@/lib/billing-address";
import { computeSiblingDiscounts, roundMoney } from "@/lib/sibling-discount";
import { isRequiredCustomFieldEmpty } from "@/lib/course-custom-fields";
import {
  ageOnDate,
  isAgeWithinPriceOption,
  priceOptionAgeReferenceDate,
} from "@/lib/course-price-option-age";
import {
  registrationNeedsPaymentMethod,
  courseRequiresPaymentMethodChoice,
} from "@/lib/course-payment-methods";
import type { CoursePaymentMethod } from "~/generated/prisma/client";
import { registrationDownPayment } from "@/lib/course-down-payment";
import { berlinParts } from "@/lib/berlin-time";

/** Shared discount rule, same as the server's, so the summary can't quote a total the server won't honour. */
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

/** Anzahlung wie auf dem Server berechnet — `null`, wenn keine fällig ist. */
export function calculateDownPayment(
  registrationData: RegistrationData,
  course: CourseWithRelations,
): number | null {
  return registrationDownPayment(course, registrationData.participants);
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

/** Etwas, das einem Schritt noch fehlt. */
export interface FormProblem {
  /** Schlüssel des Feldes (`data-focus-key`), in das der Fokus springt. */
  field: string;
  /** Kurzform für die Sammelmeldung am Weiter-Knopf („Noch offen: …“). */
  label: string;
  message: string;
}

export const EMAIL_HINT =
  "Bitte eine gültige E-Mail-Adresse eingeben, z. B. max@example.com";

/** Sammelmeldung am Weiter-Knopf aus den Kurzformen, in Feldreihenfolge. */
export function problemSummary(problems: readonly FormProblem[]): string {
  return `Noch offen: ${problems.map((p) => p.label).join(", ")}.`;
}

/** Was in Schritt 1 fehlt, in Feldreihenfolge; dieselben Regeln wie `validateStep`. */
export function registrantProblems(
  registrationData: RegistrationData,
  /** Siehe {@link validateStep}: Telefon und Adresse sind hier optional. */
  staffMode = false,
): FormProblem[] {
  const problems: FormProblem[] = [];
  const missing = (field: string, label: string, message: string) =>
    problems.push({ field, label, message });
  const d = registrationData;

  if (!d.registrantFirstName)
    missing("registrantFirstName", "Vorname", "Bitte Vornamen angeben.");
  if (!d.registrantLastName)
    missing("registrantLastName", "Nachname", "Bitte Nachnamen angeben.");
  // Format schon hier prüfen, sonst scheitert ein Tippfehler erst am Server, drei Schritte weiter.
  if (!d.registrantEmail)
    missing("registrantEmail", "E-Mail", "Bitte E-Mail-Adresse angeben.");
  else if (!isPlausibleEmail(d.registrantEmail))
    missing("registrantEmail", "gültige E-Mail-Adresse", EMAIL_HINT);
  if (!staffMode && !d.registrantPhone)
    missing("registrantPhone", "Telefon", "Bitte Telefonnummer angeben.");

  // Mit abweichender Rechnungsadresse zählt deren Anschrift, sonst die
  // eigene — für das Kursteam ist die eigene optional.
  if (d.useSeparateBilling) {
    // Name und Firma bleiben freiwillig: ohne Ansprechperson steht später der
    // Anmelder auf der Rechnung, die Anschrift trägt sie.
    if (!isFilled(d.billingStreet))
      missing(
        "billingStreet",
        "Straße und Hausnummer der Rechnungsadresse",
        "Bitte Straße und Hausnummer angeben.",
      );
    if (!isFilled(d.billingZipCode))
      missing(
        "billingZipCode",
        "PLZ der Rechnungsadresse",
        "Bitte Postleitzahl angeben.",
      );
    if (!isFilled(d.billingCity))
      missing(
        "billingCity",
        "Stadt der Rechnungsadresse",
        "Bitte Stadt angeben.",
      );
    // Optional — wenn aber ausgefüllt, prüft der Server sie genauso.
    if (d.billingEmail && !isPlausibleEmail(d.billingEmail))
      missing("billingEmail", "gültige E-Mail für die Rechnung", EMAIL_HINT);
  } else if (!staffMode) {
    if (!d.registrantStreet)
      missing(
        "registrantStreet",
        "Straße und Hausnummer",
        "Bitte Straße und Hausnummer angeben.",
      );
    if (!d.registrantZipCode)
      missing("registrantZipCode", "PLZ", "Bitte Postleitzahl angeben.");
    if (!d.registrantCity)
      missing("registrantCity", "Ort", "Bitte Ort angeben.");
  }
  return problems;
}

/** Was vor dem Absenden fehlt: Zahlungsweise, Anzahlungs-Bestätigung, Zustimmung (Seitenreihenfolge). */
export function summaryProblems(
  registrationData: RegistrationData,
  course: CourseWithRelations,
  {
    termsAccepted = false,
    staffMode = false,
    downPaymentAcknowledged = false,
  }: {
    termsAccepted?: boolean;
    staffMode?: boolean;
    downPaymentAcknowledged?: boolean;
  },
): FormProblem[] {
  const problems: FormProblem[] = [];
  if (
    registrationNeedsPaymentMethod(course) &&
    courseRequiresPaymentMethodChoice(course)
  ) {
    const pm = registrationData.paymentMethod as
      CoursePaymentMethod | undefined;
    if (pm !== "CASH" && pm !== "INVOICE") {
      problems.push({
        field: "paymentMethod",
        label: "Zahlungsweise",
        message: "Bitte wählen Sie eine Zahlungsweise.",
      });
    }
  }
  // Nur bei der öffentlichen Anmeldung und nur, wenn überhaupt eine
  // Anzahlung fällig wird.
  if (
    !staffMode &&
    !downPaymentAcknowledged &&
    calculateDownPayment(registrationData, course) !== null
  ) {
    problems.push({
      field: "downPaymentAcknowledged",
      label: "Bestätigung zur Anzahlung",
      message: "Bitte bestätigen Sie die Angaben zur Anzahlung.",
    });
  }
  if (!termsAccepted) {
    problems.push(
      staffMode
        ? {
            field: "termsAccepted",
            label: "Zustimmung des Anmelders",
            message: "Bitte bestätigen Sie, dass der Anmelder zugestimmt hat.",
          }
        : {
            field: "termsAccepted",
            label: "Zustimmung zu AGB und Datenschutzerklärung",
            message:
              "Bitte stimmen Sie den Allgemeinen Geschäftsbedingungen und der Datenschutzerklärung zu.",
          },
    );
  }
  return problems;
}

export function validateStep(
  step: 1 | 2 | 3,
  registrationData: RegistrationData,
  course: CourseWithRelations,
  validationErrors: Record<number, string>,
  termsAccepted?: boolean,
  /** Staff often records phone/paper registrations with only name and e-mail, so phone and address are optional. */
  staffMode = false,
  /** Nur bei der öffentlichen Anmeldung und nur, wenn eine Anzahlung fällig wird. */
  downPaymentAcknowledged = false,
): boolean {
  switch (step) {
    case 1:
      return registrantProblems(registrationData, staffMode).length === 0;
    case 2:
      if (registrationData.participants.length === 0) {
        return false;
      }
      return registrationData.participants.every((p) => {
        if (
          !p.firstName?.trim() ||
          !p.lastName?.trim() ||
          !p.birthDate ||
          !p.city?.trim() ||
          !p.priceOptionId
        ) {
          return false;
        }
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
        // Die Altersgrenze der gewählten Kategorie. Das Kursteam darf sie
        // übergehen, Anmeldende nicht — wie auf dem Server.
        if (!staffMode) {
          const priceOption = course.priceOptions.find(
            (po) => po.id === p.priceOptionId,
          );
          if (
            priceOption &&
            !isAgeWithinPriceOption(
              priceOption,
              ageOnDate(birthDate, priceOptionAgeReferenceDate(course)),
            )
          ) {
            return false;
          }
        }
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
    case 3:
      return (
        summaryProblems(registrationData, course, {
          termsAccepted,
          staffMode,
          downPaymentAcknowledged,
        }).length === 0
      );
    default:
      return false;
  }
}

/** Age in completed years; null while the birthdate is empty or not yet a usable date. */
export function participantAge(
  birthDate: Date | string | null | undefined,
): number | null {
  if (!birthDate) return null;
  const born = new Date(birthDate);
  if (Number.isNaN(born.getTime())) return null;

  // Deutscher Kalendertag wie bei `ageOnDate` — auch beim ersten Rendern auf
  // dem Server (UTC) soll dasselbe Alter dastehen wie danach im Browser.
  const b = berlinParts(born);
  const today = berlinParts(new Date());
  let age = today.year - b.year;
  if (today.month < b.month || (today.month === b.month && today.day < b.day)) {
    age--;
  }
  return age >= 0 && age < 150 ? age : null;
}
