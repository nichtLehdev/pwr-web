/**
 * Zahlungsstand, abgeleitet aus `paidAt`, `paidAmount` und Status statt gespeichert —
 * eine Regel für Dashboard, Router und Exporte. Dependency-frei für Client und Server.
 */

export type InvoicePaymentState =
  /** Entwurf oder Storno — an einem solchen Dokument gibt es nichts zu zahlen. */
  "NOT_APPLICABLE" | "OPEN" | "PARTIAL" | "PAID";

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

const centsEqual = (a: number, b: number) =>
  Math.round(a * 100) === Math.round(b * 100);

/**
 * `undefined` für den vollen Betrag: `paidAmount = null` heißt „alles“ und zieht bei einer
 * späteren Korrektur des Rechnungsbetrags mit, eine gespeicherte Zahl bliebe veraltet stehen.
 */
export function bookedAmountFor(
  enteredAmount: number,
  totalAmount: number,
): number | undefined {
  return centsEqual(enteredAmount, totalAmount) ? undefined : enteredAmount;
}

export function invoicePaymentState(
  invoice: InvoicePaymentInput,
): InvoicePaymentState {
  if (invoice.status !== "PUBLISHED") return "NOT_APPLICABLE";
  if (!invoice.paidAt) return "OPEN";
  if (invoice.paidAmount === null) return "PAID";
  if (coversTotal(invoice.paidAmount, invoice.totalAmount)) return "PAID";
  return invoice.paidAmount > 0 ? "PARTIAL" : "OPEN";
}

/** Entwürfe und Stornos zählen 0, damit sie nicht in die offenen Posten fließen. */
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

/** `NOT_APPLICABLE` heißt „noch keine ausgestellte Rechnung“ (Normalfall bei Barzahlung). */
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

export function registrationOpenAmount(
  invoices: InvoicePaymentInput[],
): number {
  return invoices.reduce((sum, i) => sum + invoiceOpenAmount(i), 0);
}
