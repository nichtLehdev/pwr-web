import type { XlsxColumn, XlsxRow } from "@/server/utils/xlsx";
import {
  lineItemTotal,
  SIBLING_DISCOUNT_LINE_DESCRIPTION,
  type InvoiceLineItem,
} from "@/lib/invoice-document";

/** Summe der Geschwisterkindrabatt-Zeilen einer Rechnung, als positiver Betrag. */
export function siblingDiscountAmount(lineItems: unknown): number {
  const items = Array.isArray(lineItems) ? lineItems : [];
  const discountTotal = items
    .filter(
      (raw) =>
        (raw as Partial<InvoiceLineItem>).description ===
        SIBLING_DISCOUNT_LINE_DESCRIPTION,
    )
    .reduce((sum, raw) => sum + lineItemTotal(raw as InvoiceLineItem), 0);
  return -discountTotal;
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
    };
  });
}
