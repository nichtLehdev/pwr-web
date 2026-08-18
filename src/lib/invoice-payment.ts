/**
 * Zahlungsstand einer Rechnung — abgeleitet, nicht gespeichert.
 *
 * Gespeichert sind nur `paidAt` und optional `paidAmount`. Alles, was die
 * Oberfläche anzeigt ("offen", "teilweise bezahlt", "bezahlt"), wird hier aus
 * diesen beiden Feldern plus dem Dokumentstatus berechnet, damit Dashboard,
 * tRPC-Router und Exporte nicht jeweils eigene Regeln erfinden.
 *
 * Dependency-frei, damit Client und Server dieselbe Funktion benutzen können.
 */

export type InvoicePaymentState =
  /** Entwurf oder Storno — an einem solchen Dokument gibt es nichts zu zahlen. */
  | "NOT_APPLICABLE"
  | "OPEN"
  | "PARTIAL"
  | "PAID";

export type InvoicePaymentInput = {
  status: "DRAFT" | "PUBLISHED" | "CANCELLED";
  totalAmount: number;
  paidAt: Date | string | null;
  paidAmount: number | null;
};

export const invoicePaymentStateLabels: Record<InvoicePaymentState, string> = {
  NOT_APPLICABLE: "—",
  OPEN: "Offen",
  PARTIAL: "Teilweise bezahlt",
  PAID: "Bezahlt",
};

/** Cent-genauer Vergleich: Float-Summen treffen sich sonst nie exakt. */
const coversTotal = (paidAmount: number, totalAmount: number) =>
  Math.round(paidAmount * 100) >= Math.round(totalAmount * 100);

export function invoicePaymentState(
  invoice: InvoicePaymentInput,
): InvoicePaymentState {
  if (invoice.status !== "PUBLISHED") return "NOT_APPLICABLE";
  if (!invoice.paidAt) return "OPEN";
  if (invoice.paidAmount === null) return "PAID";
  if (coversTotal(invoice.paidAmount, invoice.totalAmount)) return "PAID";
  return invoice.paidAmount > 0 ? "PARTIAL" : "OPEN";
}

/**
 * Noch offener Betrag. Entwürfe und Stornos sind per Definition 0 — sie dürfen
 * nicht in die Summe der offenen Posten einfließen.
 */
export function invoiceOpenAmount(invoice: InvoicePaymentInput): number {
  if (invoice.status !== "PUBLISHED") return 0;
  if (!invoice.paidAt) return invoice.totalAmount;
  const paid = invoice.paidAmount ?? invoice.totalAmount;
  return Math.max(0, Math.round((invoice.totalAmount - paid) * 100) / 100);
}

/** Tatsächlich verbuchter Betrag, für Umsatzauswertungen. */
export function invoicePaidAmount(invoice: InvoicePaymentInput): number {
  if (invoice.status !== "PUBLISHED" || !invoice.paidAt) return 0;
  return invoice.paidAmount ?? invoice.totalAmount;
}

/**
 * Zahlungsstand einer ganzen Anmeldung, aus ihren Rechnungen abgeleitet.
 *
 * `NOT_APPLICABLE` heißt hier "noch keine ausgestellte Rechnung" — weder
 * bezahlt noch offen, weil noch gar keine Forderung besteht. Das ist der
 * Normalfall bei Barzahlung und bei Kursen ohne Rechnungsstellung.
 */
export function registrationPaymentState(
  invoices: InvoicePaymentInput[],
): InvoicePaymentState {
  const published = invoices.filter((i) => i.status === "PUBLISHED");
  if (published.length === 0) return "NOT_APPLICABLE";

  const open = published.reduce((sum, i) => sum + invoiceOpenAmount(i), 0);
  if (open === 0) return "PAID";

  const paid = published.reduce((sum, i) => sum + invoicePaidAmount(i), 0);
  return paid > 0 ? "PARTIAL" : "OPEN";
}

/** Offener Gesamtbetrag einer Anmeldung über alle ihre Rechnungen. */
export function registrationOpenAmount(
  invoices: InvoicePaymentInput[],
): number {
  return invoices.reduce((sum, i) => sum + invoiceOpenAmount(i), 0);
}
