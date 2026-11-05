/**
 * PDF der Versicherungsbeitragsrechnung: eine Zeile je Wertklasse mit Anzahl,
 * Bruttoprämie und Betrag. Rahmen und Zahlungsblock kommen aus
 * office-invoice-render.ts.
 */
import { formatEuro } from "./invoice-document";
import {
  insuranceCategoryLabel,
  insuranceInvoiceTotal,
  type InsuranceInvoiceLine,
} from "./insurance-billing";
import {
  renderOfficeInvoicePdf,
  type RenderOfficeInvoiceOptions,
} from "./office-invoice-render";

export interface InsuranceInvoiceDocument {
  year: number;
  invoiceDate: Date | string;
  dueDate: Date | string;
  choirNumber: string;
  choirName: string | null;
  recipient: {
    name1: string | null;
    name2: string | null;
    street: string | null;
    city: string | null;
  };
  lines: InsuranceInvoiceLine[];
  paymentReference: string;
  /** Platzhalter bereits ersetzt. */
  introText: string;
  closingText: string;
  signatureName: string;
  draft?: boolean;
}

export type RenderInsuranceInvoiceOptions = RenderOfficeInvoiceOptions;

export function renderInsuranceInvoicePdf(
  invoice: InsuranceInvoiceDocument,
  options: RenderInsuranceInvoiceOptions = {},
): Promise<Uint8Array> {
  return renderOfficeInvoicePdf(
    {
      title: `Versicherungsbeitrag für das Jahr ${invoice.year}`,
      subtitle: invoice.choirName,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      infoRows: [
        ["Chor-Nr.", invoice.choirNumber],
        ["Beitragsjahr", String(invoice.year)],
      ],
      recipient: invoice.recipient,
      table: {
        // Rechtsbündig, damit die Dezimalstellen untereinander stehen.
        columns: [
          { label: "Versicherte Instrumente" },
          { label: "Anzahl", rightOffset: 68 },
          { label: "Prämie pro Stück", rightOffset: 32 },
          { label: "Betrag", rightOffset: 0 },
        ],
        rows: invoice.lines.map((line) => ({
          cells: [
            insuranceCategoryLabel(line.maxValue),
            line.quantity === 0 ? "–" : String(line.quantity),
            formatEuro(line.unitPrice),
            formatEuro(line.amount),
          ],
          muted: line.quantity === 0,
        })),
      },
      total: insuranceInvoiceTotal(invoice.lines),
      paymentReference: invoice.paymentReference,
      introText: invoice.introText,
      closingText: invoice.closingText,
      signatureName: invoice.signatureName,
      draft: invoice.draft,
    },
    options,
  );
}
