/**
 * Rendering an {@link InvoiceDocument} to PDF.
 *
 * Split out from the data module so pages that only need the types or the
 * arithmetic do not pull jsPDF and the QR encoder into their bundle. Free of
 * both `window` and `fs`: the exact same code produces the PDF the organizer
 * previews in the browser and the PDF the server freezes on disk when the
 * invoice is published. Anything environment-specific (the logo bytes, where
 * the file goes) is passed in by the caller.
 */
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import {
  DEFAULT_INVOICE_CLOSING_TEXT,
  DEFAULT_INVOICE_ORGANIZATION,
  formatDate,
  formatEuro,
  formatLongDate,
  invoiceTotal,
  lineItemTotal,
  recipientName,
  type InvoiceDocument,
  type InvoiceOrganization,
} from "./invoice-document";

export interface RenderInvoiceOptions {
  organization?: Partial<InvoiceOrganization>;
  /** data: URL of the letterhead logo. Falls back to a text header. */
  logoBase64?: string;
  /** data: URL of a handwritten signature placed above the signer's name. */
  signatureBase64?: string;
}

/**
 * EPC QR payload (BCD 002) for a SEPA credit transfer. Banking apps scan this
 * to pre-fill recipient, IBAN, amount and reference.
 */
function buildEpcQrPayload(
  beneficiaryName: string,
  iban: string,
  amountEur: number,
  reference: string,
  bic?: string,
): string {
  return [
    "BCD", // Service tag
    "002", // Version
    "1", // Character set UTF-8
    "SCT", // SEPA Credit Transfer
    bic?.replace(/\s/g, "") ?? "", // BIC (optional for domestic)
    beneficiaryName.slice(0, 70),
    iban.replace(/\s/g, ""),
    `EUR${amountEur.toFixed(2)}`,
    "", // Purpose (optional)
    "", // Structured creditor reference
    reference.slice(0, 140), // Remittance (Verwendungszweck)
    "", // Beneficiary to originator info
  ].join("\n");
}

/**
 * Signatures arrive as PNG (drawn) or JPEG (uploaded). jsPDF does sniff the
 * data URL itself, so this is not load-bearing — it just stops the addImage
 * call from declaring a format its input contradicts.
 */
function imageFormat(dataUrl: string): "PNG" | "JPEG" {
  return /^data:image\/jpe?g/i.test(dataUrl) ? "JPEG" : "PNG";
}

/** Diagonal "ENTWURF"/"STORNIERT" stamp so an unpublished copy can't pass as final. */
function drawWatermark(doc: jsPDF, text: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.saveGraphicsState();
  // @ts-expect-error — GState is untyped in jspdf's bundled declarations.
  doc.setGState(new doc.GState({ opacity: 0.12 }));
  doc.setFontSize(72);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(200, 0, 0);
  doc.text(text, pageWidth / 2, pageHeight / 2, {
    align: "center",
    angle: 35,
  });
  doc.restoreGraphicsState();
  doc.setTextColor(0);
}

/**
 * Renders the invoice and returns the raw PDF bytes.
 *
 * Works in the browser and in Node — the caller supplies the logo, so nothing
 * here touches `fetch` or the filesystem.
 */
export async function renderInvoicePdf(
  invoice: InvoiceDocument,
  options: RenderInvoiceOptions = {},
): Promise<Uint8Array> {
  const org = { ...DEFAULT_INVOICE_ORGANIZATION, ...options.organization };
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const rightEdge = pageWidth - margin;
  let y = 20;

  const total = invoiceTotal(invoice.lineItems);
  const invoiceNumber = invoice.invoiceNumber ?? "ENTWURF";

  const checkPageBreak = (requiredSpace = 20) => {
    if (y > 270 - requiredSpace) {
      doc.addPage();
      y = 20;
    }
  };

  if (options.logoBase64) {
    try {
      doc.addImage(
        options.logoBase64,
        imageFormat(options.logoBase64),
        margin,
        y - 5,
        60,
        25,
      );
      y += 25;
    } catch {
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(88, 89, 91);
      doc.text(org.name, margin, y, { maxWidth: 110 });
      y += 10;
    }
  } else {
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(88, 89, 91);
    doc.text(org.name, margin, y, { maxWidth: 110 });
    y += 10;
  }

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text("Rechnung", rightEdge, 20, { align: "right" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Nr: ${invoiceNumber}`, rightEdge, 27, { align: "right" });
  doc.text(`Datum: ${formatDate(invoice.invoiceDate ?? new Date())}`, rightEdge, 33, {
    align: "right",
  });

  y += 5;
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(org.name, margin, y);
  y += 4;
  doc.text(org.address, margin, y);
  y += 4;
  doc.text(org.contact, margin, y);
  doc.setTextColor(0);

  y += 10;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(invoice.course.title, margin, y, { maxWidth: pageWidth - 2 * margin });

  y += 7;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  const startDate = formatDate(invoice.course.startDate);
  if (startDate) {
    const endDate = formatDate(invoice.course.endDate);
    doc.text(`Zeitraum: ${startDate}${endDate ? ` - ${endDate}` : ""}`, margin, y);
    y += 5;
  }

  const locationText = [invoice.course.locationName, invoice.course.locationCity]
    .filter(Boolean)
    .join(", ");
  if (locationText) {
    doc.text(`Ort: ${locationText}`, margin, y);
    y += 5;
  }

  y += 7;
  doc.setFont("helvetica", "bold");
  doc.text("Rechnungsempfänger:", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");

  const addressLines = [
    invoice.recipient.company,
    recipientName(invoice.recipient),
    invoice.recipient.street,
    [invoice.recipient.zipCode, invoice.recipient.city]
      .filter(Boolean)
      .join(" ")
      .trim(),
    invoice.recipient.email,
  ].filter((line): line is string => Boolean(line && line.trim()));

  for (const line of addressLines) {
    doc.text(line, margin, y);
    y += 5;
  }

  // Correction notes belong right under the address, where a reader comparing
  // two documents looks first.
  if (invoice.replacesInvoiceNumber) {
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(150, 0, 0);
    doc.text(
      `Diese Rechnung ersetzt die stornierte Rechnung ${invoice.replacesInvoiceNumber}.`,
      margin,
      y,
      { maxWidth: pageWidth - 2 * margin },
    );
    doc.setTextColor(0);
    doc.setFont("helvetica", "normal");
    y += 5;
  }
  if (invoice.status === "CANCELLED") {
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(150, 0, 0);
    doc.text(
      invoice.replacedByInvoiceNumber
        ? `Storniert — ersetzt durch Rechnung ${invoice.replacedByInvoiceNumber}.`
        : "Diese Rechnung wurde storniert.",
      margin,
      y,
      { maxWidth: pageWidth - 2 * margin },
    );
    doc.setTextColor(0);
    doc.setFont("helvetica", "normal");
    y += 5;
  }

  if (invoice.introText?.trim()) {
    y += 6;
    checkPageBreak(20);
    const intro = doc.splitTextToSize(
      invoice.introText.trim(),
      pageWidth - 2 * margin,
    );
    doc.text(intro, margin, y);
    y += intro.length * 5;
  }

  y += 9;
  checkPageBreak(30);

  // Column layout: description grows, the three number columns are fixed and
  // right-aligned so the decimal points line up down the page.
  const amountX = rightEdge;
  const unitPriceX = rightEdge - 32;
  const quantityX = rightEdge - 62;
  const descriptionWidth = quantityX - margin - 14;

  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y - 5, pageWidth - 2 * margin, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Position", margin + 2, y);
  doc.text("Menge", quantityX, y, { align: "right" });
  doc.text("Einzelpreis", unitPriceX, y, { align: "right" });
  doc.text("Betrag", amountX, y, { align: "right" });

  y += 9;
  doc.setFont("helvetica", "normal");

  for (const item of invoice.lineItems) {
    checkPageBreak(18);

    const descriptionLines = doc.splitTextToSize(
      item.description || "-",
      descriptionWidth,
    );
    doc.text(descriptionLines, margin + 2, y);
    // Quantities are usually whole participants; only show decimals when they exist.
    doc.text(
      Number.isInteger(item.quantity)
        ? String(item.quantity)
        : item.quantity.toLocaleString("de-DE"),
      quantityX,
      y,
      { align: "right" },
    );
    doc.text(formatEuro(item.unitPrice), unitPriceX, y, { align: "right" });
    doc.text(formatEuro(lineItemTotal(item)), amountX, y, { align: "right" });

    y += descriptionLines.length * 5;

    if (item.detail?.trim()) {
      doc.setFontSize(9);
      doc.setTextColor(110);
      const detailLines = doc.splitTextToSize(item.detail.trim(), descriptionWidth);
      doc.text(detailLines, margin + 2, y);
      y += detailLines.length * 4.5;
      doc.setTextColor(0);
      doc.setFontSize(10);
    }

    y += 2;
  }

  y += 1;
  checkPageBreak(24);
  doc.setDrawColor(0);
  doc.line(margin, y, rightEdge, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Gesamtbetrag:", quantityX, y, { align: "right" });
  doc.text(formatEuro(total), amountX, y, { align: "right" });

  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(110);
  // Kleinunternehmer-style note: the association does not show VAT on course fees.
  doc.text(
    "Der Betrag ist umsatzsteuerfrei (nicht steuerbare Leistung im ideellen Bereich).",
    margin,
    y,
  );
  doc.setTextColor(0);

  y += 7;
  checkPageBreak(30);
  doc.setFontSize(10);

  const dueDateText = formatLongDate(invoice.dueDate);
  if (dueDateText) {
    const paymentText = `Wir bitten Sie, den Rechnungsbetrag bis zum ${dueDateText} auf das unten angegebene Konto zu überweisen. Bitte geben Sie als Verwendungszweck die Rechnungsnummer an.`;
    const splitPayment = doc.splitTextToSize(paymentText, pageWidth - 2 * margin);
    doc.text(splitPayment, margin, y);
    y += splitPayment.length * 5 + 3;
  }

  // Sized to the bank details rather than to the QR: an ordinary invoice has
  // to fit on one page including the closing, and every millimetre this block
  // grows is one the greeting loses.
  const leftTextTotalHeight = 22;
  const bankBlockHeight = leftTextTotalHeight + 6;
  const qrSize = bankBlockHeight - 4;

  y += 5;
  checkPageBreak(bankBlockHeight + 2);
  const bankBlockY = y - 4;

  // No payment QR on a draft or a storno: both would invite a transfer that
  // must not happen.
  let qrDataUrl: string | null = null;
  if (org.iban && invoice.status === "PUBLISHED" && total > 0) {
    try {
      qrDataUrl = await QRCode.toDataURL(
        buildEpcQrPayload(org.name, org.iban, total, invoiceNumber, org.bic),
        { errorCorrectionLevel: "M", margin: 1, width: 256 },
      );
    } catch {
      // A missing QR code is cosmetic — never fail an invoice over it.
    }
  }

  doc.setFillColor(245, 245, 245);
  doc.rect(margin, bankBlockY, pageWidth - 2 * margin, bankBlockHeight, "F");

  let leftTextY = bankBlockY + (bankBlockHeight - leftTextTotalHeight) / 2 + 4;
  doc.setFont("helvetica", "bold");
  doc.text("Bankverbindung:", margin + 3, leftTextY);
  leftTextY += 6;
  doc.setFont("helvetica", "normal");
  doc.text(org.bankName, margin + 3, leftTextY);
  leftTextY += 5;
  doc.text(`IBAN: ${org.iban}`, margin + 3, leftTextY);
  doc.text(`BIC: ${org.bic}`, margin + 90, leftTextY);
  leftTextY += 5;
  doc.setFont("helvetica", "bold");
  doc.text(`Verwendungszweck: ${invoiceNumber}`, margin + 3, leftTextY);
  doc.setFont("helvetica", "normal");

  if (qrDataUrl) {
    try {
      const qrTop = bankBlockY + (bankBlockHeight - qrSize) / 2;
      const qrX = rightEdge - qrSize - 4;
      // Deliberately uncaptioned: a QR code inside a "Bankverbindung" box
      // needs no explaining, and any label either crowds the BIC beside it or
      // makes the block tall enough to push the sign-off onto a second page.
      doc.addImage(qrDataUrl, "PNG", qrX, qrTop, qrSize, qrSize);
    } catch {
      // Ignore image errors
    }
  }

  const closing = (invoice.closingText ?? DEFAULT_INVOICE_CLOSING_TEXT).trim();

  y = bankBlockY + bankBlockHeight + 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const closingLines = closing
    ? doc.splitTextToSize(closing, pageWidth - 2 * margin)
    : [];
  // Ask for exactly what the sign-off needs, so it only starts a new page when
  // it genuinely cannot fit.
  checkPageBreak(
    closingLines.length * 5 + 4 + 15 + (options.signatureBase64 ? 22 : 0),
  );

  if (closingLines.length > 0) {
    doc.text(closingLines, margin, y);
    y += closingLines.length * 5 + 4;
  }

  doc.text("Herzliche Grüße", margin, y);
  y += 10;

  if (options.signatureBase64) {
    try {
      checkPageBreak(30);
      doc.addImage(
        options.signatureBase64,
        imageFormat(options.signatureBase64),
        margin,
        y,
        40,
        20,
      );
      y += 22;
    } catch {
      // Ignore image errors
    }
  }

  if (invoice.signatureName?.trim()) {
    doc.text(invoice.signatureName.trim(), margin, y);
  } else {
    doc.setFont("helvetica", "italic");
    doc.text("Ihr Team vom Posaunenwerk Rheinland", margin, y);
    doc.setFont("helvetica", "normal");
  }

  // Footer on every page, so a detached second sheet is still attributable.
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.setFont("helvetica", "normal");
    doc.setDrawColor(200);
    doc.line(margin, pageHeight - 20, rightEdge, pageHeight - 20);
    doc.text(org.name, margin, pageHeight - 15);
    doc.text(`IBAN: ${org.iban} | BIC: ${org.bic}`, margin, pageHeight - 10);
    if (pageCount > 1) {
      doc.text(`Seite ${page} von ${pageCount}`, rightEdge, pageHeight - 10, {
        align: "right",
      });
    }
    if (invoice.status !== "PUBLISHED") {
      drawWatermark(doc, invoice.status === "DRAFT" ? "ENTWURF" : "STORNIERT");
    }
  }

  return new Uint8Array(doc.output("arraybuffer"));
}
