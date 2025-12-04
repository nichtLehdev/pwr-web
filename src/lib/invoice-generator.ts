import { jsPDF } from "jspdf";
import JSZip from "jszip";

// Type definitions for invoice data
export interface InvoiceParticipant {
  firstName: string;
  lastName: string;
  priceOption: string | null;
}

export interface InvoicePriceOption {
  label: string;
  price: number;
}

export interface InvoiceLocation {
  name: string | null;
  city: string;
}

export interface InvoiceCourse {
  title: string;
  startDate: Date | null;
  endDate: Date | null;
  location: InvoiceLocation | null;
  priceOptions: InvoicePriceOption[] | null;
}

export interface InvoiceRegistration {
  id: string;
  registrantFirstName: string;
  registrantLastName: string;
  registrantEmail: string;
  registrantPhone: string | null;
  totalPrice: number;
  createdAt: Date;
  notes: string | null;
  participants: InvoiceParticipant[];
  // Billing address (optional)
  useSeparateBilling?: boolean;
  billingCompany?: string | null;
  billingFirstName?: string | null;
  billingLastName?: string | null;
  billingStreet?: string | null;
  billingZipCode?: string | null;
  billingCity?: string | null;
  billingEmail?: string | null;
}

export interface InvoiceOptions {
  // Organization info
  organizationName?: string;
  organizationAddress?: string;
  organizationContact?: string;

  // Payment info
  paymentDueDate?: Date;
  paymentDeadlineDays?: number;
  bankName?: string;
  iban?: string;
  bic?: string;

  // Signature (base64 image and name)
  signatureBase64?: string;
  signatureName?: string;
}

const defaultOptions: InvoiceOptions = {
  organizationName: "Posaunenwerk der Evang. Kirche im Rheinland e.V.",
  organizationAddress: "Rudolf-Harbig-Str. 20, 56179 Vallendar",
  organizationContact: "Tel: 0261.300 00 11 | info@posaunenwerk-rheinland.de",

  paymentDeadlineDays: 21,
  bankName: "Bank für Kirche und Diakonie eG Duisburg",
  iban: "DE57 3506 0190 1011 4590 10",
  bic: "GENODED1DKD",
};

/**
 * Loads an image and converts it to base64
 */
async function loadImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Creates a single invoice PDF and returns it as a blob
 */
export async function createInvoicePdf(
  course: InvoiceCourse,
  registration: InvoiceRegistration,
  options: InvoiceOptions = {},
  logoBase64?: string,
): Promise<{ blob: Blob; filename: string }> {
  const opts = { ...defaultOptions, ...options };
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let y = 20;

  // Helper to check and add new page if needed
  const checkPageBreak = (requiredSpace: number = 20) => {
    if (y > 270 - requiredSpace) {
      doc.addPage();
      y = 20;
    }
  };

  const invoiceNumber = `RE-${registration.id.slice(0, 8).toUpperCase()}`;
  const invoiceDate = new Date().toLocaleDateString("de-DE");

  // === HEADER WITH LOGO ===
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", margin, y - 5, 60, 25);
      y += 25;
    } catch {
      // Fallback to text
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(88, 89, 91);
      doc.text("Posaunenwerk Rheinland", margin, y);
      y += 10;
    }
  } else {
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(88, 89, 91);
    doc.text("Posaunenwerk Rheinland", margin, y);
    y += 10;
  }

  // Invoice title and number (right side, at top)
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text("Rechnung", pageWidth - margin, 20, { align: "right" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Nr: ${invoiceNumber}`, pageWidth - margin, 27, { align: "right" });
  doc.text(`Datum: ${invoiceDate}`, pageWidth - margin, 33, { align: "right" });

  // Organization info
  y += 5;
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(opts.organizationName ?? "", margin, y);
  y += 4;
  doc.text(opts.organizationAddress ?? "", margin, y);
  y += 4;
  doc.text(opts.organizationContact ?? "", margin, y);
  doc.setTextColor(0);

  // === COURSE INFO ===
  y += 12;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(course.title, margin, y);

  y += 7;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  if (course.startDate) {
    const startDate = new Date(course.startDate).toLocaleDateString("de-DE");
    const endDate = course.endDate
      ? new Date(course.endDate).toLocaleDateString("de-DE")
      : null;
    doc.text(
      `Zeitraum: ${startDate}${endDate ? ` - ${endDate}` : ""}`,
      margin,
      y,
    );
    y += 5;
  }

  if (course.location) {
    const locationText = course.location.name
      ? `${course.location.name}, ${course.location.city}`
      : course.location.city;
    doc.text(`Ort: ${locationText}`, margin, y);
    y += 5;
  }

  // === RECIPIENT INFO (Billing address if set, otherwise registrant) ===
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.text("Rechnungsempfänger:", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");

  if (
    registration.useSeparateBilling &&
    (registration.billingFirstName || registration.billingLastName)
  ) {
    // Use billing address
    if (registration.billingCompany) {
      doc.text(registration.billingCompany, margin, y);
      y += 5;
    }
    doc.text(
      `${registration.billingFirstName ?? ""} ${registration.billingLastName ?? ""}`.trim(),
      margin,
      y,
    );
    if (registration.billingStreet) {
      y += 5;
      doc.text(registration.billingStreet, margin, y);
    }
    if (registration.billingZipCode || registration.billingCity) {
      y += 5;
      doc.text(
        `${registration.billingZipCode ?? ""} ${registration.billingCity ?? ""}`.trim(),
        margin,
        y,
      );
    }
    if (registration.billingEmail) {
      y += 5;
      doc.text(registration.billingEmail, margin, y);
    }
  } else {
    // Use registrant info
    doc.text(
      `${registration.registrantFirstName} ${registration.registrantLastName}`,
      margin,
      y,
    );
    y += 5;
    doc.text(registration.registrantEmail, margin, y);
    if (registration.registrantPhone) {
      y += 5;
      doc.text(registration.registrantPhone, margin, y);
    }
  }

  // === PARTICIPANT TABLE ===
  y += 12;
  checkPageBreak(30);

  // Table header
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y - 4, pageWidth - 2 * margin, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.text("Teilnehmer", margin + 2, y);
  doc.text("Kategorie", margin + 80, y);
  doc.text("Preis", pageWidth - margin - 20, y);

  // Table rows
  y += 10;
  doc.setFont("helvetica", "normal");

  registration.participants.forEach((participant) => {
    checkPageBreak();

    const priceOption = course.priceOptions?.find(
      (p) => p.label === participant.priceOption,
    );
    const price = priceOption?.price ?? 0;

    doc.text(`${participant.firstName} ${participant.lastName}`, margin + 2, y);
    doc.text(participant.priceOption || "-", margin + 80, y);
    doc.text(`${price.toFixed(2)} €`, pageWidth - margin - 20, y);
    y += 7;
  });

  // === TOTAL ===
  y += 3;
  doc.setDrawColor(0);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Gesamtbetrag:", margin + 80, y);
  doc.text(
    `${registration.totalPrice.toFixed(2)} €`,
    pageWidth - margin - 20,
    y,
  );

  // === PAYMENT INFO ===
  y += 18;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  // Payment deadline - use provided date or calculate from days
  let deadlineStr: string;
  if (opts.paymentDueDate) {
    deadlineStr = opts.paymentDueDate.toLocaleDateString("de-DE", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } else {
    const paymentDeadline = new Date();
    paymentDeadline.setDate(
      paymentDeadline.getDate() + (opts.paymentDeadlineDays ?? 21),
    );
    deadlineStr = paymentDeadline.toLocaleDateString("de-DE", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  // Nice text
  const paymentText = `Wir bitten Sie, den Rechnungsbetrag bis zum ${deadlineStr} auf das unten angegebene Konto zu überweisen. Bitte geben Sie als Verwendungszweck die Rechnungsnummer an.`;
  const splitPayment = doc.splitTextToSize(paymentText, pageWidth - 2 * margin);
  doc.text(splitPayment, margin, y);
  y += splitPayment.length * 5 + 3;

  doc.text(
    "Sofern bereits eine Anzahlung geleistet wurde, ziehen Sie diese bitte vom Rechnungsbetrag ab.",
    margin,
    y,
  );

  // === BANK DETAILS ===
  y += 12;
  checkPageBreak(30);

  doc.setFillColor(245, 245, 245);
  doc.rect(margin, y - 4, pageWidth - 2 * margin, 28, "F");

  doc.setFont("helvetica", "bold");
  doc.text("Bankverbindung:", margin + 3, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.text(opts.bankName ?? "", margin + 3, y);
  y += 5;
  doc.text(`IBAN: ${opts.iban}`, margin + 3, y);
  doc.text(`BIC: ${opts.bic}`, margin + 90, y);
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text(`Verwendungszweck: ${invoiceNumber}`, margin + 3, y);

  // === CLOSING TEXT ===
  y += 18;
  checkPageBreak(40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  doc.text("Wir freuen uns auf eine gemeinsame Zeit!", margin, y);
  y += 6;
  doc.text("Herzliche Grüße", margin, y);
  y += 12;

  // Add signature if provided
  if (opts.signatureBase64) {
    try {
      doc.addImage(opts.signatureBase64, "PNG", margin, y, 40, 20);
      y += 22;
    } catch {
      // Skip signature if it fails
    }
  }

  // Add signature name if provided
  if (opts.signatureName) {
    doc.setFont("helvetica", "normal");
    doc.text(opts.signatureName, margin, y);
    y += 6;
  } else {
    doc.setFont("helvetica", "italic");
    doc.text("Ihr Team vom Posaunenwerk Rheinland", margin, y);
  }

  // === REGISTRATION INFO ===
  y += 15;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(128);
  doc.text(
    `Anmeldung vom ${new Date(registration.createdAt).toLocaleDateString(
      "de-DE",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      },
    )}`,
    margin,
    y,
  );

  // Notes
  if (registration.notes) {
    y += 6;
    doc.setTextColor(80);
    doc.setFont("helvetica", "italic");
    const notesText = `Anmerkungen: ${registration.notes}`;
    const splitNotes = doc.splitTextToSize(notesText, pageWidth - 2 * margin);
    doc.text(splitNotes, margin, y);
  }

  // === FOOTER ===
  doc.setFontSize(8);
  doc.setTextColor(128);
  doc.setFont("helvetica", "normal");

  // Footer line
  doc.setDrawColor(200);
  doc.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);

  doc.text(opts.organizationName ?? "", margin, pageHeight - 15);
  doc.text(`IBAN: ${opts.iban} | BIC: ${opts.bic}`, margin, pageHeight - 10);

  // Return PDF as blob
  const filename = `Rechnung_${invoiceNumber}_${registration.registrantLastName}.pdf`;
  const blob = doc.output("blob");

  return { blob, filename };
}

/**
 * Generates a single invoice PDF and downloads it
 */
export async function generateInvoice(
  course: InvoiceCourse,
  registration: InvoiceRegistration,
  options: InvoiceOptions = {},
): Promise<void> {
  // Load logo
  let logoBase64: string | undefined;
  try {
    logoBase64 = await loadImageAsBase64("/images/logo.png");
  } catch {
    // Continue without logo
  }

  const { blob, filename } = await createInvoicePdf(
    course,
    registration,
    options,
    logoBase64,
  );

  // Download the file
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generates multiple invoices and downloads them as a ZIP file
 */
export async function generateBulkInvoices(
  course: InvoiceCourse,
  registrations: InvoiceRegistration[],
  options: InvoiceOptions = {},
  onProgress?: (current: number, total: number) => void,
): Promise<void> {
  const zip = new JSZip();

  // Load logo once for all invoices
  let logoBase64: string | undefined;
  try {
    logoBase64 = await loadImageAsBase64("/images/logo.png");
  } catch {
    // Continue without logo
  }

  // Generate all invoices
  for (let i = 0; i < registrations.length; i++) {
    const registration = registrations[i];
    if (!registration) continue;

    onProgress?.(i + 1, registrations.length);

    const { blob, filename } = await createInvoicePdf(
      course,
      registration,
      options,
      logoBase64,
    );

    zip.file(filename, blob);
  }

  // Generate ZIP and download
  const zipBlob = await zip.generateAsync({ type: "blob" });
  const courseSlug = course.title.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, "_");
  const dateStr = new Date().toISOString().split("T")[0];
  const zipFilename = `Rechnungen_${courseSlug}_${dateStr}.zip`;

  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = zipFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
