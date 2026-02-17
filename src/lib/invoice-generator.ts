import { jsPDF } from "jspdf";
import JSZip from "jszip";
import QRCode from "qrcode";

export interface InvoiceParticipant {
  firstName: string;
  lastName: string;
  priceOption: string | null;
  siblingGroupId?: string | null;
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

  siblingDiscountApplied?: boolean;
  siblingDiscountStatus?: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
  siblingDiscountAmount?: number | null;
  originalTotalPrice?: number | null;

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
  organizationName?: string;
  organizationAddress?: string;
  organizationContact?: string;

  paymentDueDate?: Date;
  paymentDeadlineDays?: number;
  bankName?: string;
  iban?: string;
  bic?: string;

  signatureBase64?: string;
  signatureName?: string;
}

const defaultOptions: InvoiceOptions = {
  organizationName: "Posaunenwerk der Evangelischen Kirche im Rheinland e.V.",
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
 * Builds the EPC QR code payload for SEPA credit transfer (BCD 002).
 * Banking apps can scan this to pre-fill recipient, IBAN, amount and reference.
 */
function buildEpcQrPayload(
  beneficiaryName: string,
  iban: string,
  amountEur: number,
  reference: string,
  bic?: string,
): string {
  const ibanClean = iban.replace(/\s/g, "");
  const name = beneficiaryName.slice(0, 70);
  const ref = reference.slice(0, 140);
  const lines = [
    "BCD", // Service tag
    "002", // Version
    "1", // Character set UTF-8
    "SCT", // SEPA Credit Transfer
    bic?.replace(/\s/g, "") ?? "", // BIC (optional for domestic)
    name,
    ibanClean,
    `EUR${amountEur.toFixed(2)}`, // Amount
    "", // Purpose (optional)
    "", // Structured creditor reference
    ref, // Remittance (Verwendungszweck)
    "", // Beneficiary to originator info
  ];
  return lines.join("\n");
}

/**
 * Generates an EPC SEPA QR code as a data URL for embedding in the PDF.
 */
async function generateEpcQrDataUrl(
  beneficiaryName: string,
  iban: string,
  amountEur: number,
  reference: string,
  bic?: string,
): Promise<string> {
  const payload = buildEpcQrPayload(
    beneficiaryName,
    iban,
    amountEur,
    reference,
    bic,
  );
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 256,
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
): Promise<{ blob: Blob; filename: string; invoiceNumber: string }> {
  const opts = { ...defaultOptions, ...options };
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let y = 20;

  const checkPageBreak = (requiredSpace: number = 20) => {
    if (y > 270 - requiredSpace) {
      doc.addPage();
      y = 20;
    }
  };

  const invoiceNumber = `RE-${registration.id.slice(0, 8).toUpperCase()}`;
  const invoiceDate = new Date().toLocaleDateString("de-DE");

  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", margin, y - 5, 60, 25);
      y += 25;
    } catch {
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(88, 89, 91);
      doc.text("Posaunenwerk der Evangelischen Kirche im Rheinland e.V.", margin, y);
      y += 10;
    }
  } else {
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(88, 89, 91);
    doc.text("Posaunenwerk der Evangelischen Kirche im Rheinland e.V.", margin, y);
    y += 10;
  }

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text("Rechnung", pageWidth - margin, 20, { align: "right" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Nr: ${invoiceNumber}`, pageWidth - margin, 27, { align: "right" });
  doc.text(`Datum: ${invoiceDate}`, pageWidth - margin, 33, { align: "right" });

  y += 5;
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(opts.organizationName ?? "", margin, y);
  y += 4;
  doc.text(opts.organizationAddress ?? "", margin, y);
  y += 4;
  doc.text(opts.organizationContact ?? "", margin, y);
  doc.setTextColor(0);

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

  y += 8;
  doc.setFont("helvetica", "bold");
  doc.text("Rechnungsempfänger:", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");

  if (
    registration.useSeparateBilling &&
    (registration.billingFirstName || registration.billingLastName)
  ) {
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

  y += 12;
  checkPageBreak(30);

  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y - 4, pageWidth - 2 * margin, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.text("Teilnehmer", margin + 2, y);
  doc.text("Kategorie", margin + 80, y);
  doc.text("Preis", pageWidth - margin - 20, y);

  y += 10;
  doc.setFont("helvetica", "normal");

  const participantDiscounts = new Map<string, number>();

  if (
    registration.siblingDiscountApplied &&
    registration.participants.some((p) => p.siblingGroupId)
  ) {
    const siblingGroups = new Map<
      string | null,
      typeof registration.participants
    >();
    registration.participants.forEach((participant) => {
      const groupId = participant.siblingGroupId ?? null;
      if (!siblingGroups.has(groupId)) {
        siblingGroups.set(groupId, []);
      }
      siblingGroups.get(groupId)?.push(participant);
    });

    siblingGroups.forEach((groupParticipants, groupId) => {
      if (groupId && groupParticipants.length > 1) {
        const sortedGroup = [...groupParticipants].sort((a, b) => {
          const nameA = `${a.firstName} ${a.lastName}`;
          const nameB = `${b.firstName} ${b.lastName}`;
          return nameA.localeCompare(nameB);
        });

        for (let i = 1; i < sortedGroup.length; i++) {
          const participant = sortedGroup[i];
          if (!participant) continue;

          const priceOption = course.priceOptions?.find(
            (p) => p.label === participant.priceOption,
          );
          const price = priceOption?.price ?? 0;
          const discount = price * 0.2;

          const participantKey = `${participant.firstName}|${participant.lastName}|${participant.priceOption}`;
          participantDiscounts.set(participantKey, discount);
        }
      }
    });
  }

  registration.participants.forEach((participant) => {
    checkPageBreak();

    const priceOption = course.priceOptions?.find(
      (p) => p.label === participant.priceOption,
    );
    const price = priceOption?.price ?? 0;

    const participantKey = `${participant.firstName}|${participant.lastName}|${participant.priceOption}`;
    const participantDiscount = participantDiscounts.get(participantKey) ?? 0;

    doc.text(`${participant.firstName} ${participant.lastName}`, margin + 2, y);
    doc.text(participant.priceOption || "-", margin + 80, y);
    doc.text(`${price.toFixed(2)} €`, pageWidth - margin - 20, y);
    y += 7;

    if (participantDiscount > 0) {
      doc.setFontSize(9);
      doc.setTextColor(0, 150, 0); // Green color for discount
      doc.text("Geschwisterrabatt (20%):", margin + 2, y);
      doc.text(
        `-${participantDiscount.toFixed(2)} €`,
        pageWidth - margin - 20,
        y,
      );
      doc.setTextColor(0); // Reset to black
      doc.setFontSize(10);
      y += 6;
    }
  });

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

  y += 18;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

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

  const paymentText = `Wir bitten Sie, den Rechnungsbetrag bis zum ${deadlineStr} auf das unten angegebene Konto zu überweisen. Bitte geben Sie als Verwendungszweck die Rechnungsnummer an.`;
  const splitPayment = doc.splitTextToSize(paymentText, pageWidth - 2 * margin);
  doc.text(splitPayment, margin, y);
  y += splitPayment.length * 5 + 3;

  doc.text(
    "Sofern bereits eine Anzahlung geleistet wurde, ziehen Sie diese bitte vom Rechnungsbetrag ab.",
    margin,
    y,
  );

  y += 12;
  checkPageBreak(40);

  const qrSize = 38;
  const bankBlockY = y - 4;
  
  // Calculate height needed for QR code + text below it
  const qrTextHeight = 8; // Height of "QR mit Banking-App scannen" text
  const qrTextMargin = 2; // Minimal margin between QR code and text (directly underneath)
  const qrTotalHeight = qrSize + qrTextMargin + qrTextHeight;
  
  // Calculate the height of the left text block
  const leftTextLineHeights = [6, 5, 5, 6]; // Heights for each line: Bankverbindung, Bank name, IBAN/BIC, Verwendungszweck
  const leftTextTotalHeight = leftTextLineHeights.reduce((sum, h) => sum + h, 0);
  
  // Bank block height needs to accommodate the taller of: QR code + text, or bank details
  // Use minimal padding (4 pixels total: 2 top, 2 bottom) to fit content tightly
  const contentHeight = Math.max(qrTotalHeight, leftTextTotalHeight);
  const bankBlockHeight = contentHeight + 4;

  let qrDataUrl: string | null = null;
  if (opts.iban) {
    try {
      qrDataUrl = await generateEpcQrDataUrl(
        opts.organizationName ?? "Posaunenwerk der Evangelischen Kirche im Rheinland e.V.",
        opts.iban,
        registration.totalPrice,
        invoiceNumber,
        opts.bic,
      );
    } catch {
      // If QR generation fails, continue without it
    }
  }

  doc.setFillColor(245, 245, 245);
  doc.rect(margin, bankBlockY, pageWidth - 2 * margin, bankBlockHeight, "F");

  // Calculate starting Y position to center the left text vertically
  const leftTextStartY = bankBlockY + (bankBlockHeight - leftTextTotalHeight) / 2;
  let leftTextY = leftTextStartY;

  // Draw left-side bank details, vertically centered
  doc.setFont("helvetica", "bold");
  doc.text("Bankverbindung:", margin + 3, leftTextY);
  leftTextY += 6;
  doc.setFont("helvetica", "normal");
  doc.text(opts.bankName ?? "", margin + 3, leftTextY);
  leftTextY += 5;
  doc.text(`IBAN: ${opts.iban}`, margin + 3, leftTextY);
  doc.text(`BIC: ${opts.bic}`, margin + 90, leftTextY);
  leftTextY += 5;
  doc.setFont("helvetica", "bold");
  doc.text(`Verwendungszweck: ${invoiceNumber}`, margin + 3, leftTextY);

  // Position QR code and text on the right, vertically centered
  if (qrDataUrl) {
    try {
      // Center QR code vertically within the block
      const qrTop = bankBlockY + (bankBlockHeight - qrTotalHeight) / 2;
      const qrX = pageWidth - margin - qrSize - 4;
      
      doc.addImage(
        qrDataUrl,
        "PNG",
        qrX,
        qrTop,
        qrSize,
        qrSize,
      );
      
      // Position text directly below QR code, centered under it
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100);
      const qrCenterX = qrX + qrSize / 2; // Center X position of the QR code
      doc.text(
        "QR mit Banking-App scannen",
        qrCenterX,
        qrTop + qrSize + qrTextMargin, // Position directly underneath QR code with minimal spacing
        { align: "center", maxWidth: qrSize },
      );
      doc.setTextColor(0);
      doc.setFontSize(10);
    } catch {
      // Ignore image errors
    }
  }

  y = bankBlockY + bankBlockHeight + 6;
  checkPageBreak(40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  doc.text("Wir freuen uns auf eine gemeinsame Zeit!", margin, y);
  y += 6;
  doc.text("Herzliche Grüße", margin, y);
  y += 12;

  if (opts.signatureBase64) {
    try {
      doc.addImage(opts.signatureBase64, "PNG", margin, y, 40, 20);
      y += 22;
    } catch {}
  }

  if (opts.signatureName) {
    doc.setFont("helvetica", "normal");
    doc.text(opts.signatureName, margin, y);
    y += 6;
  } else {
    doc.setFont("helvetica", "italic");
    doc.text("Ihr Team vom Posaunenwerk Rheinland", margin, y);
  }

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

  if (registration.notes) {
    y += 6;
    doc.setTextColor(80);
    doc.setFont("helvetica", "italic");
    const notesText = `Anmerkungen: ${registration.notes}`;
    const splitNotes = doc.splitTextToSize(notesText, pageWidth - 2 * margin);
    doc.text(splitNotes, margin, y);
  }

  doc.setFontSize(8);
  doc.setTextColor(128);
  doc.setFont("helvetica", "normal");

  doc.setDrawColor(200);
  doc.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);

  doc.text(opts.organizationName ?? "", margin, pageHeight - 15);
  doc.text(`IBAN: ${opts.iban} | BIC: ${opts.bic}`, margin, pageHeight - 10);

  const filename = `Rechnung_${invoiceNumber}_${registration.registrantLastName}.pdf`;
  const blob = doc.output("blob");

  return { blob, filename, invoiceNumber };
}

/**
 * Generates a single invoice PDF and downloads it
 */
export async function generateInvoice(
  course: InvoiceCourse,
  registration: InvoiceRegistration,
  options: InvoiceOptions = {},
): Promise<void> {
  let logoBase64: string | undefined;
  try {
    logoBase64 = await loadImageAsBase64("/images/logo.png");
  } catch {}

  const { blob, filename } = await createInvoicePdf(
    course,
    registration,
    options,
    logoBase64,
  );

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
 * Also includes an Excel summary file for bookkeeping
 */
export async function generateBulkInvoices(
  course: InvoiceCourse,
  registrations: InvoiceRegistration[],
  options: InvoiceOptions = {},
  onProgress?: (current: number, total: number) => void,
): Promise<void> {
  const zip = new JSZip();

  let logoBase64: string | undefined;
  try {
    logoBase64 = await loadImageAsBase64("/images/logo.png");
  } catch {}

  interface InvoiceSummaryRow {
    invoiceNumber: string;
    registrantName: string;
    billingName: string;
    billingCompany: string;
    billingStreet: string;
    billingZipCity: string;
    billingEmail: string;
    registrantEmail: string;
    totalAmount: string;
  }
  const summaryData: InvoiceSummaryRow[] = [];

  for (let i = 0; i < registrations.length; i++) {
    const registration = registrations[i];
    if (!registration) continue;

    onProgress?.(i + 1, registrations.length);

    const { blob, filename, invoiceNumber } = await createInvoicePdf(
      course,
      registration,
      options,
      logoBase64,
    );

    zip.file(filename, blob);

    const useBilling =
      registration.useSeparateBilling &&
      (registration.billingFirstName || registration.billingLastName);

    const billingName = useBilling
      ? `${registration.billingFirstName ?? ""} ${registration.billingLastName ?? ""}`.trim()
      : `${registration.registrantFirstName} ${registration.registrantLastName}`;

    const billingCompany = useBilling
      ? (registration.billingCompany ?? "")
      : "";

    const billingStreet = useBilling ? (registration.billingStreet ?? "") : "";

    const billingZipCity = useBilling
      ? `${registration.billingZipCode ?? ""} ${registration.billingCity ?? ""}`.trim()
      : "";

    const billingEmail =
      useBilling && registration.billingEmail
        ? registration.billingEmail
        : registration.registrantEmail;

    summaryData.push({
      invoiceNumber,
      registrantName: `${registration.registrantFirstName} ${registration.registrantLastName}`,
      billingName,
      billingCompany,
      billingStreet,
      billingZipCity,
      billingEmail,
      registrantEmail: registration.registrantEmail,
      totalAmount: registration.totalPrice.toFixed(2).replace(".", ","),
    });
  }

  const excelHeaders = [
    "Rechnungsnummer",
    "Anmelder",
    "Rechnungsempfänger",
    "Firma",
    "Straße",
    "PLZ Ort",
    "Rechnungs-E-Mail",
    "Anmelder-E-Mail",
    "Betrag (€)",
  ];

  const escapeExcelValue = (value: string): string => {
    if (value.includes(";") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const excelContent = [
    excelHeaders.map(escapeExcelValue).join(";"),
    ...summaryData.map((row) =>
      [
        row.invoiceNumber,
        row.registrantName,
        row.billingName,
        row.billingCompany,
        row.billingStreet,
        row.billingZipCity,
        row.billingEmail,
        row.registrantEmail,
        row.totalAmount,
      ]
        .map(escapeExcelValue)
        .join(";"),
    ),
  ].join("\r\n");

  const bom = "\uFEFF";
  const excelBlob = new Blob([bom + excelContent], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });

  const dateStr = new Date().toISOString().split("T")[0];
  zip.file(`Rechnungsübersicht_${dateStr}.xls`, excelBlob);

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const courseSlug = course.title.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, "_");
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
