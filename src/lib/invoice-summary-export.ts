import type { XlsxColumn, XlsxRow } from "@/server/utils/xlsx";
import {
  DOWN_PAYMENT_LINE_DESCRIPTION,
  lineItemTotal,
  SIBLING_DISCOUNT_LINE_DESCRIPTION,
  type InvoiceLineItem,
} from "@/lib/invoice-document";
import {
  DOWN_PAYMENT_STATE_LABELS,
  downPaymentState,
  type DownPaymentStatusValue,
} from "@/lib/course-down-payment";

/** Summe der (negativen) Zeilen mit dieser Bezeichnung, als positiver Betrag. */
function creditLinesAmount(lineItems: unknown, description: string): number {
  const items = Array.isArray(lineItems) ? lineItems : [];
  const creditTotal = items
    .filter(
      (raw) => (raw as Partial<InvoiceLineItem>).description === description,
    )
    .reduce((sum, raw) => sum + lineItemTotal(raw as InvoiceLineItem), 0);
  return -creditTotal;
}

/** Summe der Geschwisterkindrabatt-Zeilen einer Rechnung, als positiver Betrag. */
export function siblingDiscountAmount(lineItems: unknown): number {
  return creditLinesAmount(lineItems, SIBLING_DISCOUNT_LINE_DESCRIPTION);
}

/** Auf der Rechnung abgezogene Anzahlung, als positiver Betrag. */
export function downPaymentCreditAmount(lineItems: unknown): number {
  return creditLinesAmount(lineItems, DOWN_PAYMENT_LINE_DESCRIPTION);
}

export const invoiceSummaryColumns: XlsxColumn[] = [
  { header: "Anmelder:in", key: "registrant" },
  { header: "E-Mail", key: "registrantEmail" },
  { header: "Teilnehmer:innen", key: "participants", wrap: true },
  { header: "Interne Kursnummer", key: "courseNumber" },
  { header: "Rechnungsnummer", key: "invoiceNumber" },
  {
    header: "Zu überweisender Betrag",
    key: "totalAmount",
    format: "currency",
    total: true,
  },
  {
    header: "Förderverein Zuschuss",
    key: "siblingDiscountAmount",
    format: "currency",
    total: true,
  },
];

/**
 * Nur bei Kursen mit Anzahlung: was die Rechnung schon abzieht, und wo die
 * Anzahlung der Anmeldung gerade steht. Stehen dort "Bezahlt" und ein leerer
 * Abzug nebeneinander, wurde die Rechnung vor dem Zahlungseingang erstellt.
 */
export const invoiceSummaryDownPaymentColumns: XlsxColumn[] = [
  {
    header: "Anzahlung (abgezogen)",
    key: "downPaymentCredit",
    format: "currency",
    total: true,
  },
  { header: "Anzahlung Status", key: "downPaymentStatus" },
];

type SummaryInvoice = {
  invoiceNumber: string | null;
  totalAmount: number;
  lineItems: unknown;
  recipientFirstName: string | null;
  recipientLastName: string | null;
  recipientEmail: string | null;
  registration: {
    registrantFirstName: string;
    registrantLastName: string;
    registrantEmail: string;
    participants: Array<{ firstName: string; lastName: string }>;
    registrationStatus?: "CONFIRMED" | "WAITLIST" | "CANCELLED";
    downPaymentAmount?: number | null;
    downPaymentStatus?: DownPaymentStatusValue | null;
    downPaymentPaidAmount?: number | null;
  } | null;
};

/**
 * Eine Zeile je ausgestellter Rechnung.
 *
 * Fällt die Anmeldung weg (gelöscht — die Rechnung bleibt aufbewahrungs-
 * pflichtig bestehen), tragen die Empfängerfelder der Rechnung die Zeile.
 */
export function buildInvoiceSummaryRows(
  invoices: SummaryInvoice[],
  course: { courseNumber: string | null },
): XlsxRow[] {
  return invoices.map((invoice) => {
    const registration = invoice.registration;
    const registrantName = registration
      ? `${registration.registrantFirstName} ${registration.registrantLastName}`.trim()
      : `${invoice.recipientFirstName ?? ""} ${invoice.recipientLastName ?? ""}`.trim();

    return {
      registrant: registrantName,
      registrantEmail:
        registration?.registrantEmail ?? invoice.recipientEmail ?? "",
      participants: (registration?.participants ?? [])
        .map((p) => `${p.firstName} ${p.lastName}`.trim())
        .join(", "),
      courseNumber: course.courseNumber ?? "",
      invoiceNumber: invoice.invoiceNumber ?? "",
      totalAmount: invoice.totalAmount,
      siblingDiscountAmount: siblingDiscountAmount(invoice.lineItems),
      downPaymentCredit: downPaymentCreditAmount(invoice.lineItems),
      downPaymentStatus: registration?.downPaymentAmount
        ? DOWN_PAYMENT_STATE_LABELS[
            downPaymentState({
              downPaymentAmount: registration.downPaymentAmount,
              downPaymentStatus: registration.downPaymentStatus ?? null,
              downPaymentPaidAmount: registration.downPaymentPaidAmount ?? null,
              registrationStatus:
                registration.registrationStatus ?? "CONFIRMED",
            })
          ]
        : "",
    };
  });
}
