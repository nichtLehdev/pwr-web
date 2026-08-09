/**
 * Server side of the invoice document: turning a stored invoice row into the
 * shared `InvoiceDocument` shape, rendering it, and freezing the result on disk.
 *
 * Published PDFs are written once and never overwritten — a correction goes
 * through storno plus a successor invoice, so every document that ever left the
 * house stays byte-identical to what the recipient received.
 */
import { mkdir, readFile, writeFile } from "fs/promises";
import { join, resolve } from "path";
import {
  invoiceFilename,
  type InvoiceDocument,
  type InvoiceLineItem,
} from "@/lib/invoice-document";
import { renderInvoicePdf } from "@/lib/invoice-render";
import { UPLOADS_ROOT } from "@/server/utils/uploads-dir";

/** Subfolder of the uploads volume holding the frozen invoice PDFs. */
export const INVOICE_UPLOAD_FOLDER = "invoices";

let cachedLogo: string | null | undefined;

/**
 * The letterhead logo as a data URL, read once per process. A missing file is
 * cached as "absent" so a broken deployment doesn't hit the disk per invoice —
 * the renderer falls back to a text header.
 */
async function loadLogoBase64(): Promise<string | undefined> {
  if (cachedLogo !== undefined) return cachedLogo ?? undefined;
  try {
    const logoPath = resolve(
      /* turbopackIgnore: true */ process.cwd(),
      "public/images/logo.png",
    );
    const bytes = await readFile(/* turbopackIgnore: true */ logoPath);
    cachedLogo = `data:image/png;base64,${bytes.toString("base64")}`;
  } catch {
    cachedLogo = null;
  }
  return cachedLogo ?? undefined;
}

/** Shape of the JSON stored in `Invoice.lineItems`, after validation. */
export function parseLineItems(value: unknown): InvoiceLineItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const item = raw as Record<string, unknown>;
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);
    if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) return [];
    return [
      {
        description: typeof item.description === "string" ? item.description : "",
        detail: typeof item.detail === "string" ? item.detail : null,
        quantity,
        unitPrice,
      },
    ];
  });
}

/** The stored columns the renderer needs. Kept structural so any select works. */
export interface InvoiceRecordForPdf {
  invoiceNumber: string | null;
  status: "DRAFT" | "PUBLISHED" | "CANCELLED";
  invoiceDate: Date | null;
  dueDate: Date | null;
  recipientCompany: string | null;
  recipientFirstName: string | null;
  recipientLastName: string | null;
  recipientStreet: string | null;
  recipientZipCode: string | null;
  recipientCity: string | null;
  recipientEmail: string | null;
  lineItems: unknown;
  introText: string | null;
  closingText: string | null;
  signatureName: string | null;
  replaces?: { invoiceNumber: string | null } | null;
  replacedBy?: { invoiceNumber: string | null } | null;
  course: {
    title: string;
    startDate: Date;
    endDate: Date;
    location: { name: string | null; city: string } | null;
  };
}

export function toInvoiceDocument(
  invoice: InvoiceRecordForPdf,
): InvoiceDocument {
  return {
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.invoiceDate,
    dueDate: invoice.dueDate,
    status: invoice.status,
    course: {
      title: invoice.course.title,
      startDate: invoice.course.startDate,
      endDate: invoice.course.endDate,
      locationName: invoice.course.location?.name ?? null,
      locationCity: invoice.course.location?.city ?? null,
    },
    recipient: {
      company: invoice.recipientCompany,
      firstName: invoice.recipientFirstName,
      lastName: invoice.recipientLastName,
      street: invoice.recipientStreet,
      zipCode: invoice.recipientZipCode,
      city: invoice.recipientCity,
      email: invoice.recipientEmail,
    },
    lineItems: parseLineItems(invoice.lineItems),
    introText: invoice.introText,
    closingText: invoice.closingText,
    signatureName: invoice.signatureName,
    replacesInvoiceNumber: invoice.replaces?.invoiceNumber ?? null,
    replacedByInvoiceNumber: invoice.replacedBy?.invoiceNumber ?? null,
  };
}

export async function renderInvoiceBytes(
  invoice: InvoiceRecordForPdf,
  signatureBase64?: string,
): Promise<Uint8Array> {
  return renderInvoicePdf(toInvoiceDocument(invoice), {
    logoBase64: await loadLogoBase64(),
    signatureBase64,
  });
}

export interface StoredInvoicePdf {
  /** Stored as `/api/uploads/invoices/…` so it resolves like every other upload. */
  path: string;
  filename: string;
  size: number;
}

/**
 * Render and persist the PDF of a published invoice.
 *
 * The on-disk name is derived from the invoice number (unique by construction),
 * never from user input, so no two invoices can collide or escape the folder.
 */
export async function storeInvoicePdf(
  invoice: InvoiceRecordForPdf,
  signatureBase64?: string,
): Promise<StoredInvoicePdf> {
  if (!invoice.invoiceNumber) {
    throw new Error("Cannot store a PDF for an invoice without a number");
  }

  const bytes = await renderInvoiceBytes(invoice, signatureBase64);
  const storageName = `${invoice.invoiceNumber}.pdf`;
  const directory = join(UPLOADS_ROOT, INVOICE_UPLOAD_FOLDER);

  await mkdir(/* turbopackIgnore: true */ directory, { recursive: true });
  await writeFile(
    /* turbopackIgnore: true */ join(directory, storageName),
    bytes,
  );

  return {
    path: `/api/uploads/${INVOICE_UPLOAD_FOLDER}/${storageName}`,
    // What the recipient sees when they download it — includes their name.
    filename: invoiceFilename(invoice.invoiceNumber, {
      lastName: invoice.recipientLastName,
      company: invoice.recipientCompany,
    }),
    size: bytes.byteLength,
  };
}
