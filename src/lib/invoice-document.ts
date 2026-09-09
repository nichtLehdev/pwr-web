/**
 * The invoice document: its data shape and its arithmetic.
 *
 * Dependency-free on purpose — dashboard pages, the tRPC router and the PDF
 * renderer (see ./invoice-render) all agree on these types and on how a total
 * is computed, without any of them dragging in a PDF library.
 */

/**
 * One line of the invoice. `unitPrice` may be negative — that is how discounts,
 * already-paid deposits and subsidies are expressed, so the sum of the lines is
 * always the amount due.
 */
export interface InvoiceLineItem {
  description: string;
  /** Optional smaller second line, e.g. the price category or a note. */
  detail?: string | null;
  quantity: number;
  unitPrice: number;
}

export interface InvoiceRecipient {
  company?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  street?: string | null;
  zipCode?: string | null;
  city?: string | null;
  email?: string | null;
}

export interface InvoiceDocumentCourse {
  title: string;
  startDate: Date | string | null;
  endDate: Date | string | null;
  locationName?: string | null;
  locationCity?: string | null;
  /** Interne Kursnummer, siehe {@link invoicePaymentReference}. */
  courseNumber?: string | null;
}

export interface InvoiceDocument {
  /** Absent on drafts — the preview then prints a placeholder and a watermark. */
  invoiceNumber: string | null;
  invoiceDate: Date | string | null;
  dueDate: Date | string | null;
  /** DRAFT prints an "ENTWURF" watermark, CANCELLED a "STORNIERT" one. */
  status: "DRAFT" | "PUBLISHED" | "CANCELLED";
  course: InvoiceDocumentCourse;
  recipient: InvoiceRecipient;
  lineItems: InvoiceLineItem[];
  introText?: string | null;
  closingText?: string | null;
  signatureName?: string | null;
  /** Number of the invoice this one replaces, printed as a correction note. */
  replacesInvoiceNumber?: string | null;
  /** Number of the invoice that superseded this one, printed on the storno copy. */
  replacedByInvoiceNumber?: string | null;
}

export interface InvoiceOrganization {
  name: string;
  address: string;
  contact: string;
  bankName: string;
  iban: string;
  bic: string;
}

export const DEFAULT_INVOICE_ORGANIZATION: InvoiceOrganization = {
  name: "Posaunenwerk der Evangelischen Kirche im Rheinland e.V.",
  address: "Rudolf-Harbig-Str. 20, 56179 Vallendar",
  contact: "Tel: 0261.300 00 11 | info@posaunenwerk-rheinland.de",
  bankName: "Bank für Kirche und Diakonie eG Duisburg",
  iban: "DE57 3506 0190 1011 4590 10",
  bic: "GENODED1DKD",
};

/**
 * Digits only, at most ten of them.
 *
 * The course number ends up inside the invoice number, and the invoice number
 * names the frozen PDF on disk (see storeInvoicePdf) — so it has to stay free
 * of separators, umlauts and anything that could walk out of the folder. Digits
 * are also what the treasurer types into the banking search.
 */
export const COURSE_NUMBER_PATTERN = /^\d{1,10}$/;

export function isValidCourseNumber(value: string): boolean {
  return COURSE_NUMBER_PATTERN.test(value);
}

/**
 * Normalises what an organizer typed into the course-number field. Empty (or
 * blank) input means "no number" and is stored as null.
 */
export function normalizeCourseNumber(
  value: string | null | undefined,
): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? null : trimmed;
}

/** Wording the payment reference uses in front of the course number. */
export const COURSE_PAYMENT_REFERENCE_PREFIX = "Bläserlehrgang";

/**
 * The Verwendungszweck for a bank transfer: the invoice number, prefixed with
 * the course the payment belongs to when that course carries an internal
 * number. Having both on one line lets the treasurer match a statement entry to
 * a course at a glance and still to the exact invoice.
 *
 * Used for the printed line and for the EPC QR payload, so a scanned transfer
 * and a hand-typed one arrive with the same reference.
 */
export function invoicePaymentReference(
  invoiceNumber: string,
  courseNumber?: string | null,
): string {
  const number = normalizeCourseNumber(courseNumber);
  return number
    ? `${COURSE_PAYMENT_REFERENCE_PREFIX} ${number} ${invoiceNumber}`
    : invoiceNumber;
}

/** Days between issuing an invoice and its default due date. */
export const DEFAULT_PAYMENT_DEADLINE_DAYS = 21;

export const DEFAULT_INVOICE_CLOSING_TEXT =
  "Wir freuen uns auf eine gemeinsame Zeit!";

/** Cent-safe rounding — floats accumulate visible drift over many lines. */
function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function lineItemTotal(item: InvoiceLineItem): number {
  return round2(item.quantity * item.unitPrice);
}

export function invoiceTotal(items: InvoiceLineItem[]): number {
  return round2(items.reduce((sum, item) => sum + lineItemTotal(item), 0));
}

const currency = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

export function formatEuro(value: number): string {
  return currency.format(value);
}

export function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: Date | string | null | undefined): string {
  const date = toDate(value);
  return date ? date.toLocaleDateString("de-DE") : "";
}

export function formatLongDate(
  value: Date | string | null | undefined,
): string {
  const date = toDate(value);
  return date
    ? date.toLocaleDateString("de-DE", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";
}

export function recipientName(recipient: InvoiceRecipient): string {
  return `${recipient.firstName ?? ""} ${recipient.lastName ?? ""}`.trim();
}

/** \u00e4\u2192ae, \u00df\u2192ss \u2026 \u2014 the German transliteration, not the bare letter. Stripping
 * the diacritic alone would turn "Gro\u00df" into "Gro". */
const TRANSLITERATIONS: Record<string, string> = {
  ä: "ae",
  ö: "oe",
  ü: "ue",
  Ä: "Ae",
  Ö: "Oe",
  Ü: "Ue",
  ß: "ss",
};

/**
 * A filename that survives e-mail, Windows and a ZIP listing: no umlauts
 * mangled by legacy tools, no path separators, always ending in .pdf.
 */
export function invoiceFilename(
  invoiceNumber: string,
  recipient: InvoiceRecipient,
): string {
  const name = (recipient.lastName ?? recipient.company ?? "")
    .replace(
      /[\u00e4\u00f6\u00fc\u00c4\u00d6\u00dc\u00df]/g,
      (char) => TRANSLITERATIONS[char] ?? char,
    )
    // Anything else accented (\u00e9, \u00e7, \u2026) loses just its diacritic.
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return name
    ? `Rechnung_${invoiceNumber}_${name}.pdf`
    : `Rechnung_${invoiceNumber}.pdf`;
}
