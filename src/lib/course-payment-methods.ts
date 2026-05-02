import type { CoursePaymentMethod } from "~/generated/prisma/client";

export type CoursePaymentFlags = {
  isFree: boolean;
  paymentCashAllowed?: boolean | null;
  paymentInvoiceAllowed?: boolean | null;
};

/** DB default true — treat omitted/null as accepted. */
export function courseAcceptsCash(course: CoursePaymentFlags): boolean {
  return course.paymentCashAllowed !== false;
}

export function courseAcceptsInvoice(course: CoursePaymentFlags): boolean {
  return course.paymentInvoiceAllowed !== false;
}

/** Kostenpflichtiger Kurs, bei dem der Nutzer zwischen mehr als einer Option wählen muss. */
export function courseRequiresPaymentMethodChoice(
  course: CoursePaymentFlags,
): boolean {
  if (course.isFree) return false;
  return courseAcceptsCash(course) && courseAcceptsInvoice(course);
}

/** Anmeldung: Zahlungsart nur nötig wenn Gebühr anfällt. */
export function registrationNeedsPaymentMethod(
  course: CoursePaymentFlags,
): boolean {
  return !course.isFree;
}

export const COURSE_PAYMENT_METHOD_LABELS: Record<CoursePaymentMethod, string> =
  {
    CASH: "Barzahlung vor Ort",
    INVOICE: "Überweisung (Rechnung)",
  };

/** Kurztext für Kursinfos (welche Methoden angeboten werden). */
export function formatAcceptedCoursePaymentMethods(
  course: CoursePaymentFlags,
): string | null {
  if (course.isFree) return null;
  const parts: string[] = [];
  if (courseAcceptsCash(course)) {
    parts.push(COURSE_PAYMENT_METHOD_LABELS.CASH);
  }
  if (courseAcceptsInvoice(course)) {
    parts.push(COURSE_PAYMENT_METHOD_LABELS.INVOICE);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}
